const promises = new Map();
let manifest;
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
  const path = manifest[key] || manifest.reports[key];
  if (!path) throw new Error(`Fuente no configurada: ${key}.`);
  const result = await request(`./data/${path}?v=${manifest.version}`);
  if (key !== "health" && result.version !== manifest.version)
    throw new Error(
      "La publicación está en curso. Actualiza los datos en unos instantes.",
    );
  return result;
}
export async function refresh() {
  const fresh = await request("./data/manifest.json", { fresh: true });
  if (fresh.version === manifest.version) return false;
  promises.clear();
  manifest = fresh;
  return true;
}
