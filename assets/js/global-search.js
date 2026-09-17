import { CAPITAL_CALCULATED } from "./capital.js";
import { norm } from "./analytics.js";
import { escape as e, month } from "./format.js";
import { METRICS, NAV } from "./config.js";
import { RATIO_GROUPS, RATIO_HELP } from "./analysis-ratios.js";
import {
  REPORT_NAMES,
  metricLabel,
  metricGroup,
  metricHelp,
} from "./report-detail.js";
import { lockPageScroll } from "./modal-scroll.js";
const aliases = {
  roe: "rentabilidad patrimonio retorno capital return equity",
  roa: "rentabilidad activos retorno return assets",
  npl: "mora morosidad atrasados incumplimiento",
  car: "cartera alto riesgo refinanciados",
  coverage: "cobertura provisiones",
  loan_deposit: "ltd prestamos depositos fondeo",
  credit_cost_12m: "costo riesgo provisiones deterioro cost risk",
  rfne: "nsfr financiacion fondeo estable",
  rcl: "lcr liquidez cobertura",
  rcg: "solvencia capital global apr rwa",
};
const stop = new Set([
  "de",
  "del",
  "la",
  "el",
  "las",
  "los",
  "un",
  "una",
  "y",
  "o",
  "que",
  "es",
  "como",
  "donde",
  "ver",
  "quiero",
  "ratio",
  "indicador",
  "no",
  "se",
]);
export function searchEntries(entries, query, limit = 40, exact = false) {
  const tokens = norm(query)
    .replace(/[^a-z0-9-]+/g, " ")
    .split(" ")
    .filter((t) => t && !stop.has(t));
  if (!tokens.length) return entries.filter((r) => r.featured).slice(0, 12);
  if (exact && norm(query)) {
    const phrase = norm(query)
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    if (!phrase) return [];
    return entries
      .filter((r) =>
        (
          " " +
          norm([r.title, r.aliases].join(" ")).replace(/[^a-z0-9]+/g, " ") +
          " "
        ).includes(" " + phrase + " "),
      )
      .slice(0, limit);
  }
  const scored = entries
    .map((r) => {
      const title = norm(r.title),
        hay =
          r.index ||
          norm([r.title, r.path, r.description, r.aliases].join(" "));
      let score = 0,
        hits = 0;
      for (const t of tokens) {
        if (title.split(/\W+/).includes(t)) {
          score += 12;
          hits++;
        } else if (title.includes(t)) {
          score += 8;
          hits++;
        } else if (hay.includes(t)) {
          score += 3;
          hits++;
        } else if (t.length >= 4 && hay.split(/\W+/).some((w) => typo(w, t))) {
          score += 1;
          hits++;
        }
      }
      if (title === norm(query)) score += 30;
      return { r, score, hits };
    })
    .filter((x) => x.hits > 0)
    .sort(
      (a, b) =>
        b.hits - a.hits ||
        b.score - a.score ||
        a.r.title.localeCompare(b.r.title, "es"),
    );
  return scored
    .slice(0, limit)
    .map(({ r, hits }) => ({ ...r, partial: hits < tokens.length }));
}
function typo(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0,
    j = 0,
    n = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++n > 1) return false;
    if (a.length >= b.length) i++;
    if (b.length >= a.length) j++;
  }
  return n + (a.length - i) + (b.length - j) <= 1;
}
export function buildEntries(financial, reports) {
  const entries = NAV.map(([view, title]) => ({
    title,
    path: "Secciones",
    description: "Abrir sección",
    target: { view },
    featured: view === "peers",
  }));
  for (const [group, keys] of Object.entries(RATIO_GROUPS))
    for (const key of keys)
      entries.push({
        title: METRICS[key]?.label || key,
        path: `Ratios de análisis · ${group}`,
        description: RATIO_HELP[key],
        aliases: (key.includes("_") ? "" : key) + " " + (aliases[key] || ""),
        target: { view: "reports", report: "derived", reportMetric: key },
        featured: ["car", "coverage", "credit_cost_12m"].includes(key),
      });
  for (const r of financial?.catalog || [])
    entries.push({
      title: r.label,
      path: `Cuentas SBS · ${r.path.join(" › ")}`,
      description: `${r.reference}. ${r.kind === "ytd" ? "Acumulado desde enero" : "Saldo de cierre"}.`,
      target: { view: "balance", account: r.id, statement: r.statement },
    });
  for (const [code, report] of Object.entries(reports)) {
    entries.push({
      title: REPORT_NAMES[code] || code,
      path: "Indicadores",
      description: report.title || code,
      aliases:
        aliases[
          code === "B-230809" ? "rcl" : code === "B-234021" ? "rfne" : ""
        ] || "",
      target: sourceTarget(code),
    });
    for (const r of [
      ...(report.catalog || []),
      ...(code === "B-2402" ? CAPITAL_CALCULATED : []),
    ]) {
      // Structure and geography have their own product/region navigation.
      const target = sourceTarget(code, r);
      const title = metricLabel(r),
        aliasKey = /\(ROE\)/.test(title)
          ? "roe"
          : /\(ROA\)/.test(title)
            ? "roa"
            : /capital global/i.test(title)
              ? "rcg"
              : "";
      entries.push({
        title,
        path: `${code === "B-2401" ? "Indicadores" : "Indicadores · " + (REPORT_NAMES[code] || code)}${metricGroup(code, r) ? " · " + metricGroup(code, r) : ""}`,
        description: metricHelp(code, r).replace(`${title}. `, ""),
        aliases: aliases[aliasKey] || "",
        target,
        featured: ["roe", "roa"].includes(aliasKey),
      });
    }
  }
  return entries.map((r) => ({
    ...r,
    index: norm([r.title, r.path, r.description, r.aliases].join(" ")),
  }));
}
function sourceTarget(code, r) {
  if (["B-2334", "B-2344"].includes(code)) {
    const [name = "Total", status = "Total"] = (r?.label || "Total").split(
      " · ",
    );
    return {
      view: "reports",
      report: "structure",
      structureSource: code,
      structureMetric: name,
      structureStatus: code === "B-2334" ? status : "Total",
    };
  }
  if (["B-2349", "B-2350"].includes(code))
    return {
      view: "reports",
      report: "concentration",
      concentrationSource: code,
      concentrationRegion: r?.id || "",
      concentrationChart: "trend",
    };
  return { view: "reports", report: code, reportMetric: r?.id || "" };
}
export function initGlobalSearch({ getContext, navigate }) {
  const dialog = document.createElement("dialog");
  dialog.className = "search-dialog";
  dialog.setAttribute("aria-labelledby", "global-search-title");
  dialog.innerHTML = `<div class="search-head"><div><h2 id="global-search-title">Buscar en el análisis</h2><p>Indicadores, fórmulas, cuentas y fuentes</p></div><button type="button" data-search-close aria-label="Cerrar buscador">✕</button></div><div class="search-input-wrap"><label class="sr-only" for="global-search-input">Qué quieres consultar</label><input id="global-search-input" type="search" autocomplete="off" placeholder="ROE, costo de riesgo, depósitos…"><span class="search-context"></span></div><div class="search-options"><label><input type="checkbox" id="search-exact"> Coincidencia exacta</label><select id="search-category" aria-label="Tipo de resultado"><option value="">Todo</option><option>Ratios de análisis</option><option>Indicadores</option><option>Cuentas SBS</option><option>Secciones</option></select></div><p class="search-explain">Busca un concepto y abre el resultado para consultar su valor, fórmula y evolución.</p><div class="search-results" aria-label="Resultados"></div><div class="search-footer" role="status" aria-live="polite"></div>`;
  document.body.append(dialog);
  const input = dialog.querySelector("input"),
    results = dialog.querySelector(".search-results"),
    status = dialog.querySelector("[role=status]");
  let entries = [],
    metadata,
    metadataVersion,
    loading,
    release,
    previous,
    found = [],
    timer;
  async function load() {
    const version = getContext().manifest?.version || "";
    if (metadata && metadataVersion === version) return metadata;
    if (!loading)
      loading = fetch(
        `./assets/search-index.json?v=${encodeURIComponent(version)}`,
      )
        .then((r) => {
          if (!r.ok) throw Error("index");
          return r.json();
        })
        .then((d) => {
          metadataVersion = version;
          return (metadata = d.reports);
        })
        .finally(() => (loading = null));
    return loading;
  }
  function show() {
    const exact = dialog.querySelector("#search-exact").checked,
      category = dialog.querySelector("#search-category").value;
    found = searchEntries(
      entries.filter((r) => !category || r.path.startsWith(category)),
      input.value,
      40,
      exact,
    );
    dialog.querySelector(".search-explain").textContent = exact
      ? "Frase o sigla completa en el nombre o sus alias. CAR no coincide con «cartera»."
      : "Busca por nombre, sigla o concepto. Los resultados relacionados amplían la consulta.";
    const groups = new Map();
    for (const r of found) {
      const group = r.path.split(" · ")[0];
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(r);
    }
    found = [...groups.values()].flat();
    let last = "";
    results.innerHTML = found.length
      ? found
          .map((r, i) => {
            const group = r.path.split(" · ")[0];
            const h = group !== last ? `<h3>${e(group)}</h3>` : "";
            last = group;
            return (
              h +
              `<button class="search-result" type="button" data-result="${i}"><strong>${e(r.title)} <span aria-hidden="true">→</span></strong><span>${e(r.path)}</span><small>${r.partial ? "Relacionado · " : ""}${e(r.description || "")}</small></button>`
            );
          })
          .join("")
      : `<div class="empty">No hay coincidencias. Prueba con un concepto: rentabilidad, mora, liquidez, capital o depósitos.</div>`;
    status.textContent = input.value
      ? `${found.length} ${found.length === 1 ? "resultado" : "resultados"}${found.length === 40 ? " · afina la búsqueda para ver más" : ""}`
      : "Consultas frecuentes · escribe para buscar · Esc para cerrar";
  }
  async function open() {
    if (dialog.open) return;
    previous = document.activeElement;
    release = lockPageScroll();
    dialog.showModal();
    input.value = "";
    input.focus();
    const { state, manifest, financial } = getContext();
    dialog.querySelector(".search-context").textContent =
      `${manifest?.entities?.[state.entity]?.name || state.entity} · ${month(state.date)}`;
    entries = buildEntries(financial, metadata || {});
    show();
    status.textContent = "Cargando índice de fuentes…";
    try {
      const reports = await load();
      entries = buildEntries(getContext().financial, reports);
      if (dialog.open) show();
    } catch {
      if (dialog.open)
        status.textContent =
          "Índice de fuentes no disponible. Puedes buscar cuentas y ratios calculados; vuelve a abrir para reintentar.";
    }
  }
  document.getElementById("global-search-open").addEventListener("click", open);
  dialog.querySelector("[data-search-close]").onclick = () => dialog.close();
  dialog.addEventListener("close", () => {
    clearTimeout(timer);
    release?.();
    previous?.focus({ preventScroll: true });
  });
  dialog.addEventListener("click", async (ev) => {
    const b = ev.target.closest("[data-result]");
    if (!b) return;
    const target = found[Number(b.dataset.result)]?.target;
    if (!target) return;
    dialog.close();
    await navigate(target);
  });
  dialog.querySelector("#search-exact").addEventListener("change", show);
  dialog.querySelector("#search-category").addEventListener("change", show);
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(show, 90);
  });
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      results.querySelector("button")?.focus();
    }
    if (ev.key === "Enter") {
      clearTimeout(timer);
      show();
      results.querySelector("button")?.click();
    }
  });
  results.addEventListener("keydown", (ev) => {
    if (!["ArrowDown", "ArrowUp"].includes(ev.key)) return;
    ev.preventDefault();
    const buttons = [...results.querySelectorAll("button")],
      i = buttons.indexOf(document.activeElement);
    const next = buttons[i + (ev.key === "ArrowDown" ? 1 : -1)];
    (next || input).focus();
  });
  document.addEventListener("keydown", (ev) => {
    if (
      (ev.ctrlKey || ev.metaKey) &&
      ev.key.toLowerCase() === "k" &&
      !document.querySelector("dialog[open]")
    ) {
      ev.preventDefault();
      open();
    }
  });
}
