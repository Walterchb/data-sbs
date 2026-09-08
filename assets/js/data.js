const promises = new Map();
let manifest;
const loadedKeys = new Set(["overview", "health", "financial"]);
export async function request(path, { fresh = false } = {}) {
  const key = path;
  if (!fresh && promises.has(key)) return promises.get(key);
  const promise = (async () => {
    const response = await fetch(path, {
      cache: fresh ? "no-store" : "default",
    });
    if (!response.ok)
      throw new Error(`No se pudo cargar ${path} (HTTP ${response.status}).`);
    const data = await response.json();
    if (data.schema_version !== 1)
      throw new Error(`Formato de datos no compatible: ${path}.`);
    return data;
  })();
  promises.set(key, promise);
  try {
    return await promise;
  } catch (e) {
    promises.delete(key);
    throw e;
  }
}
export async function initialize() {
  manifest = await request("./data/manifest.json");
  const [overview, health] = await Promise.all([
    load("overview"),
    load("health"),
  ]);
  return { manifest, overview, health };
}
export async function load(key) {
  loadedKeys.add(key);
  const path = manifest[key] || manifest.reports[key];
  if (!path) throw new Error(`Fuente no configurada: ${key}.`);
  const result = await request(`./data/${path}?v=${manifest.version}`);
  if (key !== "health" && result.version !== manifest.version)
    throw new Error(
      "La publicación está en curso. Actualiza los datos en unos instantes.",
    );
  return result;
}
// Stage the currently used datasets before switching versions. A partial
// publication or failed download preserves the previous cache and manifest.
export async function refresh() {
  const previousManifest = manifest,
    previousCache = new Map(promises);
  try {
    const fresh = await request("./data/manifest.json", { fresh: true });
    if (fresh.version === manifest.version) return false;
    await Promise.all(
      [...loadedKeys].map(async (key) => {
        const path = fresh[key] || fresh.reports[key];
        if (!path) throw new Error(`Fuente no configurada: ${key}.`);
        const data = await request(`./data/${path}?v=${fresh.version}`, {
          fresh: true,
        });
        if (key !== "health" && data.version !== fresh.version)
          throw new Error("La publicación está en curso.");
        if (key === "health" && data.errors)
          throw new Error("La nueva publicación no superó la validación.");
      }),
    );
    manifest = fresh;
    // Remove old payloads only after the complete candidate has passed.
    for (const key of promises.keys())
      if (
        key !== "./data/manifest.json" &&
        !key.endsWith(`?v=${fresh.version}`)
      )
        promises.delete(key);
    return true;
  } catch (error) {
    manifest = previousManifest;
    promises.clear();
    for (const [key, value] of previousCache) promises.set(key, value);
    throw error;
  }
}
