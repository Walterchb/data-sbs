import * as Data from "./data.js";
import { METRICS, NAV, MAIN, RATIOS, BANK_NAMES } from "./config.js";
import { escape as e, format, month, num, csvCell, units } from "./format.js";
import {
  finite,
  shift,
  months,
  compare,
  growth,
  difference,
  ratio,
  metricAt,
  monthlyFlow,
  movementRows,
  stats,
  norm,
} from "./analytics.js";
import { lineChart, bars, clearCharts, mountCharts } from "./charts.js";
import { accountTable, wrapTable } from "./tables.js";

const $ = (id) => document.getElementById(id);
let overview,
  health,
  manifest,
  financial,
  reportData,
  renderId = 0,
  exportRows = [],
  toastTimer;
const state = {
  view: "overview",
  date: "",
  range: 24,
  metric: "credits",
  statement: "balance",
  account: "balance:59",
  query: "",
  tableView: "snapshot",
  sort: "hierarchy",
  mainOnly: false,
  collapsed: new Set(),
  treeInitialized: false,
  showReferences: false,
  moveMode: "mom",
  moveSort: "absolute",
  report: "B-2401",
  reportMetric: "",
  reportQuery: "",
  peerMetric: "credits",
  peerBanks: ["bcp", "bbva", "scotiabank", "interbank"],
  peerSource: "financial",
};
const unitOf = (key) => METRICS[key]?.unit || "PEN_THOUSAND";
const current = () => overview.periods.find((p) => p.date === state.date);
const rangeButtons = (points, unit, label) =>
  `<div class="range" role="group" aria-label="Rango histórico">${[
    [12, "12M"],
    [24, "24M"],
    [60, "5A"],
    [0, "Máx."],
  ]
    .map(
      ([n, t]) =>
        `<button data-range="${n}" aria-pressed="${state.range === n}">${t}</button>`,
    )
    .join("")}${historyDisclosure(points, unit, label)}</div>`;
// Share the TC Contable preference when both pages use the same origin.
const THEME_KEY = "sbs_tc_theme_treasuryhub";
const NAV_ICONS = {
  overview: "chart-pie",
  movements: "arrow-trend-up",
  balance: "table-list",
  reports: "shield-halved",
  peers: "building-columns",
  health: "database",
};
const KPI_ICONS = {
  assets: "building-columns",
  credits: "hand-holding-dollar",
  deposits: "wallet",
  equity: "layer-group",
  npl: "gauge-high",
  net_income: "chart-line",
};
const icon = (name) => `<i class="fa-solid fa-${name}" aria-hidden="true"></i>`;
function applyTheme(value) {
  const dark = value === "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  const label = dark ? "Tema claro" : "Tema oscuro";
  $("theme").innerHTML = icon(dark ? "sun" : "moon");
  $("theme").setAttribute("aria-label", label);
  $("theme").title = label;
  mountCharts();
}
try {
  applyTheme(
    localStorage.getItem(THEME_KEY) ||
      localStorage.getItem("sbs-theme") ||
      "light",
  );
} catch {
  applyTheme("light");
}
window.addEventListener("storage", (event) => {
  if (event.key === THEME_KEY) applyTheme(event.newValue);
});
const heading = (title, description, controls = "") =>
  `<div class="page-head"><div><h1>${title}</h1><p>${description}</p></div>${controls}</div>`;
const notice = (text) => `<div class="notice">${e(text)}</div>`;
const panel = (title, sub, body, controls = "") =>
  `<section class="panel"><div class="panel-head"><div class="panel-title"><span class="title-icon">${icon(NAV_ICONS[state.view] || "chart-line")}</span><div><h2>${e(title)}</h2>${sub ? `<p>${e(sub)}</p>` : ""}</div></div>${controls}</div><div class="panel-body">${body}</div></section>`;
function sourceLink(url, text = "Ver archivo SBS ↗") {
  if (!/^https:\/\//.test(url || "")) return e(text);
  return `<a href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(text)}</a>`;
}
function deltaCell(a, b, unit, key) {
  const d = compare(a, b, unit);
  const dir = METRICS[key]?.direction;
  const cls =
    finite(d.value) && dir
      ? d.value * dir > 0
        ? "good"
        : d.value * dir < 0
          ? "bad"
          : ""
      : "";
  return `<span class="delta ${cls}">${format(d.value, d.unit, true)}</span>`;
}
function rangePoints(points, end = state.date) {
  const start = state.range ? shift(end, -state.range + 1) : points[0]?.date;
  const eligible = points.filter(
    (p) => p.date <= end && (!start || p.date >= start),
  );
  return eligible;
}
function statStrip(points, unit, allowCagr = true, isYtd = false) {
  const s = stats(points, unit);
  if (!s) return "";
  const card = (label, value, note, name) =>
    `<div class="stat-card"><span class="stat-label">${icon(name)}${label}</span><b>${value}</b><small>${note}</small></div>`;
  const last = points.at(-1),
    first = isYtd
      ? points.find((p) => p.date === shift(last.date, -12))
      : points[0];
  const conflict = points.some((p) => p.effective && p.effective !== p.date);
  const delta = !conflict ? difference(last?.value, first?.value) : null;
  const deltaUnit = unit === "PERCENT" ? "BP" : unit;
  const dateIndex = (d) => Number(d.slice(0, 4)) * 12 + Number(d.slice(5, 7));
  const step = isYtd
    ? 12
    : points.length > 1
      ? dateIndex(points[1].date) - dateIndex(points[0].date)
      : 1;
  let up = 0,
    comparable = 0;
  if (!conflict)
    for (const point of points) {
      const prior = points.find((p) => p.date === shift(point.date, -step));
      if (finite(point.value) && finite(prior?.value)) {
        comparable++;
        if (point.value > prior.value) up++;
      }
    }
  return `<div class="stats" aria-label="Estadísticas del rango">${card(isYtd ? "Cambio interanual" : "Cambio del rango", format(unit === "PERCENT" && finite(delta) ? delta * 100 : delta, deltaUnit, true), conflict ? "Revisar periodo declarado" : first ? `vs. ${month(first.date)}` : "Falta base comparable", "arrows-left-right")}${card("Periodos al alza", comparable ? `${up} / ${comparable}` : "—", isYtd ? "Comparaciones interanuales" : "Comparaciones consecutivas válidas", "arrow-trend-up")}${allowCagr && !conflict && s.cagr !== null ? card("CAGR", format(s.cagr, "PERCENT", true), "Tasa anual compuesta", "chart-line") : ""}${card("Observaciones", s.count, `${points.length - s.count} periodos sin dato`, "calendar-days")}</div>`;
}
const seriesDetails = new Map();
let seriesDetailId = 0,
  activeSeriesId = null;
function historyDisclosure(points, unit, label = "Serie seleccionada") {
  const id = String(++seriesDetailId);
  seriesDetails.set(id, { points, unit, label });
  return `<button type="button" class="series-button" data-series="${id}" aria-haspopup="dialog">${icon("table-list")} Ver valores de la serie</button>`;
}
function seriesContent(id) {
  const { points, unit, label } = seriesDetails.get(id);
  return `<h2 id="detail-title">VALORES DE LA SERIE</h2><p class="series-subtitle">${e(label)} · ${e(units[unit] || unit)} · ${points.length ? `${month(points[0].date)} – ${month(points.at(-1).date)}` : "Sin observaciones"}</p>${wrapTable(`<table><thead><tr><th>Periodo</th><th class="number">Valor · ${e(units[unit] || unit)}</th></tr></thead><tbody>${points.map((p) => `<tr><td>${month(p.date)}${p.effective && p.effective !== p.date ? `<small>Declarado: ${month(p.effective)}</small>` : ""}</td><td class="number">${format(p.value, unit)}</td></tr>`).join("")}</tbody></table>`, "Valores de la serie", true)}`;
}
async function copySeries() {
  const data = seriesDetails.get(activeSeriesId);
  if (!data) return;
  const locale = window.navigator.language || "es-PE";
  const number = new Intl.NumberFormat(locale, {
    useGrouping: false,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const clean = (v) =>
    String(v ?? "")
      .replace(/[\t\r\n]+/g, " ")
      .replace(/^[=+@-]/, "'$&");
  const rows = [
    [
      "Periodo",
      "Indicador",
      `Valor (${units[data.unit] || data.unit})`,
      "Periodo declarado",
    ],
    ...data.points.map((p) => [
      p.date,
      data.label,
      finite(p.value)
        ? number.format(
            data.unit.endsWith("THOUSAND") ? p.value / 1000 : p.value,
          )
        : "",
      p.effective || p.date,
    ]),
  ];
  const text = rows
    .map((row) => row.map((v, i) => (i === 2 ? v : clean(v))).join("\t"))
    .join("\r\n");
  try {
    if (window.navigator.clipboard?.writeText)
      await window.navigator.clipboard.writeText(text);
    else {
      const field = document.createElement("textarea");
      field.value = text;
      field.className = "clipboard-buffer";
      $("detail-dialog").append(field);
      field.select();
      const ok = document.execCommand("copy");
      field.remove();
      $("series-copy").focus();
      if (!ok) throw new Error("No clipboard");
    }
    $("series-copy-status").textContent = "Copiado. Pega en Excel con Ctrl+V.";
  } catch {
    $("series-copy-status").textContent =
      "No se pudo copiar. Selecciona los datos de la tabla para copiarlos.";
  }
}
function metricSeries(key) {
  return rangePoints(
    overview.periods.map((p) => ({
      date: p.date,
      value: p.metrics[key]?.date === p.date ? p.metrics[key].value : null,
    })),
  );
}
function setError(err) {
  $("health-status").dataset.status = "ERROR";
  $("health-label").textContent = "Revisar carga";
  $("error").hidden = false;
  $("error").textContent =
    `${err.message || err} Puedes volver a intentar con Actualizar.`;
  console.error(err);
}
function toast(message) {
  window.clearTimeout(toastTimer);
  $("toast").textContent = message;
  $("toast").hidden = false;
  toastTimer = window.setTimeout(() => {
    const target = $("toast");
    if (target) target.hidden = true;
  }, 3500);
}
function urlState() {
  const p = new URLSearchParams({ view: state.view, date: state.date });
  if (state.view === "balance") p.set("account", state.account);
  if (state.view === "reports") {
    p.set("report", state.report);
    if (state.reportMetric) p.set("metric", state.reportMetric);
  }
  history.replaceState(null, "", "#" + p);
}
function recoverUrl() {
  const p = new URLSearchParams(location.hash.slice(1));
  if (NAV.some((v) => v[0] === p.get("view"))) state.view = p.get("view");
  if (overview.periods.some((v) => v.date === p.get("date")))
    state.date = p.get("date");
  if (/^balance:\d+$|^income:\d+$/.test(p.get("account") || "")) {
    state.account = p.get("account");
    state.statement = state.account.split(":")[0];
  }
  if (p.get("report") === "derived" || manifest.reports[p.get("report")])
    state.report = p.get("report");
  state.reportMetric = p.get("metric") || "";
}

function kpi(key) {
  const config = METRICS[key],
    m = current()?.metrics[key],
    value = m?.value,
    unit = unitOf(key),
    date = m?.date || state.date;
  const period = config.kind === "ytd" ? "YoY" : "MoM";
  const prior = metricAt(
    overview,
    key,
    shift(date, config.kind === "ytd" ? -12 : -1),
  );
  const labels = {
    deposits: "Depósitos",
    net_income: "Utilidad YTD",
    credits: "Créditos brutos",
  };
  return `<button type="button" class="kpi" data-metric="${key}" data-popup="${key}" aria-haspopup="dialog" aria-label="${e(config.label)}: ${format(value, unit)}. Ver detalle"><span class="kpi-top"><span class="label">${icon(KPI_ICONS[key])}${e(labels[key] || config.label)}</span>${icon("circle-info")}</span><strong class="value">${unit === "PEN_THOUSAND" ? num(finite(value) ? value / 1000 : null) : format(value, unit)}</strong><span class="kpi-bottom"><small>${unit === "PEN_THOUSAND" ? "S/ MM" : "Cartera atrasada"}</small><span class="kpi-change">${deltaCell(value, prior, unit, key)}<small>${period}${unit === "PERCENT" ? " · pb" : ""}</small></span></span></button>`;
}
function detailContent(key, modal = false) {
  const titleId = modal ? ' id="detail-title"' : "";
  if (key === "info")
    return `<h2${titleId}>Información del corte</h2><div class="detail-lead"><strong>${state.date === manifest.latest_period ? "Último balance disponible" : "Corte histórico"} · ${month(state.date, true)}</strong></div><p>Importes en S/ MM · ratios en % · variaciones de ratios en pb.</p><p>Último balance disponible: ${month(manifest.latest_period, true)}.</p><p>${health.errors} errores · ${health.warnings} advertencias. Las fechas pueden variar por fuente.</p><p id="last-checked">${lastChecked ? `Última comprobación: ${lastChecked}.` : ""}</p><button class="detail-link" data-nav="health">Ver fechas por fuente ${icon("arrow-right")}</button>`;
  const config = METRICS[key],
    m = current()?.metrics[key],
    date = m?.date || state.date,
    value = m?.value,
    unit = unitOf(key);
  const bases =
    config.kind === "ytd"
      ? [["YoY · mismo acumulado", shift(date, -12)]]
      : [
          ["MoM", shift(date, -1)],
          ["YTD", `${Number(date.slice(0, 4)) - 1}-12`],
          ["YoY", shift(date, -12)],
        ];
  const rows = bases
    .map(([name, base]) => {
      const previous = metricAt(overview, key, base);
      return `<div class="detail-comparison"><div><b>${name}</b><small>vs. ${month(base)}</small></div><div>${deltaCell(value, previous, unit, key)}<small>${unit === "PERCENT" ? "Puntos básicos" : finite(value) && finite(previous) ? format(value - previous, unit, true) : "Sin base comparable"}</small></div><div><small>Base</small><b>${format(previous, unit)}</b></div></div>`;
    })
    .join("");
  return `<h2${titleId}>${e(config.label.toLocaleUpperCase("es"))}</h2><div class="detail-lead"><strong>${format(value, unit)}</strong><span>${month(date, true)}</span></div>${rows}<p>${config.kind === "ytd" ? "Acumulado desde enero. La comparación corresponde al mismo mes del año anterior." : key === "npl" ? "Cartera vencida y en cobranza judicial / créditos brutos. Variaciones en puntos básicos." : "Las comparaciones usan periodos exactos; una base ausente se muestra con guion."}</p><p>Fuente: ${e(m?.source || "Sin dato")}${m?.warning ? ` · ${e(m.warning)}` : ""}</p>${config.row ? `<button class="detail-link" data-drill="${config.row}">Explorar rubro ${icon("arrow-right")}</button>` : `<button class="detail-link" data-key="${key}">Explorar indicador ${icon("arrow-right")}</button>`}`;
}
let hoverTimer, popupTrigger;
let refreshInFlight = false,
  lastRefreshAt = Date.now(),
  lastChecked = "";
function hideHover() {
  clearTimeout(hoverTimer);
  if ($("hover-detail")) $("hover-detail").hidden = true;
}
function closeDetails() {
  hideHover();
  if ($("detail-dialog").open) $("detail-dialog").close();
}
function bindDetails() {
  const popover = $("hover-detail"),
    dialog = $("detail-dialog");
  document.addEventListener("pointerover", (event) => {
    const target = event.target.closest("[data-popup]");
    if (
      !target ||
      target.dataset.popup === "info" ||
      target.contains(event.relatedTarget) ||
      !manifest ||
      event.pointerType === "touch" ||
      !window.matchMedia?.("(hover: hover) and (min-width: 761px)").matches ||
      dialog.open
    )
      return;
    clearTimeout(hoverTimer);
    popupTrigger = target;
    popover.innerHTML = detailContent(target.dataset.popup);
    popover.hidden = false;
    const rect = target.getBoundingClientRect(),
      box = popover.getBoundingClientRect();
    popover.style.left =
      Math.max(12, Math.min(rect.left, window.innerWidth - box.width - 12)) +
      "px";
    popover.style.top =
      Math.max(
        12,
        Math.min(rect.bottom + 8, window.innerHeight - box.height - 12),
      ) + "px";
  });
  document.addEventListener("pointerout", (event) => {
    if (
      event.target.closest("[data-popup]") &&
      !event.target.closest("[data-popup]").contains(event.relatedTarget)
    )
      hoverTimer = setTimeout(hideHover, 180);
  });
  popover.addEventListener("pointerenter", () => clearTimeout(hoverTimer));
  popover.addEventListener("pointerleave", () => {
    hoverTimer = setTimeout(hideHover, 180);
  });
  document.addEventListener("click", (event) => {
    const seriesTarget = event.target.closest("[data-series]");
    if (seriesTarget && seriesDetails.has(seriesTarget.dataset.series)) {
      hideHover();
      popupTrigger = seriesTarget;
      dialog.classList.add("series-dialog");
      activeSeriesId = seriesTarget.dataset.series;
      $("series-copy").hidden = false;
      $("series-copy-status").textContent = "";
      $("detail-body").innerHTML = seriesContent(seriesTarget.dataset.series);
      dialog.showModal();
      return;
    }
    const target = event.target.closest("[data-popup]");
    if (!target || !manifest) return;
    dialog.classList.remove("series-dialog");
    $("series-copy").hidden = true;
    $("series-copy-status").textContent = "";
    hideHover();
    popupTrigger = target;
    $("detail-body").innerHTML = detailContent(target.dataset.popup, true);
    dialog.showModal();
  });
  $("detail-close").addEventListener("click", closeDetails);
  $("series-copy").addEventListener("click", copySeries);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom
      )
        closeDetails();
    }
  });
  dialog.addEventListener("close", () => {
    if (popupTrigger?.isConnected) popupTrigger.focus();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideHover();
  });
  window.addEventListener("scroll", hideHover, { passive: true });
  window.addEventListener("resize", hideHover);
}
function updateStatus() {
  $("health-status").dataset.status = health.errors
    ? "ERROR"
    : health.warnings
      ? "WARNING"
      : "OK";
  $("health-label").textContent = health.errors
    ? `${health.errors} errores`
    : lastChecked
      ? `Comprobado ${lastChecked}`
      : health.warnings
        ? "Fuentes con avisos"
        : "Fuentes verificadas";
  $("health-status").title =
    `${health.errors} errores · ${health.warnings} advertencias. Ver fechas por fuente.`;
}
async function runRefresh(manual = false) {
  if (refreshInFlight) {
    if (manual) toast("Ya hay una actualización en curso.");
    return;
  }
  refreshInFlight = true;
  const button = $("refresh");
  button.disabled = true;
  button.classList.add("is-loading");
  button.setAttribute("aria-busy", "true");
  if (manual) toast("Actualizando datos…");
  try {
    const followLatest = state.date === manifest.latest_period;
    const changed = await Data.refresh();
    if (changed) {
      const fresh = await Data.initialize();
      ({ overview, health, manifest } = fresh);
      if (followLatest || !overview.periods.some((p) => p.date === state.date))
        state.date = manifest.latest_period;
      setPeriodBounds();
      await render();
      $("latest").textContent =
        `Último balance: ${month(manifest.latest_period)}.`;
    }
    lastChecked = new Intl.DateTimeFormat("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date());
    updateStatus();
    if (manual || changed)
      toast(
        changed
          ? `Nueva publicación cargada · ${lastChecked}`
          : `Datos comprobados · sin novedades · ${lastChecked}`,
      );
  } catch (err) {
    $("health-status").dataset.status = "ERROR";
    $("health-label").textContent = "No se pudo actualizar";
    if (manual)
      toast("No se pudo actualizar. Se conservan los datos visibles.");
  } finally {
    lastRefreshAt = Date.now();
    refreshInFlight = false;
    button.disabled = false;
    button.classList.remove("is-loading");
    button.removeAttribute("aria-busy");
  }
}
function calendarDate(period) {
  const [year, month] = period.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}
function setPeriodBounds() {
  $("period").min = calendarDate(overview.periods[0].date);
  $("period").max = calendarDate(manifest.latest_period);
  $("period").disabled = false;
  $("period").value = calendarDate(state.date);
}
function startAutoRefresh() {
  const interval = 5 * 60 * 1000;
  const check = () => {
    if (
      document.visibilityState === "visible" &&
      Date.now() - lastRefreshAt >= interval
    )
      runRefresh();
  };
  let timer = window.setInterval(check, interval);
  document.addEventListener("visibilitychange", check);
  window.addEventListener("focus", check);
  window.addEventListener("pagehide", () => window.clearInterval(timer));
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      check();
      timer = window.setInterval(check, interval);
    }
  });
}
function ratioTable() {
  return wrapTable(
    `<table><thead><tr><th>Indicador</th><th class="number">Último valor</th><th class="number">MoM · pb</th><th class="number">YoY · pb</th><th>Información hasta</th></tr></thead><tbody>${RATIOS.map(
      (key) => {
        const m = current()?.metrics[key],
          d = m?.date;
        return `<tr><td><button class="text-button" data-key="${key}">${e(METRICS[key].label)}</button></td><td class="number">${m?.warning ? "Revisar periodo" : format(m?.value, unitOf(key))}</td><td class="number">${!m?.warning ? deltaCell(m?.value, d ? metricAt(overview, key, shift(d, -1)) : null, unitOf(key), key) : "—"}</td><td class="number">${!m?.warning ? deltaCell(m?.value, d ? metricAt(overview, key, shift(d, -12)) : null, unitOf(key), key) : "—"}</td><td>${month(d)}${m?.warning ? '<small class="warning">Encabezado SBS inconsistente</small>' : d !== state.date ? '<small class="warning">Fecha distinta del corte</small>' : ""}</td></tr>`;
      },
    ).join("")}</tbody></table>`,
    "Indicadores principales",
  );
}
function movementsPreview() {
  const result = movementRows(
    financial,
    state.date,
    "mom",
    overview.config.materiality,
  );
  const rows = result.rows
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 5);
  return !result.available
    ? '<div class="empty">Falta el mes anterior para calcular movimientos.</div>'
    : rows.length
      ? `<ul class="movements-list">${rows.map((r) => `<li><div class="movement-top"><button class="text-button" data-drill="${r.id}">${e(r.label)}</button><b>${format(r.delta, "PEN_THOUSAND", true)}</b></div><div class="movement-meta">${format(r.pct, "PERCENT", true)} MoM · ${e(r.group)}</div></li>`).join("")}</ul><p class="source-note">Rubros principales sin sumar padres e hijos. <button class="text-button" data-nav="movements">Ver todos los movimientos →</button></p>`
      : '<div class="empty">No hay movimientos que superen la materialidad configurada.</div>';
}
function composition(parent, label) {
  const p = financial.periods.find((p) => p.date === state.date);
  const rows = financial.catalog
    .filter((r) => r.parent === parent)
    .map((r) => ({ id: r.id, label: r.label, value: p?.values[r.id]?.[2] }))
    .filter((r) => finite(r.value) && r.value !== 0)
    .sort((a, b) => b.value - a.value);
  return panel(
    label,
    `${month(state.date)} · componentes directos del rubro`,
    bars(rows.slice(0, 6), "PEN_THOUSAND") +
      `<p class="source-note"><button class="text-button" data-drill="${parent}">Ver composición completa →</button></p>`,
  );
}
function overviewView() {
  const series = metricSeries(state.metric),
    config = METRICS[state.metric];
  exportRows = [
    ["indicador", "valor", "unidad", "periodo", "fuente"],
    ...Object.entries(current().metrics).map(([k, v]) => [
      METRICS[k]?.label || k,
      v.value,
      unitOf(k),
      v.date,
      v.source,
    ]),
  ];
  return (
    heading(
      "Panorama financiero",
      "Balance, resultados y movimientos relevantes de BanBif.",
    ) +
    `<section class="kpi-grid" aria-label="Resumen financiero">${MAIN.map(kpi).join("")}</section>` +
    `<div class="grid-two">${panel(
      "Evolución financiera",
      config.kind === "ytd"
        ? "Resultados acumulados del año; no comparar diciembre con enero."
        : "Selecciona una magnitud para ver su evolución.",
      `${lineChart(series, unitOf(state.metric), config.label)}${statStrip(series, unitOf(state.metric), config.kind !== "ytd", config.kind === "ytd")}`,
      `<div class="controls"><label class="sr-only" for="trend-metric">Métrica de tendencia</label><select id="trend-metric">${Object.entries(
        METRICS,
      )
        .filter(([, v]) => v.row)
        .map(
          ([k, v]) =>
            `<option value="${k}" ${k === state.metric ? "selected" : ""}>${e(v.label)}</option>`,
        )
        .join(
          "",
        )}</select>${rangeButtons(series, unitOf(state.metric), config.label)}</div>`,
    )}${panel("¿Qué cambió este mes?", `Contra ${month(shift(state.date, -1))} · movimientos materiales`, movementsPreview())}</div>` +
    panel(
      "Rentabilidad, calidad y liquidez",
      "Las variaciones de ratios se muestran en puntos básicos. Haz clic para profundizar.",
      ratioTable(),
    ) +
    `<div class="grid-two equal">${composition("balance:26", "¿Dónde están las colocaciones vigentes?")}${composition("balance:76", "¿Cómo se compone el fondeo del público?")}</div>`
  );
}
function movementsView() {
  const result = movementRows(
    financial,
    state.date,
    state.moveMode,
    overview.config.materiality,
  );
  let rows = result.rows;
  if (state.moveSort === "increase")
    rows = rows.filter((r) => r.delta > 0).sort((a, b) => b.delta - a.delta);
  else if (state.moveSort === "decrease")
    rows = rows.filter((r) => r.delta < 0).sort((a, b) => a.delta - b.delta);
  else if (state.moveSort === "percent")
    rows.sort((a, b) => Math.abs(b.pct ?? 0) - Math.abs(a.pct ?? 0));
  else if (state.moveSort === "share")
    rows.sort(
      (a, b) => Math.abs(b.shareChange ?? 0) - Math.abs(a.shareChange ?? 0),
    );
  else rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  exportRows = [
    [
      "periodo",
      "comparativo",
      "rubro",
      "saldo_miles_PEN",
      "anterior_miles_PEN",
      "delta_miles_PEN",
      "variacion_pct",
      "cambio_participacion_pp",
    ],
    ...rows.map((r) => [
      state.date,
      result.reference,
      r.path.join(" > "),
      r.a,
      r.b,
      r.delta,
      r.pct,
      r.shareChange,
    ]),
  ];
  const controls = `<div class="controls"><label>Comparación <select id="move-mode">${[
    ["mom", "Mes anterior"],
    ["yoy", "Año anterior"],
    ["ytd", "Diciembre anterior"],
  ]
    .map(
      ([v, t]) =>
        `<option value="${v}" ${state.moveMode === v ? "selected" : ""}>${t}</option>`,
    )
    .join("")}</select></label><label>Orden <select id="move-sort">${[
    ["absolute", "Mayor cambio absoluto"],
    ["increase", "Mayores aumentos"],
    ["decrease", "Mayores caídas"],
    ["percent", "Mayor variación %"],
    ["share", "Cambio de participación"],
  ]
    .map(
      ([v, t]) =>
        `<option value="${v}" ${state.moveSort === v ? "selected" : ""}>${t}</option>`,
    )
    .join("")}</select></label></div>`;
  const table = wrapTable(
    `<table><thead><tr><th>Rubro principal</th><th class="number">Saldo actual</th><th class="number">Cambio absoluto</th><th class="number">Cambio %</th><th class="number">% del padre</th><th class="number">Δ participación · pp</th></tr></thead><tbody>${rows.map((r) => `<tr><td><button class="text-button" data-drill="${r.id}">${e(r.label)}</button><small>${e(r.group)}</small></td><td class="number">${format(r.a)}</td><td class="number"><b>${format(r.delta, "PEN_THOUSAND", true)}</b></td><td class="number">${format(r.pct, "PERCENT", true)}</td><td class="number">${format(r.share, "PERCENT")}</td><td class="number">${num(r.shareChange)}</td></tr>`).join("")}</tbody></table>`,
    "Movimientos materiales",
  );
  return (
    heading(
      "¿Qué cambió?",
      `${month(state.date)} frente a ${month(result.reference)} · selecciona un rubro para identificar sus componentes.`,
      controls,
    ) +
    panel(
      `${rows.length} movimientos materiales`,
      "Variaciones objetivas; un aumento de saldo no implica por sí mismo una mejora.",
      result.available
        ? rows.length
          ? table
          : '<div class="empty">Sin movimientos materiales con este filtro.</div>'
        : '<div class="empty">No existe el periodo comparativo exacto.</div>',
    ) +
    `<details class="panel help"><summary>Criterios de materialidad</summary><p>Cambio mínimo de S/ 10.00 MM; peso del saldo actual o anterior ≥ 0.25% del activo; variación ≥ 1% o cambio absoluto ≥ S/ 50.00 MM. Se comparan rubros del mismo nivel para evitar duplicar el movimiento de un padre y sus hijos. Estos parámetros se centralizan en config/analytics.json.</p><p>La variación porcentual no se calcula con base cero o negativa. Los cambios de participación son puntos porcentuales sobre el rubro padre de cada periodo.</p></details>`
  );
}
function accountDetail() {
  const row = financial.catalog.find((r) => r.id === state.account);
  if (!row) return '<div class="empty">Rubro no encontrado.</div>';
  const p = financial.periods.find((p) => p.date === state.date),
    v = p?.values[row.id]?.[2],
    unit = row.unit;
  const series = rangePoints(
    financial.periods.map((p) => ({
      date: p.date,
      value: p.values[row.id]?.[2] ?? null,
    })),
  );
  const prev = financial.periods.find((p) => p.date === shift(state.date, -1)),
    year = financial.periods.find((p) => p.date === shift(state.date, -12)),
    dec = financial.periods.find(
      (p) => p.date === `${Number(state.date.slice(0, 4)) - 1}-12`,
    );
  const comp =
    row.kind === "ytd"
      ? `<div><small>YTD vs mismo mes anterior</small><b>${format(growth(v, year?.values[row.id]?.[2]), "PERCENT", true)}</b></div><div><small>Flujo de este mes</small><b>${format(monthlyFlow(financial.periods, row.id, state.date))}</b></div>`
      : `<div><small>MoM</small><b>${format(growth(v, prev?.values[row.id]?.[2]), "PERCENT", true)}</b></div><div><small>YTD</small><b>${format(growth(v, dec?.values[row.id]?.[2]), "PERCENT", true)}</b></div><div><small>YoY</small><b>${format(growth(v, year?.values[row.id]?.[2]), "PERCENT", true)}</b></div>`;
  const parent = financial.catalog.find((r) => r.id === row.parent),
    children = financial.catalog.filter((r) => r.parent === row.id);
  let childrenHtml = "";
  if (children.length) {
    const diffs = children
      .map((r) => ({
        id: r.id,
        label: r.label,
        delta: difference(
          p?.values[r.id]?.[2],
          (row.kind === "ytd" ? year : prev)?.values[r.id]?.[2],
        ),
      }))
      .filter((r) => finite(r.delta))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 3);
    childrenHtml = `<p class="source-note">Mayores cambios entre sus componentes (${row.kind === "ytd" ? "YTD YoY" : "MoM"}): ${diffs.map((r) => `<button class="text-button" data-account="${r.id}">${e(r.label)} ${format(r.delta, "PEN_THOUSAND", true)}</button>`).join(" · ") || "Sin comparativo"}.</p>`;
  }
  return panel(
    row.label,
    `${row.reference} · ${month(state.date)} · ${row.kind === "ytd" ? "acumulado enero al mes de corte" : "saldo al cierre"}`,
    `<div class="breadcrumbs">${row.path.map((x, i) => (i === row.path.length - 1 ? `<span>${e(x)}</span>` : `<span>${e(x)} ›</span>`)).join("")}</div><div class="detail-values"><div><small>Saldo seleccionado</small><b>${format(v, unit)}</b></div>${comp}${parent ? `<div><small>Participación en ${e(parent.label)}</small><b>${format(ratio(v, p?.values[parent.id]?.[2]), "PERCENT")}</b></div>` : ""}${row.group === "Activo" || row.group === "Pasivo" ? `<div><small>Sobre total ${row.group.toLowerCase()}</small><b>${format(ratio(v, p?.values[row.group === "Activo" ? "balance:59" : "balance:124"]?.[2]), "PERCENT")}</b></div>` : ""}</div>${lineChart(series, unit, row.label)}${statStrip(series, unit, row.kind !== "ytd", row.kind === "ytd")}${childrenHtml}<p class="source-note">${sourceLink(p.source_url)} · ME expresada en soles; no equivale a dólares. ${row.kind === "ytd" ? "El flujo mensual es la diferencia de acumulados; enero inicia un nuevo año." : ""}</p>`,
    rangeButtons(series, unit, row.label),
  );
}
function tableParents() {
  return financial.catalog.filter(
    (r) =>
      r.statement === state.statement &&
      r.group !== "Control" &&
      financial.catalog.some((c) => c.parent === r.id),
  );
}
function tableExpanded() {
  return (
    Boolean(state.query.trim()) ||
    tableParents().every((r) => !state.collapsed.has(r.id))
  );
}
function balanceView() {
  if (!state.treeInitialized) {
    state.collapsed = new Set(
      financial.catalog
        .filter((r) => financial.catalog.some((c) => c.parent === r.id))
        .map((r) => r.id),
    );
    state.treeInitialized = true;
  }
  if (!financial.catalog.some((r) => r.id === state.account)) {
    state.account = "balance:59";
    state.statement = "balance";
  }
  const result = accountTable(financial, state);
  exportRows = result.rows;
  const controls = `<div class="controls"><label>Estado <select id="statement"><option value="balance" ${state.statement === "balance" ? "selected" : ""}>Balance</option><option value="income" ${state.statement === "income" ? "selected" : ""}>Resultados YTD</option></select></label><label>Vista <select id="table-view">${[
    ["snapshot", "Actual"],
    ["monthly", "12 meses"],
    ["annual", "5 años · mismo mes"],
  ]
    .map(
      ([v, t]) =>
        `<option value="${v}" ${state.tableView === v ? "selected" : ""}>${t}</option>`,
    )
    .join("")}</select></label></div>`;
  return (
    heading(
      "Cuentas SBS",
      `Jerarquía del reporte B-2201 · ${month(state.date)} · selecciona cualquier cuenta para profundizar.`,
      controls,
    ) +
    accountDetail() +
    `<section class="panel"><div class="panel-head"><h2>Balance y resultados, por rubro</h2><div class="controls"><label class="sr-only" for="search">Buscar rubro</label><input id="search" type="search" placeholder="Buscar cuenta o rubro…" value="${e(state.query)}"><label class="sr-only" for="table-sort">Orden</label><select id="table-sort"><option value="hierarchy" ${state.sort === "hierarchy" ? "selected" : ""}>Jerarquía SBS</option><option value="impact" ${state.sort === "impact" ? "selected" : ""}>Movimiento · por nivel</option><option value="value" ${state.sort === "value" ? "selected" : ""}>Saldo · por nivel</option></select><button id="main-only" aria-pressed="${state.mainOnly}">Principales</button><button id="show-references" aria-pressed="${state.showReferences}">${icon("code")} ${state.showReferences ? "Ocultar referencias" : "Mostrar referencias"}</button><button id="expand-all" aria-expanded="${tableExpanded()}">${icon(tableExpanded() ? "compress" : "expand")} ${tableExpanded() ? "Plegar todo" : "Expandir todo"}</button></div></div>${result.html}<p class="footnote">${state.statement === "income" ? "Resultados acumulados YTD. La comparación principal es el mismo mes del año anterior." : "MN y ME están expresadas en soles. Las participaciones usan el padre directo; no sumar subtotales e hijos."}</p><details class="help"><summary>Búsqueda, códigos y comparabilidad</summary><p>La búsqueda encuentra nombres, palabras parciales, categorías, padres y referencias como F9. B-2201 publica rubros agregados y no incluye códigos del plan contable como 1101: esos códigos no se inventan ni se presentan como disponibles. Las filas con nombres repetidos conservan una identidad y ruta distintas. Al buscar se mantienen visibles sus padres.</p></details></section>`
  );
}
function reportView() {
  if (state.report === "derived") return derivedView();
  const p = reportData.periods.filter((p) => p.date <= state.date).at(-1);
  if (!p)
    return (
      heading("Indicadores y riesgos", "Fuentes regulatorias SBS") +
      reportTabs() +
      '<div class="empty">No hay observaciones disponibles hasta el corte seleccionado.</div>'
    );
  const currentIds = Object.keys(p.values);
  let catalog = reportData.catalog.filter((r) => currentIds.includes(r.id));
  if (!catalog.some((r) => r.id === state.reportMetric))
    state.reportMetric = Object.values(p.keys)[0]?.id || catalog[0]?.id || "";
  const metric = catalog.find((r) => r.id === state.reportMetric),
    unit = metric?.unit || "PEN_THOUSAND";
  const prev = reportData.periods.find((q) => q.date === shift(p.date, -1)),
    yoy = reportData.periods.find((q) => q.date === shift(p.date, -12));
  let series = rangePoints(
    reportData.periods.map((q) => ({
      date: q.date,
      value: q.values[state.reportMetric] ?? null,
      effective: q.effective[state.reportMetric],
    })),
    p.date,
  );
  // Add explicit gaps at the dataset's periodicity; SVG leaves missing values unconnected.
  const step = reportData.frequency === "quarterly" ? 3 : 1;
  if (series.length) {
    const byDate = new Map(series.map((q) => [q.date, q]));
    const all = [];
    for (let d = series[0].date; d <= p.date; d = shift(d, step))
      all.push(byDate.get(d) || { date: d, value: null });
    series = all;
  }
  const tokens = norm(state.reportQuery).split(" ").filter(Boolean);
  catalog = catalog.filter((r) =>
    tokens.every((t) => norm(r.label).includes(t)),
  );
  const rows = catalog.map((r) => {
    const date = p.effective[r.id],
      prior =
        prev?.effective[r.id] === shift(date, -1) ? prev?.values[r.id] : null,
      year =
        yoy?.effective[r.id] === shift(date, -12) ? yoy?.values[r.id] : null;
    return { r, date, prior, year };
  });
  exportRows = [
    [
      "archivo_periodo",
      "dato_periodo",
      "indicador",
      "valor",
      "unidad",
      "mom",
      "yoy",
      "fuente",
    ],
    ...rows.map(({ r, date, prior, year }) => [
      p.date,
      date,
      r.label,
      p.values[r.id],
      r.unit,
      compare(p.values[r.id], prior, r.unit).value,
      compare(p.values[r.id], year, r.unit).value,
      p.source_url,
    ]),
  ];
  const table = wrapTable(
    `<table class="metric-table"><thead><tr><th>Indicador / magnitud</th><th class="number">Valor</th><th class="number">MoM</th><th class="number">YoY</th><th>Periodo declarado</th></tr></thead><tbody>${rows.map(({ r, date, prior, year }) => `<tr class="${r.id === state.reportMetric ? "peer-highlight" : ""}"><td><button class="text-button" data-report-metric="${r.id}">${e(r.label)}</button></td><td class="number">${format(p.values[r.id], r.unit)}</td><td class="number">${p.warning ? "—" : deltaCell(p.values[r.id], prior, r.unit)}</td><td class="number">${p.warning ? "—" : deltaCell(p.values[r.id], year, r.unit)}</td><td>${month(date)}</td></tr>`).join("")}</tbody></table>`,
    "Datos regulatorios",
    true,
  );
  return (
    heading(
      "Indicadores y riesgos",
      `${reportData.title} · fuente ${state.report}`,
    ) +
    reportTabs() +
    (p.date !== state.date
      ? notice(
          `Información disponible hasta ${month(p.date, true)}. El corte seleccionado es ${month(state.date, true)}.`,
        )
      : "") +
    (p.warning
      ? notice(
          `${p.warning} Archivo: ${month(p.date)}. Encabezado: ${p.source_caption}. Se muestra el dato publicado, sin usarlo para alertas o comparaciones automáticas.`,
        )
      : "") +
    panel(
      metric?.label || "Serie histórica",
      `Archivo SBS de ${month(p.date)} · dato declarado a ${month(p.effective[state.reportMetric])}`,
      `${lineChart(series, unit, metric?.label || "Serie")}${statStrip(series, unit)}<p class="source-note">${sourceLink(p.source_url)} · ${reportData.frequency === "quarterly" ? "Promedio diario trimestral. No es un saldo de cierre." : "Cada métrica conserva su unidad y fecha."}</p>`,
      rangeButtons(series, unit, metric?.label || "Serie"),
    ) +
    `<section class="panel"><div class="panel-head"><h2>Detalle de la fuente</h2><div class="controls"><label class="sr-only" for="report-search">Buscar indicador</label><input id="report-search" type="search" value="${e(state.reportQuery)}" placeholder="Buscar indicador, moneda o componente…"></div></div>${rows.length ? table : '<div class="empty">No hay indicadores que coincidan con la búsqueda.</div>'}<p class="footnote">Ratios: cambios en pb. Importes: cambios en %. Múltiplos: diferencias en veces. No se calculan comparaciones sin el periodo exacto.</p></section>`
  );
}
function reportTabs() {
  return `<div class="pillars" aria-label="Fuentes regulatorias"><button data-report="derived" aria-pressed="${state.report === "derived"}">Ratios de análisis</button>${Object.entries(
    manifest.sources,
  )
    .filter(([c]) => c !== "B-2201")
    .map(
      ([c, s]) =>
        `<button data-report="${c}" aria-pressed="${c === state.report}">${e({ "B-2401": "Indicadores", "B-2336": "Sectores", "B-2402": "Capital", "B-2340": "Liquidez", "B-230809": "RCL", "B-234021": "RFNE", "B-2368": "Posición ME" }[c] || s.title)}</button>`,
    )
    .join("")}</div>`;
}
const PEER_FINANCIAL = {
  assets: "total_assets",
  credits: "gross_credits",
  deposits: "public_deposits",
  equity: "equity",
  net_income: "net_income",
};
function bankFinancialValue(b, key) {
  if (PEER_FINANCIAL[key]) return b[PEER_FINANCIAL[key]];
  if (key === "npl") return ratio(b.overdue, b.gross_credits);
  if (key === "coverage") return ratio(b.provisions, b.overdue);
  return null;
}
function peersView() {
  const key = state.peerMetric,
    unit = unitOf(key),
    config = METRICS[key],
    isfinancial = key in PEER_FINANCIAL || ["npl", "coverage"].includes(key);
  let rows = [],
    date = state.date,
    note = "",
    warning = "",
    groupLabel = "Grupo elegido · agregado",
    sourceUrl = "";
  if (isfinancial) {
    const p = financial.periods.find((p) => p.date === date),
      prior = financial.periods.find((p) => p.date === shift(date, -12));
    sourceUrl = p.source_url;
    rows = p.peers
      .filter((b) => !["system_foreign", "bcp_foreign"].includes(b.slug))
      .map((b) => ({
        slug: b.slug,
        name: BANK_NAMES[b.slug] || b.name,
        value: bankFinancialValue(b, key),
        prior: bankFinancialValue(
          prior?.peers.find((x) => x.slug === b.slug) || {},
          key,
        ),
      }));
    const aggregate = (period) => {
      const banks =
        period?.peers.filter((b) => state.peerBanks.includes(b.slug)) || [];
      if (banks.length !== state.peerBanks.length || !banks.length) return null;
      if (PEER_FINANCIAL[key]) {
        const vals = banks.map((b) => b[PEER_FINANCIAL[key]]);
        return vals.every(finite) ? vals.reduce((a, b) => a + b, 0) : null;
      }
      const numerator = key === "npl" ? "overdue" : "provisions",
        denominator = key === "npl" ? "gross_credits" : "overdue";
      if (!banks.every((b) => finite(b[numerator]) && finite(b[denominator])))
        return null;
      return ratio(
        banks.reduce((s, b) => s + b[numerator], 0),
        banks.reduce((s, b) => s + b[denominator], 0),
      );
    };
    rows.push({
      slug: "group",
      name: groupLabel,
      value: aggregate(p),
      prior: aggregate(prior),
    });
    note =
      "Sistema: total oficial B-2201, ámbito local. El grupo suma importes y calcula ratios sobre numeradores y denominadores agregados. Los cambios del universo bancario pueden afectar el crecimiento.";
  } else {
    const r = reportData,
      p = r.periods.filter((p) => p.date <= date).at(-1);
    date = p?.date || date;
    const met = p?.keys[key];
    sourceUrl = p?.source_url || "";
    if (p?.warning) warning = p.warning;
    const prior = r.periods.find((q) => q.date === shift(date, -12)),
      id = met?.id,
      priorId = prior?.keys[key]?.id;
    rows = Object.entries(p?.peers || {})
      .filter(([slug]) =>
        [
          "banbif",
          "bbva",
          "bcp",
          "bcp_foreign",
          "scotiabank",
          "interbank",
          "system",
          "system_foreign",
        ].includes(slug),
      )
      .map(([slug, values]) => ({
        slug,
        name: BANK_NAMES[slug] || slug,
        value: values[id],
        prior: prior?.peers[slug]?.[priorId],
      }));
    const chosen = rows.filter(
      (b) =>
        state.peerBanks.includes(b.slug) ||
        (b.slug === "bcp_foreign" && state.peerBanks.includes("bcp")),
    );
    const average = (field) =>
      chosen.length === state.peerBanks.length &&
      chosen.length &&
      chosen.every((b) => finite(b[field]))
        ? chosen.reduce((s, b) => s + b[field], 0) / chosen.length
        : null;
    rows.push({
      slug: "group",
      name: "Grupo elegido · media simple",
      value: average("value"),
      prior: average("prior"),
    });
    note =
      "Ratios oficiales de la misma fuente y periodo. Grupo: media aritmética simple de los bancos elegidos; no equivale al ratio consolidado. Se respeta el ámbito local o con sucursales del exterior indicado por SBS.";
  }
  rows.sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity));
  exportRows = [
    ["banco", "periodo", "indicador", "valor", "unidad", "yoy"],
    ...rows.map((r) => [
      r.name,
      date,
      config.label,
      r.value,
      unit,
      compare(r.value, r.prior, unit).value,
    ]),
  ];
  const system = rows.find((r) => r.slug === "system");
  const shareAllowed =
    isfinancial && key in PEER_FINANCIAL && key !== "net_income";
  return (
    heading(
      "¿Cómo está BanBif frente a otros bancos?",
      `${config.label} · ${month(date)}`,
      `<div class="controls"><label>Indicador <select id="peer-metric">${["assets", "credits", "deposits", "equity", "net_income", "npl", "coverage", "roe", "roa", "efficiency", "rcg", "liq_mn", "liq_me", "rcl", "rfne"].map((k) => `<option value="${k}" ${k === key ? "selected" : ""}>${e(METRICS[k].label)}</option>`).join("")}</select></label></div>`,
    ) +
    (date !== state.date
      ? notice(
          `Comparación con información disponible hasta ${month(date, true)}.`,
        )
      : "") +
    (warning
      ? notice(warning + " Comparaciones de variación suspendidas.")
      : "") +
    panel(
      "Comparación homogénea",
      note,
      `<div class="checkboxes">${["bcp", "bbva", "scotiabank", "interbank"].map((b) => `<label><input type="checkbox" data-peer="${b}" ${state.peerBanks.includes(b) ? "checked" : ""}>${BANK_NAMES[b]}</label>`).join("")}</div>`,
    ) +
    panel(
      "Bancos y referencia de sistema",
      "Los importes y ratios se ordenan de mayor a menor; el orden no implica una evaluación de riesgo.",
      wrapTable(
        `<table><thead><tr><th>Banco / referencia</th><th class="number">${e(config.label)}</th><th class="number">${unit === "PERCENT" ? "YoY · pb" : "YoY"}</th>${shareAllowed ? '<th class="number">Participación sistema</th>' : ""}</tr></thead><tbody>${rows.map((r) => `<tr class="${r.slug === "banbif" ? "peer-highlight" : ""}"><td>${e(r.name)}</td><td class="number">${format(r.value, unit)}</td><td class="number">${warning ? "—" : deltaCell(r.value, r.prior, unit, key)}</td>${shareAllowed ? `<td class="number">${format(ratio(r.value, system?.value), "PERCENT")}</td>` : ""}</tr>`).join("")}</tbody></table>`,
        "Comparación de bancos",
      ) +
        `<p class="source-note">${sourceUrl ? sourceLink(sourceUrl) : "Sin fuente para el corte seleccionado."} · — indica dato o comparativo no disponible.</p>`,
    )
  );
}
function healthView() {
  exportRows = [
    [
      "fuente",
      "ultimo_periodo",
      "periodos",
      "observaciones",
      "estado",
      "advertencias",
    ],
    ...health.datasets.map((d) => [
      d.dataset,
      d.latest_period,
      d.periods,
      d.rows,
      d.status,
      d.warnings.join(" | "),
    ]),
  ];
  return (
    heading(
      "Fuentes y calidad de información",
      `Última validación: ${health.as_of} · ${health.errors} errores · ${health.warnings} advertencias.`,
    ) +
    panel(
      "Disponibilidad por dataset",
      "La fecha de publicación y el periodo declarado pueden ser diferentes.",
      wrapTable(
        `<table><thead><tr><th>Dataset</th><th>Información hasta</th><th>Estado</th><th class="number">Periodos</th><th class="number">Observaciones BanBif</th><th>Periodicidad</th></tr></thead><tbody>${health.datasets.map((d) => `<tr><td>${sourceLink(d.source, d.title + " ↗")}<small>${e(d.dataset)}</small></td><td>${month(d.latest_observation_period || d.latest_period)}${d.latest_observation_period && d.latest_observation_period !== d.latest_period ? `<small>Archivo: ${month(d.latest_period)}</small>` : ""}</td><td><span class="status ${d.status}">${d.status}</span></td><td class="number">${d.periods}</td><td class="number">${d.rows.toLocaleString("en-US")}</td><td>${d.frequency === "quarterly" ? "Trimestral" : "Mensual"}</td></tr>`).join("")}</tbody></table>`,
        "Estado de las fuentes",
      ),
    ) +
    health.datasets
      .map(
        (d) =>
          `<details class="panel health-detail" ${d.status !== "OK" ? "open" : ""}><summary>${e(d.dataset)} · ${e(d.title)}</summary><p class="source-note">Unidad: ${e(d.unit)}. Moneda: ${e(d.currency)}.</p>${d.errors.length ? `<ul class="bad">${d.errors.map((w) => `<li>${e(w)}</li>`).join("")}</ul>` : ""}${d.warnings.length ? `<ul>${d.warnings.map((w) => `<li>${e(w)}</li>`).join("")}</ul>` : "<p>Validaciones automáticas sin observaciones.</p>"}${d.period_issues.length ? wrapTable(`<table><thead><tr><th>Archivo</th><th>Encabezado declarado</th></tr></thead><tbody>${d.period_issues.map((i) => `<tr><td>${month(i.date)}</td><td>${e(i.caption)}</td></tr>`).join("")}</tbody></table>`, "Discrepancias de periodo") : ""}${d.missing_periods.length ? `<p>Periodos faltantes: ${d.missing_periods.map((x) => month(x)).join(", ")}</p>` : ""}</details>`,
      )
      .join("") +
    `<details class="panel help"><summary>Metodología, cobertura y controles</summary><p>Las cifras proceden de ocho reportes SBS. No se incorporan calificaciones ni cifras externas de clasificadoras. B-2201 incluye saldos de balance y resultados acumulados; B-2401 aporta ROE y ROA anualizados oficiales. El RFNE se convierte de proporción a porcentaje y se reconcilia con financiación disponible/requerida. El RCL es el promedio de ratios diarios del trimestre; no se sustituye por el cociente de saldos promedio.</p><p>Se validan estructura, duplicados, valores finitos, fechas, periodos faltantes, identidad de entidad, MN + ME, activo = pasivo + patrimonio, y el total oficial del sistema. Los controles de rezago consideran la periodicidad de cada fuente. Una advertencia exige interpretación; no es evidencia automática de un error contable.</p></details>`
  );
}
function peerReportCode(key) {
  return {
    roe: "B-2401",
    roa: "B-2401",
    efficiency: "B-2401",
    liq_mn: "B-2401",
    liq_me: "B-2401",
    rcg: "B-2402",
    rcl: "B-230809",
    rfne: "B-234021",
  }[key];
}
async function render() {
  const id = ++renderId;
  exportRows = [];
  $("content").setAttribute("aria-busy", "true");
  $("error").hidden = true;
  try {
    if (["overview", "movements", "balance", "peers"].includes(state.view))
      financial = await Data.load("financial");
    if (state.view === "reports" && state.report !== "derived")
      reportData = await Data.load(state.report);
    if (state.view === "peers" && peerReportCode(state.peerMetric))
      reportData = await Data.load(peerReportCode(state.peerMetric));
    if (id !== renderId) return;
    $("navigation").innerHTML = NAV.map(
      ([v, label]) =>
        `<button class="nav-button" data-nav="${v}" ${v === state.view ? 'aria-current="page"' : ""}>${icon(NAV_ICONS[v])}${label}</button>`,
    ).join("");
    $("period").value = calendarDate(state.date);
    const i = overview.periods.findIndex((p) => p.date === state.date);
    $("prev").disabled = i <= 0;
    $("next").disabled = i >= overview.periods.length - 1;
    closeDetails();
    clearCharts();
    seriesDetails.clear();
    $("content").innerHTML = {
      overview: overviewView,
      movements: movementsView,
      balance: balanceView,
      reports: reportView,
      peers: peersView,
      health: healthView,
    }[state.view]();
    mountCharts();
    urlState();
  } catch (err) {
    if (id === renderId) {
      setError(err);
      $("content").innerHTML =
        '<div class="empty">No se pudo completar esta vista. La fuente no se reemplaza por datos de ejemplo.</div>';
    }
  } finally {
    if (id === renderId) $("content").setAttribute("aria-busy", "false");
  }
}
function drill(id) {
  state.account = id;
  state.statement = id.split(":")[0];
  state.view = "balance";
  state.query = "";
  render();
  window.scrollTo({ top: 0, behavior: "auto" });
}
function exportCsv() {
  if (!exportRows.length) {
    toast("No hay filas disponibles para exportar.");
    return;
  }
  const blob = new Blob(
    ["\uFEFF" + exportRows.map((r) => r.map(csvCell).join(",")).join("\r\n")],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `banbif-${state.view}-${state.date}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("CSV exportado con unidades y fechas.");
}
function switchTheme() {
  const value =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(value);
  try {
    localStorage.setItem(THEME_KEY, value);
    localStorage.setItem("sbs-theme", value);
  } catch {}
}
function bind() {
  document.addEventListener("click", (event) => {
    const b = event.target.closest("button");
    if (!b) return;
    if (b.dataset.nav) {
      closeDetails();
      state.view = b.dataset.nav;
      render();
      return;
    }
    if (b.dataset.drill) {
      closeDetails();
      drill(b.dataset.drill);
      return;
    }
    if (b.dataset.account) {
      state.account = b.dataset.account;
      render();
      return;
    }
    if (b.dataset.collapse) {
      const id = b.dataset.collapse;
      state.collapsed.has(id)
        ? state.collapsed.delete(id)
        : state.collapsed.add(id);
      render();
      return;
    }
    if (b.dataset.range !== undefined) {
      state.range = Number(b.dataset.range);
      render();
      return;
    }
    if (b.dataset.report) {
      state.report = b.dataset.report;
      state.reportMetric = "";
      state.reportQuery = "";
      state.view = "reports";
      render();
      return;
    }
    if (b.dataset.reportMetric) {
      state.reportMetric = b.dataset.reportMetric;
      render();
      return;
    }
    if (b.dataset.key) {
      closeDetails();
      const m = current().metrics[b.dataset.key];
      if (m?.id) {
        state.report = m.source;
        state.reportMetric = m.id;
        state.view = "reports";
        render();
      } else if (METRICS[b.dataset.key]?.row) drill(METRICS[b.dataset.key].row);
      else {
        state.peerMetric = b.dataset.key;
        state.view = "peers";
        render();
      }
      return;
    }
    if (b.id === "prev" || b.id === "next") {
      const i = overview.periods.findIndex((p) => p.date === state.date),
        p = overview.periods[i + (b.id === "prev" ? -1 : 1)];
      if (p) {
        state.date = p.date;
        render();
      }
    }
    if (b.id === "last") {
      state.date = manifest.latest_period;
      render();
    }
    if (b.id === "main-only") {
      state.mainOnly = !state.mainOnly;
      if (state.mainOnly)
        for (const row of tableParents())
          if (row.depth === 0) state.collapsed.delete(row.id);
      render();
    }
    if (b.id === "show-references") {
      state.showReferences = !state.showReferences;
      render();
    }
    if (b.id === "expand-all") {
      const fold = tableExpanded();
      for (const row of tableParents())
        fold ? state.collapsed.add(row.id) : state.collapsed.delete(row.id);
      state.query = "";
      state.mainOnly = false;
      render();
    }
  });
  document.addEventListener("change", (event) => {
    const el = event.target,
      fields = {
        period: "date",
        "trend-metric": "metric",
        statement: "statement",
        "table-view": "tableView",
        "table-sort": "sort",
        "move-mode": "moveMode",
        "move-sort": "moveSort",
        "peer-metric": "peerMetric",
      };
    if (el.dataset.peer) {
      state.peerBanks = el.checked
        ? [...new Set([...state.peerBanks, el.dataset.peer])]
        : state.peerBanks.filter((b) => b !== el.dataset.peer);
      render();
    } else if (fields[el.id]) {
      if (el.id === "period") {
        const chosen = el.value.slice(0, 7);
        if (!overview.periods.some((p) => p.date === chosen)) {
          el.value = calendarDate(state.date);
          toast("Ese periodo no tiene información SBS disponible.");
          return;
        }
        state.date = chosen;
      } else state[fields[el.id]] = el.value;
      if (el.id === "statement") {
        state.account = el.value === "income" ? "income:79" : "balance:59";
        state.query = "";
      }
      render();
    }
  });
  let searchTimer;
  document.addEventListener("input", (event) => {
    if (!["search", "report-search"].includes(event.target.id)) return;
    const el = event.target,
      id = el.id,
      position = el.selectionStart;
    state[id === "search" ? "query" : "reportQuery"] = el.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      await render();
      const field = $(id);
      if (field) {
        field.focus();
        field.setSelectionRange(position, position);
      }
    }, 150);
  });
  $("theme").addEventListener("click", switchTheme);
  $("export").addEventListener("click", exportCsv);
  $("refresh").addEventListener("click", () => runRefresh(true));
  bindDetails();
  startAutoRefresh();
  window.addEventListener("load", mountCharts, { once: true });
  window.addEventListener("hashchange", () => {
    recoverUrl();
    render();
  });
}
async function init(first = true) {
  try {
    const data = await Data.initialize();
    ({ overview, health, manifest } = data);
    state.date = overview.periods.some((p) => p.date === state.date)
      ? state.date
      : manifest.latest_period;
    if (first) recoverUrl();
    setPeriodBounds();
    $("latest").textContent =
      `Último balance: ${month(manifest.latest_period)}.`;
    updateStatus();
    if (first) bind();
    await render();
  } catch (err) {
    setError(err);
    $("content").setAttribute("aria-busy", "false");
    $("content").innerHTML =
      '<div class="empty">No se cargó la información. Sirve la carpeta por HTTP siguiendo el README; verifica que data/manifest.json esté publicado.<br><button id="retry-load">Volver a intentar</button></div>';
    $("retry-load").onclick = () => init(first);
  }
}
if (location.protocol === "file:") {
  setError(
    new Error(
      "Abre el proyecto con un servidor local: python -m http.server 8000. Consulta README.md.",
    ),
  );
  $("content").setAttribute("aria-busy", "false");
} else init();

function derivedView() {
  const keys = [
    "npl",
    "refi_ratio",
    "car",
    "coverage",
    "coverage_car",
    "provisions_direct",
    "loan_deposit",
    "available_public",
    "leverage",
    "liab_cap_res",
    "net_fin_margin",
    "operating_margin",
    "net_margin",
    "admin_eff",
    "admin_gross_margin",
  ];
  if (!keys.includes(state.reportMetric)) state.reportMetric = "car";
  const key = state.reportMetric,
    config = METRICS[key],
    m = current().metrics[key],
    unit = unitOf(key),
    series = metricSeries(key);
  exportRows = [
    ["indicador", "valor", "unidad", "periodo", "formula_fuente"],
    ...keys.map((k) => [
      METRICS[k].label,
      current().metrics[k]?.value,
      unitOf(k),
      state.date,
      "B-2201",
    ]),
  ];
  return (
    heading(
      "Ratios de análisis",
      "Cálculos directos sobre B-2201 · misma fecha y ámbito · sin cifras externas de clasificadoras.",
    ) +
    reportTabs() +
    panel(
      config.label,
      month(state.date),
      `${lineChart(series, unit, config.label)}${statStrip(series, unit, false)}`,
      rangeButtons(series, unit, config.label),
    ) +
    panel(
      "Diagnóstico financiero",
      "Haz clic en un indicador para revisar la serie; los márgenes usan acumulados del mismo año.",
      wrapTable(
        `<table><thead><tr><th>Ratio / fórmula</th><th class="number">Valor</th><th class="number">MoM</th><th class="number">YoY</th></tr></thead><tbody>${keys
          .map((k) => {
            const v = current().metrics[k]?.value;
            return `<tr><td><button class="text-button" data-report-metric="${k}">${e(METRICS[k].label)}</button></td><td class="number">${format(v, unitOf(k))}</td><td class="number">${deltaCell(v, metricAt(overview, k, shift(state.date, -1)), unitOf(k), k)}</td><td class="number">${deltaCell(v, metricAt(overview, k, shift(state.date, -12)), unitOf(k), k)}</td></tr>`;
          })
          .join("")}</tbody></table>`,
        "Ratios calculados",
      ),
    )
  );
}
