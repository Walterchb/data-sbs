import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  regionValue,
  regionalSeries,
  concentrationView,
} from "../assets/js/concentration.js";
import { comparisonOptions } from "../assets/js/charts.js";
const data = (code) =>
  JSON.parse(
    readFileSync(new URL(`../data/reports/${code}.json`, import.meta.url)),
  );
test("regional shares, inferred amounts, and market shares use the same SBS report", () => {
  const r = data("B-2350"),
    p = r.periods.find((p) => p.date === "2026-06"),
    lima = r.catalog.find((r) => r.label === "Lima").id;
  assert.ok(
    Math.abs(regionValue(r, p, "banbif", lima) - 88.02064189451198) < 1e-8,
  );
  const amount = regionValue(r, p, "banbif", lima, "amount");
  assert.ok(Math.abs(amount - (15926993.126 * 88.02064189451198) / 100) < 1e-6);
  const systemAmount = (422760564.166 * 79.50529458159707) / 100;
  assert.ok(
    Math.abs(
      regionValue(r, p, "banbif", lima, "market") -
        (amount / systemAmount) * 100,
    ) < 1e-8,
  );
  const total = r.catalog.find((r) => r.unit === "PEN_THOUSAND").id;
  const missing = structuredClone(p);
  delete missing.peers.banbif[total];
  assert.equal(regionValue(r, missing, "banbif", lima, "amount"), null);
  missing.effective[lima] = "2026-05";
  assert.equal(regionValue(r, missing, "banbif", lima), null);
  const zero = structuredClone(p);
  zero.peers.system_foreign[lima] = 0;
  assert.equal(regionValue(r, zero, "banbif", lima, "market"), null);
});
test("regional history retains missing months and bank gaps; comparison keeps each bank on one axis", () => {
  const r = data("B-2349"),
    lima = r.catalog.find((r) => r.label === "Lima").id;
  const filtered = {
    ...r,
    periods: r.periods.filter((p) => p.date !== "2026-05"),
  };
  const banks = [
    { slug: "banbif", name: "BanBif", color: "#1c7ff2" },
    { slug: "bbva", name: "BBVA", color: "#635bff" },
  ];
  const series = regionalSeries(filtered, "2026-06", 3, lima, "share", banks);
  assert.deepEqual(
    series[0].points.map((p) => p.date),
    ["2026-04", "2026-05", "2026-06"],
  );
  assert.equal(series[0].points[1].value, null);
  const opts = comparisonOptions(series, "PERCENT", "Lima", {}, "line", true);
  assert.equal(opts.series.length, 2);
  assert.ok(
    opts.series.every((s) => s.connectNulls === false && s.data[1] === null),
  );
  assert.match(opts.tooltip.formatter([{ dataIndex: 2 }]), /JUNIO 2026/);
  assert.match(opts.tooltip.formatter([{ dataIndex: 2 }]), /BBVA/);
  const bar = comparisonOptions(series, "PERCENT", "Regiones", {}, "bar");
  assert.equal(bar.yAxis.type, "category");
  assert.ok(bar.series.every((s) => s.type === "bar"));
});
test("concentration view preserves dataset, selects Lima, and exports all regional comparisons", () => {
  const report = data("B-2349"),
    before = JSON.stringify(report);
  const state = {
    date: "2026-06",
    concentrationSource: "B-2349",
    concentrationRegion: "",
    concentrationBanks: ["bbva", "system_foreign"],
    concentrationMode: "share",
    concentrationChart: "trend",
    range: 12,
  };
  const view = concentrationView(report, state);
  assert.ok(view.html.includes("95.95%"));
  assert.equal(view.rows.length, 1 + 26 * 3);
  assert.equal(JSON.stringify(report), before);
  assert.equal(
    report.catalog.find((r) => r.id === state.concentrationRegion).label,
    "Lima",
  );
  state.concentrationMode = "market";
  const market = concentrationView(report, state);
  assert.equal(market.rows.length, 1 + 26 * 2);
  assert.deepEqual(state.concentrationBanks, ["bbva", "system_foreign"]);
});
