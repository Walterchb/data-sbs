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

import {
  QUICK_STYLES,
  quickStyleFields,
  EXPORT_FONTS,
} from "../assets/js/chart-styles.js";
test("quick styles preserve data and dates while applying distinct typography, palettes and labels", () => {
  const before = JSON.stringify(single.spec);
  for (const [id, style] of Object.entries(QUICK_STYLES)) {
    const config = { ...settings, ...quickStyleFields(id), quickStyle: id };
    const option = buildExportOptions(single, config);
    assert.deepEqual(option.series[0].data, [1500000, null, 2000000]);
    assert.equal(
      option.title[0].textStyle.fontFamily,
      EXPORT_FONTS[style.titleFont],
    );
    assert.equal(option.backgroundColor, style.panel);
    assert.equal(option.series[0].markPoint.data[0].label.color, style.ink);
    assert.equal(option.dataZoom[0].start, 50);
  }
  assert.equal(JSON.stringify(single.spec), before);
  const option = buildExportOptions(single, {
    ...settings,
    labelTextColor: "#ff0011",
    comparisons: [{ from: "2026-01", to: "2026-03", style: "arrow" }],
  });
  assert.equal(option.series[0].label.color, "#ff0011");
  assert.equal(option.series[0].markPoint.data[0].label.color, "#ff0011");
  assert.equal(
    option.series[0].markLine.data.find(Array.isArray)[0].label.color,
    "#ff0011",
  );
});

test("Bloomberg uses terminal area, straight lines and left scale; Economist has a thicker rule; Vox is removed", () => {
  assert.equal(QUICK_STYLES.vox, undefined);
  const option = buildExportOptions(single, {
    ...settings,
    ...quickStyleFields("bloomberg"),
    quickStyle: "bloomberg",
  });
  assert.equal(option.yAxis.position, "left");
  assert.equal(option.xAxis.splitLine.lineStyle.type, "dotted");
  assert.equal(option.series[0].smooth, false);
  assert.equal(option.series[0].lineStyle.color, "#f4f7f8");
  assert.equal(option.series[0].areaStyle.color.colorStops[0].color, "#148698");
  assert.equal(option.backgroundColor, "#000000");
  assert.deepEqual(option.series[0].data, [1500000, null, 2000000]);
  const economist = buildExportOptions(single, {
    ...settings,
    ...quickStyleFields("economist"),
    quickStyle: "economist",
  });
  assert.equal(
    economist.graphic.find((g) => g.type === "rect").shape.height,
    10,
  );
});

test("Bloomberg light theme changes axes, plot and automatic line color while retaining title hierarchy", () => {
  const config = {
    ...settings,
    ...quickStyleFields("bloomberg"),
    quickStyle: "bloomberg",
  };
  const dark = buildExportOptions(single, config);
  const light = buildExportOptions(single, { ...config, background: "light" });
  assert.equal(light.yAxis.position, "left");
  assert.equal(light.xAxis.axisLabel.color, "#102033");
  assert.equal(light.yAxis.axisLabel.color, "#102033");
  assert.equal(light.series[0].lineStyle.color, "#155e75");
  assert.equal(light.series[0].markPoint.data[0].label.color, "#102033");
  assert.equal(light.grid.backgroundColor.colorStops[1].color, "#ffffff");
  assert.equal(dark.series[0].lineStyle.color, "#f4f7f8");
  assert.equal(light.title[0].textStyle.fontSize, 28 * 1.65);
  assert.ok(light.xAxis.axisLabel.margin >= 18);
});

import { exportLegendLayout } from "../assets/js/chart-export.js";
test("legend reserves multiple rows and wrapped names as series increase or output narrows", () => {
  const names = Array.from(
    { length: 8 },
    (_, i) =>
      `Banco ${i + 1} · Créditos directos y obligaciones con el público`,
  );
  const full = exportLegendLayout(names, 1600, 24, "Arial");
  const narrow = exportLegendLayout(names, 900, 24, "Arial");
  const one = exportLegendLayout(names.slice(0, 1), 1600, 24, "Arial");
  assert.ok(full.height > one.height);
  assert.ok(narrow.height > full.height);
  assert.deepEqual(
    full.data.filter((n) => n !== "\n"),
    names,
  );
  const series = names.map((name) => ({ name, points, color: "#2251ff" }));
  const payload = {
    spec: { comparison: true, series, unit: "PEN_THOUSAND" },
    makeOptions: (p) =>
      comparisonOptions(series, "PEN_THOUSAND", "Créditos", p),
  };
  const option = buildExportOptions(payload, { ...settings, fontSize: 28 });
  assert.ok(option.grid.top > option.legend.top + full.height);
  const noLegend = buildExportOptions(payload, {
    ...settings,
    fontSize: 28,
    legend: false,
  });
  assert.ok(noLegend.grid.top < option.grid.top);
});

test("area toggle applies to every preset and retains the existing personalized fill", () => {
  const original = buildExportOptions(single, settings);
  const enabled = buildExportOptions(single, { ...settings, areaFill: true });
  assert.deepEqual(enabled.series[0].areaStyle, original.series[0].areaStyle);
  assert.equal(
    buildExportOptions(single, { ...settings, areaFill: false }).series[0]
      .areaStyle.opacity,
    0,
  );
  for (const id of Object.keys(QUICK_STYLES)) {
    const config = { ...settings, ...quickStyleFields(id), quickStyle: id };
    const on = buildExportOptions(single, config),
      off = buildExportOptions(single, { ...config, areaFill: false });
    assert.equal(on.series[0].areaStyle.color.type, "linear");
    assert.ok(on.series[0].areaStyle.opacity > 0);
    assert.equal(off.series[0].areaStyle.opacity, 0);
    assert.deepEqual(on.series[0].data, off.series[0].data);
    assert.deepEqual(on.series[0].lineStyle, off.series[0].lineStyle);
  }
});
test("Paper uses centered serif headings and fine axes without a decorative rule", () => {
  assert.deepEqual(
    Object.values(QUICK_STYLES).map((p) => p.name),
    [
      "Consultoría",
      "Revista",
      "Finanzas",
      "Corporativo",
      "Prensa",
      "Trading",
      "Paper · académico",
    ],
  );
  const option = buildExportOptions(single, {
    ...settings,
    ...quickStyleFields("paper"),
    quickStyle: "paper",
  });
  assert.equal(option.title[0].left, "center");
  assert.match(option.textStyle.fontFamily, /Times New Roman/);
  assert.equal(option.title[0].textStyle.fontWeight, 400);
  assert.equal(option.series[0].lineStyle.width, 1.5);
  assert.equal(option.yAxis.axisLine.show, true);
  assert.equal(option.yAxis.splitLine.show, false);
  assert.equal(option.graphic.filter((g) => g.type === "rect").length, 0);
});
