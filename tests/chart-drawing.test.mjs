import test from "node:test";
import assert from "node:assert/strict";
import {
  newDrawing,
  fitDrawing,
  drawingMarkup,
  composeDrawingSvg,
} from "../assets/js/chart-drawing.js";
import { buildExportOptions } from "../assets/js/chart-export.js";
import { chartOptions } from "../assets/js/charts.js";

test("manual drawings keep pixel coordinates, circles and bounds; exported text is escaped and highlights stay behind it", () => {
  const circle = newDrawing("circle", 1, 1600, 900);
  circle.x = 1500.43;
  circle.y = -10;
  circle.width = 300.2;
  fitDrawing(circle, 1600, 900);
  assert.equal(circle.width, 300);
  assert.equal(circle.height, 300);
  assert.equal(circle.x, 1300);
  assert.equal(circle.y, 0);
  const text = newDrawing("text", 2, 1600, 900);
  text.text = "<script>alert(1)</script> & crecer";
  text.underline = true;
  fitDrawing(text, 1600, 900);
  const highlight = newDrawing("highlight", 3, 1600, 900);
  const svg = composeDrawingSvg(
    '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1600" height="900"/></svg>',
    [circle, text, highlight],
  );
  assert.ok(
    svg.indexOf('data-drawing-id="3"') < svg.indexOf('data-drawing-id="2"'),
  );
  assert.match(svg, /&lt;script&gt;/);
  assert.doesNotMatch(svg, /<script>/);
  assert.ok(svg.indexOf('fill-opacity=".45"') < svg.indexOf("<text"));
  assert.doesNotMatch(svg, /data-drawing-handles|data-hit/);
  const arrow = newDrawing("arrow", 4, 1600, 900);
  arrow.direction = "horizontal";
  arrow.reverse = true;
  assert.match(drawingMarkup([arrow]), /<line/);
});

test("comparison stroke and label background are independent of the series color and export background", () => {
  const points = [
    { date: "2025-12", value: 1000 },
    { date: "2026-12", value: 1200 },
  ];
  const payload = {
    spec: { points, unit: "PEN_THOUSAND", label: "Créditos" },
    makeOptions: (p) => chartOptions(points, "PEN_THOUSAND", "Créditos", p),
  };
  const settings = {
    fontSize: 18,
    width: 1600,
    height: 900,
    title: "Créditos",
    subtitle: "",
    source: "SBS",
    labels: "selected",
    selectedDates: ["2025-12", "2026-12"],
    background: "transparent",
    decimals: 2,
    lineWidth: 2,
    color: "#1c7ff2",
    references: false,
    grid: true,
    comparisons: [
      {
        from: "2025-12",
        to: "2026-12",
        seriesIndex: 0,
        style: "arrow",
        color: "#dd2277",
      },
    ],
  };
  const option = buildExportOptions(payload, {
    ...settings,
    labelBackground: false,
  });
  const line = option.series[0].markLine.data.find(Array.isArray);
  assert.equal(line[0].lineStyle.color, "#dd2277");
  assert.equal(line[1].itemStyle.color, "#dd2277");
  assert.equal(option.series[0].lineStyle.color, "#1c7ff2");
  assert.equal(line[0].label.backgroundColor, "transparent");
  assert.equal(
    option.series[0].markPoint.data[0].label.backgroundColor,
    "transparent",
  );
  const subtle = buildExportOptions(payload, {
    ...settings,
    labelBackground: true,
  });
  assert.match(
    subtle.series[0].markPoint.data[0].label.backgroundColor,
    /rgba/,
  );
});
