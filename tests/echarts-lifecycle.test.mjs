import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { JSDOM } from "jsdom";
import {
  chartOptions,
  comparisonOptions,
  lineChart,
  comparisonChart,
  mountCharts,
  clearCharts,
} from "../assets/js/charts.js";

const require = createRequire(import.meta.url);
const points = [
  { date: "2026-01", value: 1000 },
  { date: "2026-02", value: null },
  { date: "2026-03", value: 3000 },
];
const series = [{ name: "BanBif", slug: "banbif", color: "#1c7ff2", points }];

test("custom export handlers are supplied atomically or the feature is omitted", () => {
  const callback = () => {};
  for (const make of [
    (handler) =>
      chartOptions(points, "PEN_THOUSAND", "Activos", {}, false, handler),
    (handler) =>
      comparisonOptions(
        series,
        "PEN_THOUSAND",
        "Activos",
        {},
        "line",
        false,
        handler,
      ),
    (handler) =>
      comparisonOptions(
        series,
        "PEN_THOUSAND",
        "Activos",
        {},
        "bar",
        false,
        handler,
      ),
  ]) {
    assert.equal(make().toolbox.feature.myExport, undefined);
    assert.equal(make(callback).toolbox.feature.myExport.onclick, callback);
  }
});

test("real ECharts mounts, exports, restores, remounts and disposes without bind or internal-state errors", async () => {
  const dom = new JSDOM(
    "<!doctype html><html><body><main></main></body></html>",
    { pretendToBeVisual: true },
  );
  for (const key of [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "HTMLCanvasElement",
  ])
    Object.defineProperty(globalThis, key, {
      value: dom.window[key],
      configurable: true,
    });
  window.scrollTo = (x, y) => {
    window.scrollX = x;
    window.scrollY = y;
  };
  window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  window.HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new window.Event("close"));
  };
  const echarts = require("echarts");
  echarts.setPlatformAPI({
    measureText: (text, font) => ({
      width:
        String(text).length *
        (Number(font.match(/([\d.]+)px/)?.[1]) || 14) *
        0.54,
    }),
  });
  // SVG uses the actual ECharts toolbox/lifecycle without requiring a native canvas in CI.
  window.echarts = {
    ...echarts,
    init: (node, theme, options) =>
      echarts.init(node, theme, {
        ...options,
        renderer: "svg",
        width: 920,
        height: 400,
      }),
  };
  const host = document.querySelector("main");
  try {
    for (const kind of ["single", "line", "bar", "single"]) {
      host.innerHTML =
        kind === "single"
          ? lineChart(points, "PEN_THOUSAND", "Activos")
          : comparisonChart(series, "PEN_THOUSAND", "Activos", kind);
      mountCharts({ entity: "BanBif", date: "2026-03" });
      const node = host.querySelector(".chart-renderer");
      const chart = echarts.getInstanceByDom(node);
      assert.ok(chart);
      assert.equal(node.previousElementSibling.hidden, true);
      const callback = chart.getOption().toolbox[0].feature.myExport.onclick;
      assert.equal(typeof callback, "function");
      callback();
      const dialog = document.querySelector(".chart-export-dialog");
      assert.equal(dialog.open, true);
      assert.equal(
        dialog.querySelector('[role="status"]').textContent,
        "Vista previa lista.",
      );
      if (kind !== "bar") {
        dialog.querySelector("[data-add-growth]").click();
        assert.equal(
          dialog.querySelector("[data-growth-result]").textContent,
          "Var. +200.00%",
        );
        assert.equal(dialog.querySelector("[data-download]").disabled, false);
      }
      const svg = await (await fetch(dialog.querySelector("img").src)).text();
      assert.match(svg, /<svg/);
      assert.match(svg, /Activos/);
      if (kind !== "bar") assert.match(svg, /Var\. \+200\.00%/);
      dialog.querySelector("[data-close]").click();
      assert.equal(document.querySelector("dialog"), null);
      if (kind !== "bar")
        chart.dispatchAction({ type: "dataZoom", start: 50, end: 100 });
      mountCharts(); // Same update path as theme changes and the window load event.
      if (kind !== "bar") assert.equal(chart.getOption().dataZoom[0].start, 50);
      chart.dispatchAction({ type: "restore" });
      chart.resize({ width: 400, height: 320 });
      clearCharts();
      assert.equal(chart.isDisposed(), true);
      clearCharts(); // Cleanup is repeatable, including navigation after refresh.
    }
  } finally {
    clearCharts();
    dom.window.close();
  }
});
