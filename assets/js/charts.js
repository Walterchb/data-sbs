import { escape, format, month, num, units } from "./format.js";
import { finite } from "./analytics.js";

// Native SVG charts have no CDN/runtime dependency. Every point has a title;
// the corresponding history table provides the complete accessible data.
export function lineChart(points, unit, label) {
  const valid = points.filter((p) => finite(p.value));
  if (!valid.length)
    return '<div class="empty">No hay observaciones para este rango.</div>';
  const W = 920,
    H = 270,
    L = 90,
    R = 20,
    T = 20,
    B = 40,
    w = W - L - R,
    h = H - T - B;
  let lo = Math.min(...valid.map((p) => p.value)),
    hi = Math.max(...valid.map((p) => p.value));
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.12;
  lo -= pad;
  hi += pad;
  const x = (i) =>
      L + (points.length === 1 ? w / 2 : (i / (points.length - 1)) * w),
    y = (v) => T + ((hi - v) / (hi - lo)) * h;
  const scale = unit.endsWith("THOUSAND") ? 1000 : 1;
  let path = "",
    open = false;
  points.forEach((p, i) => {
    if (!finite(p.value)) {
      open = false;
      return;
    }
    path += `${open ? "L" : "M"}${x(i).toFixed(2)},${y(p.value).toFixed(2)} `;
    open = true;
  });
  const grid = Array.from({ length: 4 }, (_, i) => {
    const v = lo + ((hi - lo) * i) / 3,
      yy = y(v);
    return `<line class="chart-grid" x1="${L}" y1="${yy}" x2="${W - R}" y2="${yy}"/><text x="${L - 10}" y="${yy + 4}" text-anchor="end">${num(v / scale)}</text>`;
  }).join("");
  const marks = [
    ...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]),
  ]
    .map(
      (i) =>
        `<text x="${x(i)}" y="${H - 12}" text-anchor="${i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}">${month(points[i].date)}</text>`,
    )
    .join("");
  const circles = points
    .map((p, i) =>
      finite(p.value)
        ? `<circle class="chart-point" cx="${x(i)}" cy="${y(p.value)}" r="${i === points.length - 1 ? 4 : 2.5}" tabindex="0" aria-label="${escape(month(p.date) + ": " + format(p.value, unit))}"><title>${escape(month(p.date) + " · " + format(p.value, unit) + (p.effective && p.effective !== p.date ? " · periodo declarado " + month(p.effective) : ""))}</title></circle>`
        : "",
    )
    .join("");
  return `<div class="chart-scroll"><svg class="line-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escape(label)}"><title>${escape(label)} · ${escape(units[unit] || unit)}</title>${grid}${marks}<path class="chart-line" d="${path.trim()}"/>${circles}</svg></div>`;
}
export function spark(values) {
  const valid = values.filter(finite);
  if (valid.length < 2) return '<span class="muted">—</span>';
  const lo = Math.min(...valid),
    hi = Math.max(...valid),
    range = hi - lo || 1;
  let path = "",
    open = false;
  values.forEach((v, i) => {
    if (!finite(v)) {
      open = false;
      return;
    }
    path += `${open ? "L" : "M"}${(i * 74) / (values.length - 1)},${22 - ((v - lo) / range) * 18} `;
    open = true;
  });
  return `<svg class="spark" viewBox="0 0 76 25" aria-hidden="true"><path d="${path}"/></svg>`;
}
export function bars(rows, unit) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value ?? 0)));
  return `<div class="bars">${rows.map((r) => `<div class="bar-row"><span>${escape(r.label)}</span><div class="bar-track"><i style="width:${Math.max(0, (Math.abs(r.value ?? 0) / max) * 100)}%"></i></div><strong>${format(r.value, unit)}</strong></div>`).join("")}</div>`;
}
