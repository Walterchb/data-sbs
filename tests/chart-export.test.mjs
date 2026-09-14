import test from "node:test";
import assert from "node:assert/strict";
import {
  buildExportOptions,
  exportFilename,
} from "../assets/js/chart-export.js";
import { chartOptions, comparisonOptions } from "../assets/js/charts.js";
const points = [
  { date: "2026-01", value: 1500000 },
  { date: "2026-02", value: null },
  { date: "2026-03", value: 2000000 },
];
const settings = {
  title: "Posición (a)+(b)+(c)",
  subtitle: "BanBif · S/ MM",
  source: "Fuente: SBS",
  width: 1600,
  height: 900,
  fontSize: 18,
  background: "light",
  labels: "selected",
  selectedDate: "2026-03",
  decimals: 2,
  dateFormat: "month",
  lineWidth: 2.5,
  color: "#1c7ff2",
  grid: true,
  legend: true,
  references: true,
};
const single = {
  spec: { points, unit: "PEN_THOUSAND", label: "Posición (a)+(b)+(c)" },
  zoom: [{ start: 50, end: 100 }],
  makeOptions: (p) =>
    chartOptions(points, "PEN_THOUSAND", "Posición (a)+(b)+(c)", p),
};
test("export keeps monetary scale, null gaps, visible range and exact date labels without changing source", () => {
  const before = JSON.stringify(single.spec);
  const option = buildExportOptions(single, settings);
  assert.deepEqual(option.series[0].data, [1500000, null, 2000000]);
  assert.equal(option.yAxis.axisLabel.formatter(2000000), "2,000.00");
  assert.match(
    option.series[0].markPoint.data[0].label.formatter,
    /Mar 2026\n2,000.00/,
  );
  assert.equal(option.dataZoom[0].start, 50);
  assert.equal(option.toolbox.show, false);
  assert.equal(JSON.stringify(single.spec), before);
  assert.match(option.title[0].text, /\(c\)/);
  const missing = buildExportOptions(single, {
    ...settings,
    selectedDate: "2026-02",
  });
  assert.deepEqual(missing.series[0].markPoint.data, []);
  assert.equal(
    exportFilename("Provisiones / Créditos Atrasados"),
    "SBS_Provisiones_Creditos_Atrasados",
  );
});
test("comparison exports and bars apply monetary scaling once and preserve categories", () => {
  const series = [{ name: "BanBif", slug: "banbif", color: "#1c7ff2", points }];
  for (const kind of ["line", "bar"]) {
    const payload = {
      spec: {
        comparison: true,
        series,
        unit: "PEN_THOUSAND",
        label: "Créditos",
        kind,
      },
      makeOptions: (p) =>
        comparisonOptions(series, "PEN_THOUSAND", "Créditos", p, kind),
    };
    const option = buildExportOptions(payload, {
      ...settings,
      background: "dark",
      labels: kind === "bar" ? "all" : "selected",
    });
    assert.deepEqual(option.series[0].data, [1500, null, 2000]);
    assert.equal(
      (kind === "bar" ? option.xAxis : option.yAxis).axisLabel.formatter(2000),
      "2,000.00",
    );
    assert.equal(option.backgroundColor, "#0d1b2a");
    if (kind === "bar") {
      assert.deepEqual(
        option.yAxis.data,
        points.map((p) => p.date),
      );
      assert.equal(
        option.series[0].label.formatter({ value: 2000 }),
        "2,000.00",
      );
    }
  }
});

test("multiple exact dates and growth arrows retain units, signs and source data", () => {
  const option = buildExportOptions(single, {
    ...settings,
    selectedDates: ["2026-01", "2026-03", "2026-01"],
    comparisons: [
      { from: "2026-01", to: "2026-03", seriesIndex: 0, style: "arrow" },
    ],
  });
  assert.equal(option.series[0].markPoint.data.length, 2);
  const arrow = option.series[0].markLine.data.find(Array.isArray);
  assert.match(arrow[0].label.formatter, /Var\. \+33\.33%/);
  assert.deepEqual(arrow[0].coord, [0, 1500000]);
  assert.deepEqual(arrow[1].coord, [2, 2000000]);
  assert.equal(arrow[1].symbol, "arrow");
  const big = buildExportOptions(single, { ...settings, fontSize: 72 });
  assert.equal(big.textStyle.fontSize, 72);
  assert.equal(big.title[0].textStyle.fontSize, 72);
});
