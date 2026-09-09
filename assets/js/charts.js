import { escape, format, month, num, units } from "./format.js";
import { finite } from "./analytics.js";

// ECharts matches TC Treasury; SVG remains available if the CDN is unavailable.
const specifications = new Map();
const mounted = new Map();
let chartId = 0;
export function clearCharts() {
  for (const { chart, observer } of mounted.values()) {
    observer?.disconnect();
    chart.dispose();
  }
  mounted.clear();
  specifications.clear();
}
const css = (name) =>
  window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
export function chartOptions(points, unit, label, palette, mobile = false) {
  const valid = points.filter((p) => finite(p.value));
  const values = valid.map((p) => p.value),
    last = points.at(-1)?.value;
  const avg = values.reduce((a, b) => a + b, 0) / values.length,
    max = Math.max(...values),
    min = Math.min(...values);
  const reference = (name, value, color) => ({
    name,
    yAxis: value,
    lineStyle: { color, type: "dashed", width: 1.25, opacity: 0.78 },
    label: { show: false },
  });
  const refs = [
    reference("Prom", avg, palette.avg),
    reference("Máx", max, palette.green),
    reference("Mín", min, palette.amber),
  ];
  if (finite(last)) refs.unshift(reference("Selección", last, palette.ink));
  return {
    animationDuration: 540,
    textStyle: { fontFamily: 'Manrope, "Segoe UI", Arial, sans-serif' },
    grid: {
      left: mobile ? 10 : 14,
      right: mobile ? 10 : 18,
      top: 48,
      bottom: 66,
      containLabel: true,
    },
    tooltip: {
      trigger: "axis",
      confine: true,
      axisPointer: {
        type: "line",
        lineStyle: { color: palette.muted, width: 1, opacity: 0.55 },
      },
      backgroundColor: palette.tooltip,
      borderColor: palette.border,
      textStyle: { color: "#fff", fontWeight: 500 },
      formatter: (params) => {
        const p = Array.isArray(params) ? params[0] : params,
          point = points[p?.dataIndex];
        if (!point) return "";
        const row = (name, value, color) =>
          `<div class="chart-tip-row"><span class="chart-tip-name"><i style="background:${color}"></i>${escape(name)}</span><b>${format(value, unit)}</b></div>`;
        return `<div class="chart-tip-date">${escape(month(point.date, true).toLocaleUpperCase("es"))}</div>${row(label, point.value, "#1c7ff2")}${point.effective && point.effective !== point.date ? `<div class="chart-tip-note">Declarado: ${escape(month(point.effective).toLocaleUpperCase("es"))}</div>` : ""}${row("Prom", avg, palette.avg || "#635bff")}${row("Máx", max, palette.green || "#13966b")}${row("Mín", min, palette.amber || "#c17a18")}`;
      },
    },
    toolbox: {
      right: 12,
      top: 7,
      itemSize: 14,
      itemGap: 9,
      iconStyle: { borderColor: palette.muted },
      feature: {
        dataZoom: {
          yAxisIndex: "none",
          title: { zoom: "Zoom", back: "Atrás" },
        },
        restore: { title: "Restaurar" },
        saveAsImage: {
          title: "Descargar",
          pixelRatio: 3,
          backgroundColor: palette.panel,
          name: "SBS_" + label.replace(/[^a-z0-9]/gi, "_"),
        },
      },
    },
    dataZoom: [
      { type: "inside", throttle: 60, zoomOnMouseWheel: "ctrl" },
      {
        type: "slider",
        height: 22,
        bottom: 18,
        borderColor: palette.line,
        fillerColor: "rgba(0,163,181,.20)",
        handleStyle: { color: palette.navy },
        textStyle: { color: palette.muted, fontWeight: 500, fontSize: 10 },
        backgroundColor: palette.soft,
      },
    ],
    xAxis: {
      type: "category",
      data: points.map((p) => p.date),
      boundaryGap: false,
      axisLabel: {
        color: palette.muted,
        fontWeight: 500,
        fontSize: 10,
        margin: 13,
        hideOverlap: true,
        formatter: (value) => month(value),
      },
      axisLine: { lineStyle: { color: palette.line } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      position: mobile ? "left" : "right",
      scale: true,
      axisLabel: {
        color: palette.muted,
        formatter: (v) => num(unit.endsWith("THOUSAND") ? v / 1000 : v),
        fontSize: 10,
        margin: mobile ? 6 : 8,
        hideOverlap: true,
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: palette.grid } },
    },
    series: [
      {
        name: label,
        type: "line",
        data: points.map((p) => (finite(p.value) ? p.value : null)),
        connectNulls: false,
        smooth: true,
        showSymbol: false,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: {
          width: 1.25,
          color: "#1c7ff2",
          shadowBlur: 2,
          shadowColor: "rgba(28,127,242,.12)",
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(0,163,181,.43)" },
              { offset: 0.56, color: "rgba(0,163,181,.205)" },
              { offset: 1, color: "rgba(0,163,181,.045)" },
            ],
          },
        },
        emphasis: {
          focus: "series",
          lineStyle: { width: 1.65 },
          itemStyle: {
            color: palette.panel,
            borderColor: "#1c7ff2",
            borderWidth: 2,
          },
        },
        markLine: { silent: true, symbol: "none", precision: 2, data: refs },
        markPoint: {
          symbol: "circle",
          symbolSize: 8,
          label: { show: false },
          itemStyle: { color: palette.panel, borderWidth: 2 },
          data: [
            {
              type: "max",
              name: "Máx",
              itemStyle: { borderColor: palette.green },
            },
            {
              type: "min",
              name: "Mín",
              itemStyle: { borderColor: palette.amber },
            },
          ],
        },
      },
    ],
  };
}
export function mountCharts() {
  if (!window.echarts) return;
  const palette = {
    navy: css("--navy3"),
    ink: css("--ink"),
    muted: css("--muted"),
    line: css("--line"),
    grid: css("--grid"),
    panel: css("--panel"),
    soft: css("--soft"),
    green: css("--green"),
    amber: css("--amber"),
    avg: css("--purple"),
    tooltip: css("--tooltip-bg"),
    border: css("--tooltip-border"),
  };
  for (const [id, spec] of specifications) {
    const node = document.getElementById(id);
    if (!node) continue;
    let entry = mounted.get(id);
    if (!entry) {
      node.hidden = false;
      const chart = window.echarts.init(node, null, { renderer: "canvas" });
      const observer = window.ResizeObserver
        ? new window.ResizeObserver(() => {
            chart.resize();
            chart.setOption({
              yAxis: { position: window.innerWidth <= 760 ? "left" : "right" },
            });
          })
        : null;
      observer?.observe(node);
      entry = { chart, observer };
      mounted.set(id, entry);
    }
    const zoom = entry.chart.getOption()?.dataZoom;
    entry.chart.setOption(
      chartOptions(
        spec.points,
        spec.unit,
        spec.label,
        palette,
        window.innerWidth <= 760,
      ),
      true,
    );
    if (zoom?.length)
      entry.chart.setOption({
        dataZoom: zoom.map((z) => ({ start: z.start, end: z.end })),
      });
    node.previousElementSibling.hidden = true;
  }
}

export function lineChart(points, unit, label) {
  const valid = points.filter((p) => finite(p.value));
  if (!valid.length)
    return '<div class="empty">No hay observaciones para este rango.</div>';
  const id = `sbs-chart-${++chartId}`;
  specifications.set(id, { points, unit, label });
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
  const segments = path.trim().split(/(?=M)/).filter(Boolean);
  const area = segments
    .map((segment) => {
      const coords = [...segment.matchAll(/[ML]([\d.]+),([\d.]+)/g)];
      return coords.length
        ? `<path d="${segment}L${coords.at(-1)[1]},${H - B}L${coords[0][1]},${H - B}Z" fill="url(#${id}-fill)"/>`
        : "";
    })
    .join("");
  const values = valid.map((p) => p.value),
    avg = values.reduce((a, b) => a + b, 0) / values.length;
  const legend = [
    ["Selección", points.at(-1)?.value, "ink"],
    ["Prom", avg, "purple"],
    ["Máx", Math.max(...values), "green"],
    ["Mín", Math.min(...values), "amber"],
  ]
    .map(
      ([name, value, color]) =>
        `<span class="legend-pill"><span class="legend-dot" style="background:var(--${color})"></span>${name}<strong>${format(value, unit)}</strong></span>`,
    )
    .join("");
  return `<div class="treasury-chart"><div class="chart-legend">${legend}</div><div class="chart-fallback"><svg class="line-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escape(label)}"><title>${escape(label)} · ${escape(units[unit] || unit)}</title><defs><linearGradient id="${id}-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#00a3b5" stop-opacity=".43"/><stop offset=".56" stop-color="#00a3b5" stop-opacity=".205"/><stop offset="1" stop-color="#00a3b5" stop-opacity=".045"/></linearGradient></defs>${grid}${marks}${area}<path class="chart-line" d="${path.trim()}"/>${circles}</svg></div><div id="${id}" class="chart-renderer" role="img" aria-label="${escape(label)} · gráfico interactivo" hidden></div></div>`;
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
