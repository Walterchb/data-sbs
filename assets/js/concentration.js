import { escape as e, format, month } from "./format.js";
import { finite, shift } from "./analytics.js";
import { comparisonChart, BANK_COLORS } from "./charts.js";
import { wrapTable } from "./tables.js";

export const regionalTotal = (report) =>
  report.catalog.find(
    (m) =>
      m.unit === "PEN_THOUSAND" && m.label === "Total del reporte regional",
  )?.id;
export function regionValue(report, period, bank, region, mode = "share") {
  if (!period || period.warning || period.effective?.[region] !== period.date)
    return null;
  const values = period.peers?.[bank],
    share = values?.[region];
  if (!finite(share)) return null;
  if (mode === "share") return share;
  const totalId = regionalTotal(report),
    total = values?.[totalId];
  if (
    !finite(total) ||
    total < 0 ||
    period.effective?.[totalId] !== period.date
  )
    return null;
  const amount = (total * share) / 100;
  if (mode === "amount") return amount;
  const system = period.peers?.system_foreign || period.peers?.system;
  const denominator = (system?.[totalId] * system?.[region]) / 100;
  return finite(denominator) && denominator > 0
    ? (amount / denominator) * 100
    : null;
}
export function regionalSeries(report, end, range, region, mode, banks) {
  const start = range ? shift(end, -range + 1) : report.periods[0]?.date;
  const byDate = new Map(report.periods.map((p) => [p.date, p]));
  return banks.map((bank) => ({
    ...bank,
    points: Array.from(
      (function* () {
        for (let d = start; d && d <= end; d = shift(d, 1))
          yield {
            date: d,
            value: regionValue(report, byDate.get(d), bank.slug, region, mode),
          };
      })(),
    ),
  }));
}
const nameOf = (slug, names) =>
  ({
    banbif: "BanBif",
    bbva: "BBVA",
    bcp_foreign: "BCP · incluye exterior",
    bcp: "BCP",
    interbank: "Interbank",
    scotiabank: "Scotiabank",
    system_foreign: "Sistema · incluye exterior",
    system: "Sistema",
  })[slug] ||
  names[slug] ||
  slug;
export function concentrationView(report, state) {
  const primary = state.entity || "banbif";
  const primaryName = nameOf(primary, {});
  const code = state.concentrationSource,
    isDeposits = code === "B-2350";
  const period = report.periods.filter((p) => p.date <= state.date).at(-1);
  const baseControls = `<label>Producto <select id="concentration-source"><option value="B-2350" ${isDeposits ? "selected" : ""}>Depósitos · B-2350</option><option value="B-2349" ${!isDeposits ? "selected" : ""}>Créditos · B-2349</option></select></label>`;
  if (!period)
    return {
      html: `<div class="controls">${baseControls}</div><div class="empty">No hay datos regionales para el corte seleccionado.</div>`,
      rows: [],
    };
  if (!period.peers?.[primary] || !Object.keys(period.peers[primary]).length)
    return {
      html: `<div class="controls">${baseControls}</div><div class="empty">Sin datos regionales de ${e(state.entityName || primaryName)} para este corte y ámbito.</div>`,
      rows: [],
    };
  const regions = report.catalog.filter(
    (r) => r.unit === "PERCENT" && r.id in period.peers[primary],
  );
  if (!regions.length)
    return {
      html: `<div class="controls">${baseControls}</div><div class="empty">Sin distribución regional para la entidad seleccionada.</div>`,
      rows: [],
    };
  if (!regions.some((r) => r.id === state.concentrationRegion))
    state.concentrationRegion =
      regions.find((r) => r.label === "Lima")?.id || regions[0]?.id;
  const region = regions.find((r) => r.id === state.concentrationRegion);
  const names = { ...period.entity_names };
  const available = [
    ...new Set(
      report.periods
        .filter((p) => p.date <= period.date)
        .flatMap((p) => Object.keys(p.peers || {})),
    ),
  ];
  for (const p of report.periods.filter((p) => p.date <= period.date))
    Object.assign(names, p.entity_names);
  const selected = [...new Set([primary, ...state.concentrationBanks])].filter(
    (slug) =>
      available.includes(slug) &&
      (state.concentrationMode !== "market" ||
        !slug.startsWith("system") ||
        slug === primary),
  );
  const banks = selected.map((slug) => ({
    slug,
    name: nameOf(slug, names),
    color:
      BANK_COLORS[slug] ||
      `hsl(${(available.indexOf(slug) * 137.508) % 360}, 55%, 42%)`,
  }));
  const mode = state.concentrationMode,
    unit = mode === "amount" ? "PEN_THOUSAND" : "PERCENT";
  const modeLabel = {
    share: "Peso dentro de cada banco",
    amount: "Importe regional calculado",
    market: "Cuota del mercado regional",
  }[mode];
  const regionName = region?.label || "Región";
  const regionOptions = regions
    .map(
      (r) =>
        `<option value="${r.id}" ${r.id === region.id ? "selected" : ""}>${e(r.label)}</option>`,
    )
    .join("");
  const controls = `<div class="controls concentration-controls">${baseControls}<label>Región <select id="concentration-region">${regionOptions}</select></label><label>Medida <select id="concentration-mode">${[
    ["share", "% dentro del banco"],
    ["amount", "Importe · S/ MM"],
    ["market", "% del mercado regional"],
  ]
    .map(
      ([v, label]) =>
        `<option value="${v}" ${mode === v ? "selected" : ""}>${label}</option>`,
    )
    .join(
      "",
    )}</select></label><label>Gráfico <select id="concentration-chart"><option value="trend" ${state.concentrationChart === "trend" ? "selected" : ""}>Evolución de la región</option><option value="regions" ${state.concentrationChart === "regions" ? "selected" : ""}>Comparar regiones</option></select></label></div>`;
  const bankControls = `<details class="concentration-banks" ${state.concentrationBanksOpen ? "open" : ""}><summary>Bancos a comparar · ${banks.map((b) => e(b.name)).join(" / ")}</summary><div class="checkboxes">${available.map((slug) => `<label><input type="checkbox" data-concentration-bank="${slug}" ${selected.includes(slug) ? "checked" : ""} ${slug === primary || (mode === "market" && slug.startsWith("system")) ? "disabled" : ""}>${e(nameOf(slug, names))}</label>`).join("")}</div><small>Hasta seis series; ${e(state.entityName || primaryName)} permanece como referencia.</small></details>`;
  const ranked = [...regions].sort(
    (a, b) =>
      (regionValue(report, period, primary, b.id, "share") ?? -1) -
      (regionValue(report, period, primary, a.id, "share") ?? -1),
  );
  const chartRegions = ranked.slice(0, 10);
  const series =
    state.concentrationChart === "trend"
      ? regionalSeries(report, period.date, state.range, region.id, mode, banks)
      : banks.map((b) => ({
          ...b,
          points: chartRegions.map((r) => ({
            date: r.label,
            value: regionValue(report, period, b.slug, r.id, mode),
          })),
        }));
  const ranges =
    state.concentrationChart === "trend"
      ? `<div class="range" role="group" aria-label="Rango histórico">${[
          [12, "12M"],
          [24, "24M"],
          [60, "5A"],
          [0, "Máx"],
        ]
          .map(
            ([v, t]) =>
              `<button data-range="${v}" aria-pressed="${state.range === v}">${t}</button>`,
          )
          .join("")}</div>`
      : "";
  const title =
    state.concentrationChart === "trend"
      ? `${regionName} · ${modeLabel}`
      : `10 regiones con mayor peso en ${state.entityName || primaryName} · ${modeLabel}`;
  const december = report.periods.find(
    (p) => p.date === `${Number(period.date.slice(0, 4)) - 1}-12`,
  );
  const share = regionValue(report, period, primary, region.id, "share"),
    prior = regionValue(report, december, primary, region.id, "share");
  const sys = period.peers.system_foreign ? "system_foreign" : "system";
  const systemShare = regionValue(report, period, sys, region.id, "share");
  const stat = (label, value) =>
    `<div class="stat-card"><span class="stat-label">${label}</span><b>${value}</b></div>`;
  const cards = `<div class="stats concentration-stats">${stat(`${e(state.entityName || primaryName)} · ${e(regionName)}`, format(share, "PERCENT"))}${stat("Importe regional calculado", format(regionValue(report, period, primary, region.id, "amount"), "PEN_THOUSAND"))}${stat("Cambio de concentración YTD", format(finite(share) && finite(prior) ? (share - prior) * 100 : null, "BP", true))}${stat("Diferencia frente al sistema", format(finite(share) && finite(systemShare) ? (share - systemShare) * 100 : null, "BP", true))}</div>`;
  const table = wrapTable(
    `<table class="concentration-table"><thead><tr><th>Región / departamento</th>${banks.map((b) => `<th class="number"><span style="color:${b.color}">■</span> ${e(b.name)}</th>`).join("")}</tr></thead><tbody>${ranked.map((r) => `<tr class="${r.id === region.id ? "peer-highlight" : ""}"><td><button class="text-button" data-concentration-region="${r.id}">${e(r.label)}</button></td>${banks.map((b) => `<td class="number">${format(regionValue(report, period, b.slug, r.id, mode), unit)}</td>`).join("")}</tr>`).join("")}</tbody></table>`,
    "Datos regionales comparados",
    true,
  );
  const rows = [
    [
      "periodo",
      "producto",
      "region",
      "banco",
      "medida",
      "valor",
      "unidad",
      "fuente",
    ],
    ...ranked.flatMap((r) =>
      banks.map((b) => [
        period.date,
        isDeposits ? "Depósitos" : "Créditos",
        r.label,
        b.name,
        modeLabel,
        regionValue(report, period, b.slug, r.id, mode),
        unit,
        period.source_url,
      ]),
    ),
  ];
  return {
    rows,
    html: `${period.date !== state.date ? `<div class="notice">Información regional hasta ${month(period.date, true)}. Corte seleccionado: ${month(state.date, true)}.</div>` : ""}<section class="panel"><div class="panel-head">${controls}</div><div class="panel-body">${bankControls}${cards}<div class="concentration-chart-head"><h2>${e(title)}</h2>${ranges}</div>${comparisonChart(series, unit, title, state.concentrationChart === "trend" ? "line" : "bar")}<p class="source-note">${code} · ${month(period.date, true)} · Distribución por oficina (Anexo 10 SBS). El porcentaje dentro del banco usa el total de cada banco; la cuota regional usa el total del sistema en esa región. Los importes regionales se calculan con el porcentaje y el total del mismo reporte. Lima, Callao y las sucursales en el exterior se conservan por separado.</p></div></section><section class="panel"><div class="panel-head"><h2>Todas las regiones · ${e(modeLabel)}</h2><small>Selecciona una región para ver su evolución. Exporta esta tabla con el botón de descarga superior.</small></div>${table}</section>`,
  };
}
