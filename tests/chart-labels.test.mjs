import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { JSDOM } from "jsdom";
import { buildExportOptions } from "../assets/js/chart-export.js";
import { chartOptions, comparisonOptions } from "../assets/js/charts.js";
import { collectExportLabels } from "../assets/js/chart-labels.js";
import {
  createDrawingEditor,
  newDrawing,
  composeDrawingSvg,
} from "../assets/js/chart-drawing.js";
const require = createRequire(import.meta.url);
const dom = new JSDOM("<body/>", { pretendToBeVisual: true });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
const echarts = require("echarts");
echarts.setPlatformAPI({
  measureText: (text) => ({ width: String(text).length * 8 }),
});
const points = [
  { date: "2025-12", value: 1000000 },
  { date: "2026-06", value: null },
  { date: "2026-12", value: 1210000 },
];
const payload = {
  spec: { points, unit: "PEN_THOUSAND", label: "Créditos" },
  makeOptions: (p) => chartOptions(points, "PEN_THOUSAND", "Créditos", p),
};
const settings = {
  title: "Créditos",
  subtitle: "",
  source: "SBS",
  width: 1600,
  height: 900,
  fontSize: 18,
  background: "light",
  labels: "selected",
  selectedDates: ["2025-12", "2026-12"],
  labelBackground: true,
  labelBackgroundColor: "#ffcc88",
  labelConnectors: true,
  decimals: 2,
  lineWidth: 2,
  color: "#1c7ff2",
  references: false,
  grid: true,
  comparisons: [
    { id: 1, from: "2025-12", to: "2026-12", seriesIndex: 0, style: "arrow" },
  ],
};
function render(p, s) {
  const chart = echarts.init(null, null, {
    renderer: "svg",
    ssr: true,
    width: s.width,
    height: s.height,
  });
  const option = buildExportOptions(p, s);
  const layouts = new Map();
  for (const series of option.series)
    series.labelLayout = (p) => {
      layouts.set(`${p.seriesIndex}:${p.dataIndex}`, p);
      return {};
    };
  chart.setOption(option);
  return {
    chart,
    option,
    labels: collectExportLabels(chart, option, s, layouts),
  };
}
test("editable date and growth labels use real ECharts coordinates, include boundary dates and preserve units and custom background", () => {
  const { chart, option, labels } = render(payload, settings);
  assert.equal(labels.length, 3);
  assert.ok(
    labels.every(
      (l) => l.background === "rgba(255,204,136,0.82)" && l.connector,
    ),
  );
  const first = labels.find((l) => l.id === "date:0:2025-12");
  assert.match(first.text, /1,000.00/);
  assert.deepEqual(
    [first.anchorX, first.anchorY],
    chart.convertToPixel({ seriesIndex: 0 }, [0, 1000000]),
  );
  assert.match(labels.find((l) => l.id === "growth:0:1").text, /\+21.00%/);
  chart.dispose();
  const zoomed = render(
    { ...payload, zoom: [{ start: 50, end: 100 }] },
    settings,
  );
  assert.equal(
    zoomed.labels.some((l) => l.id === "date:0:2025-12"),
    false,
  );
  zoomed.chart.dispose();
});
test("all-value bar labels use grouped bar geometry, skip nulls and scale monetary values only once", () => {
  const series = [
    { name: "Banco A", slug: "a", points },
    {
      name: "Banco B",
      slug: "b",
      points: points.map((p) => ({
        ...p,
        value: p.value === null ? null : p.value * 2,
      })),
    },
  ];
  const p = {
    spec: {
      comparison: true,
      kind: "bar",
      series,
      unit: "PEN_THOUSAND",
      label: "Créditos",
    },
    makeOptions: (p) =>
      comparisonOptions(series, "PEN_THOUSAND", "Créditos", p, "bar"),
  };
  const { labels, chart } = render(p, {
    ...settings,
    labels: "all",
    comparisons: [],
  });
  assert.equal(labels.length, 4);
  assert.equal(labels.find((l) => l.id === "value:0:2025-12").text, "1,000.00");
  assert.equal(labels.find((l) => l.id === "value:1:2025-12").text, "2,000.00");
  assert.notEqual(labels[0].anchorY, labels[2].anchorY);
  chart.dispose();
});
test("label movement survives rerenders and resizing, connectors stay anchored, reset works and drawing layers straddle chart content", () => {
  const preview = document.createElement("section");
  preview.innerHTML = '<div class="export-preview-surface"></div>';
  const form = document.createElement("form");
  document.body.append(preview, form);
  let output = "";
  const editor = createDrawingEditor(preview, form, (s) => (output = s));
  const base =
    '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1600" height="900" fill="#fff"/><g data-chart-content="true"><text>Title</text></g></svg>';
  const label = {
    id: "date:0:2026-12",
    type: "label",
    text: "Dic 2026\n1,210.00",
    x: 500,
    y: 200,
    width: 100,
    height: 50,
    fontSize: 18,
    lineHeight: 22,
    stroke: "#102033",
    background: "rgba(255,204,136,0.82)",
    anchorX: 550,
    anchorY: 300,
    connector: true,
  };
  editor.setBase(base, 1600, 900, [{ ...label }]);
  preview.querySelector("[data-select-label]").click();
  const x = form.querySelector("[data-prop=x]");
  x.value = "620";
  x.dispatchEvent(new window.Event("input", { bubbles: true }));
  assert.equal(form.checkValidity(), true);
  assert.match(output, /x1="550" y1="300" x2="620"/);
  editor.setBase(base, 1600, 900, [{ ...label }]);
  assert.equal(x.value, "620");
  editor.setBase(base, 3200, 1800, [
    { ...label, x: 1000, y: 400, anchorX: 1100, anchorY: 600 },
  ]);
  assert.equal(x.value, "1240");
  form.querySelector("[data-reset-label]").click();
  assert.equal(x.value, "1000");
  editor.setConnectors(false);
  assert.doesNotMatch(output, /data-label-connector/);
  const marker = newDrawing("highlight", 1, 1600, 900);
  const rect = newDrawing("rect", 2, 1600, 900);
  const svg = composeDrawingSvg(base, [marker, rect, label]);
  assert.ok(
    svg.indexOf('data-drawing-id="1"') < svg.indexOf("data-chart-content"),
  );
  assert.ok(
    svg.indexOf("data-chart-content") < svg.indexOf('data-drawing-id="2"'),
  );
  assert.ok(
    svg.indexOf('data-drawing-id="2"') < svg.indexOf('data-drawing-id="date:'),
  );
  assert.doesNotMatch(svg, /data-hit=|data-drawing-handles/);
  editor.destroy();
  preview.remove();
  form.remove();
});
