import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  growth,
  compare,
  shift,
  monthlyFlow,
  metricAt,
  filterTree,
  movementRows,
} from "../assets/js/analytics.js";
import { format, csvCell } from "../assets/js/format.js";
import { lineChart } from "../assets/js/charts.js";
import { accountTable } from "../assets/js/tables.js";
const financial = JSON.parse(
  readFileSync(new URL("../data/financial.json", import.meta.url)),
);
const overview = JSON.parse(
  readFileSync(new URL("../data/overview.json", import.meta.url)),
);
test("exact month arithmetic, ratios in basis points, no coercion", () => {
  assert.equal(shift("2026-01", -1), "2025-12");
  assert.equal(shift("2026-07", -12), "2025-07");
  assert.equal(growth(0, 10), -100);
  assert.equal(growth(100, 0), null);
  assert.equal(growth(100, -10), null);
  assert.equal(growth(null, 10), null);
  assert.ok(Math.abs(compare(3.35, 3, "PERCENT").value - 35) < 1e-9);
  assert.equal(format(1250345, "PEN_THOUSAND"), "S/ 1,250.35 MM");
  assert.equal(format(null), "—");
});
test("YTD monthly flows reset in January, gaps remain null", () => {
  const ps = [
    { date: "2025-12", values: { a: [0, 0, 120] } },
    { date: "2026-01", values: { a: [0, 0, 10] } },
    { date: "2026-02", values: { a: [0, 0, 25] } },
    { date: "2026-04", values: { a: [0, 0, 50] } },
  ];
  assert.equal(monthlyFlow(ps, "a", "2026-01"), 10);
  assert.equal(monthlyFlow(ps, "a", "2026-02"), 15);
  assert.equal(monthlyFlow(ps, "a", "2026-04"), null);
});
test("stale source is not a current comparator", () => {
  const data = {
    periods: [
      { date: "2026-07", metrics: { rcg: { date: "2026-06", value: 15 } } },
    ],
  };
  assert.equal(metricAt(data, "rcg", "2026-07"), null);
  assert.equal(metricAt(data, "rcg", "2026-06"), 15);
});
test("search retains parent and uses path, never merges repeated names", () => {
  const matches = filterTree(financial.catalog, "vigentes otros");
  assert.ok(matches.some((r) => r.id === "balance:36"));
  assert.ok(matches.some((r) => r.id === "balance:26"));
  assert.ok(!matches.some((r) => r.id === "balance:13"));
  assert.equal(
    financial.catalog.filter((r) => r.label.toLowerCase() === "otros").length >
      1,
    true,
  );
});
test("material changes exclude tiny accounts and use only one hierarchy level", () => {
  const result = movementRows(
    financial,
    "2026-07",
    "mom",
    overview.config.materiality,
  );
  assert.equal(result.available, true);
  assert.ok(
    result.rows.every((r) => r.depth === 1 && Math.abs(r.delta) >= 10000),
  );
  assert.equal(
    movementRows(financial, "2021-01", "mom", overview.config.materiality)
      .available,
    false,
  );
});
test("SVG gaps never connect across null observations", () => {
  const html = lineChart(
    [
      { date: "2026-01", value: 1 },
      { date: "2026-02", value: null },
      { date: "2026-03", value: 2 },
    ],
    "PERCENT",
    "A",
  );
  const path = html.match(/class="chart-line" d="([^"]+)"/)[1];
  assert.equal((path.match(/M/g) || []).length, 2);
  assert.ok(!html.includes("NaN"));
});
test("CSV protects text formulas and keeps numeric signs", () => {
  assert.equal(csvCell("=1+1"), '"\'=1+1"');
  assert.equal(csvCell(-42), '"-42"');
});
test("tree table retains latest date and missing MN is a dash", () => {
  const copy = structuredClone(financial);
  copy.periods.at(-1).values["balance:9"][0] = null;
  const result = accountTable(copy, {
    date: copy.periods.at(-1).date,
    statement: "balance",
    query: "disponible",
    collapsed: new Set(),
    sort: "hierarchy",
    tableView: "snapshot",
    account: "balance:9",
  });
  assert.ok(result.html.includes(">—</td>"));
  assert.ok(result.rows.some((r) => r[0] === "2026-07"));
  assert.ok(!result.html.includes("undefined"));
});
