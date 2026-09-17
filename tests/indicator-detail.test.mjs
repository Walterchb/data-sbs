import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  reportRows,
  metricGroup,
  metricLabel,
} from "../assets/js/report-detail.js";
import {
  withAnalysisRatios,
  trailingIncome,
  EXTRA_RATIOS,
} from "../assets/js/analysis-ratios.js";
import { buildEntries, searchEntries } from "../assets/js/global-search.js";
import { METRICS } from "../assets/js/config.js";
const read = (p) =>
  JSON.parse(fs.readFileSync(new URL("../" + p, import.meta.url)));
test("sector shares use the official total, preserve it under filtering and sort descending", () => {
  const data = read("data/reports/B-2336.json"),
    p = data.periods.at(-1),
    rows = reportRows(data, p);
  assert.equal(rows[0].r.label, "TOTAL CRÉDITOS A ACTIVIDADES EMPRESARIALES");
  assert.equal(rows[0].share, 100);
  assert.ok(
    Math.abs(rows.slice(1).reduce((a, r) => a + r.share, 0) - 100) < 0.001,
  );
  for (let i = 1; i < rows.length; i++)
    assert.ok(rows[i - 1].share >= rows[i].share);
  const filtered = reportRows(data, p, "comercio");
  assert.equal(
    filtered[0].share,
    rows.find((r) => r.r.id === filtered[0].r.id).share,
  );
  const zero = { ...p, values: { ...p.values, [rows[0].r.id]: 0 } };
  assert.ok(reportRows(data, zero).every((r) => r.share === null));
});
test("quarter comparisons require exact valid declared dates, including warning on prior source", () => {
  const r = {
    id: "a",
    label: "RATIO DE COBERTURA DE LIQUIDEZ · Total",
    unit: "PERCENT",
  };
  const p = (date) => ({ date, effective: { a: date }, values: { a: 120 } });
  const data = {
    code: "B-230809",
    catalog: [r],
    periods: [p("2025-12"), p("2026-03")],
  };
  assert.equal(reportRows(data, data.periods[1])[0].quarter, 120);
  assert.equal(reportRows(data, data.periods[1])[0].prior, null);
  data.periods[0].warning = "fecha dudosa";
  assert.equal(reportRows(data, data.periods[1])[0].quarter, null);
  delete data.periods[0].warning;
  data.periods[0].effective.a = "2025-09";
  assert.equal(reportRows(data, data.periods[1])[0].quarter, null);
});
test("official rows are classified without losing their source identity", () => {
  const d = read("data/reports/B-2401.json");
  const roe = d.catalog.find((r) => r.label.includes("/ Patrimonio Promedio"));
  assert.ok(metricLabel(roe).endsWith("(ROE)"));
  assert.equal(metricGroup(d.code, roe), "Rentabilidad");
  for (const code of ["B-2401", "B-230809", "B-234021"]) {
    const data = read(`data/reports/${code}.json`);
    assert.ok(data.catalog.every((r) => metricGroup(code, r)));
  }
});
test("12M flow uses exact year crossover and risk uses gross loans with 13 monthly closes", () => {
  const financial = {
    periods: Array.from({ length: 13 }, (_, i) => {
      let d = new Date(Date.UTC(2025, 6 + i, 1)).toISOString().slice(0, 7);
      return {
        date: d,
        values: {
          "income:36": [
            0,
            0,
            d === "2025-07"
              ? 70
              : d === "2025-12"
                ? 120
                : d === "2026-07"
                  ? 140
                  : 0,
          ],
          "income:56": [0, 0, 10],
          "income:9": [0, 0, 100],
          "income:40": [0, 0, 0],
          "balance:26": [0, 0, 800],
          "balance:37": [0, 0, 100],
          "balance:38": [0, 0, 100],
          "balance:25": [0, 0, 500],
          "balance:126": [0, 0, 200],
          "balance:59": [0, 0, 2000],
        },
      };
    }),
  };
  assert.equal(trailingIncome(financial.periods, "income:36", "2026-07"), 190);
  const overview = { periods: [{ date: "2026-07", metrics: {} }] };
  const result = withAnalysisRatios(overview, financial).periods[0].metrics;
  assert.equal(result.credit_cost_12m.value, 19);
  assert.equal(result.equity_assets.value, 10);
  assert.equal(result.admin_eff_12m.value, 10);
  financial.periods.splice(2, 1);
  assert.equal(
    withAnalysisRatios(overview, financial).periods[0].metrics.credit_cost_12m
      .value,
    null,
  );
  financial.periods.splice(0, 1);
  assert.equal(trailingIncome(financial.periods, "income:36", "2026-07"), null);
});
test("global search ranks acronyms, natural queries, partial words and minor typos; destinations are exact", () => {
  Object.assign(METRICS, EXTRA_RATIOS);
  const entries = buildEntries(
    read("data/financial.json"),
    read("assets/search-index.json").reports,
  );
  const roe = searchEntries(entries, "roe")[0];
  assert.ok(roe.title.includes("(ROE)"));
  assert.equal(roe.target.report, "B-2401");
  assert.ok(roe.target.reportMetric);
  assert.ok(
    searchEntries(entries, "ratio de costo de riesgo")[0].title.includes(
      "Costo de riesgo",
    ),
  );
  assert.ok(
    searchEntries(entries, "roe")[0].target.reportMetric !==
      searchEntries(entries, "roa")[0].target.reportMetric,
  );
  assert.ok(
    searchEntries(entries, "morosidad").some(
      (r) => r.target.reportMetric === "npl",
    ),
  );
  assert.ok(searchEntries(entries, "liquides").length > 0);
  assert.equal(searchEntries(entries, "xyzzyqwerty").length, 0);
  const corporate = entries.find((r) => r.title === "Corporativos · Atrasados");
  assert.equal(corporate.target.structureStatus, "Atrasados");
  assert.equal(corporate.target.structureMetric, "Corporativos");
  const regional = entries.find(
    (r) => r.title === "Arequipa" && r.target.concentrationSource === "B-2349",
  );
  assert.equal(regional.target.concentrationRegion, "110820d992b7649b");
  assert.ok(
    searchEntries(entries, "TIER 2").some(
      (r) => r.target.reportMetric === "calc:capital-tier2",
    ),
  );
});

test("monthly comparisons follow the declared metric date even when published one month later", () => {
  const data = {
    code: "B-2401",
    catalog: [
      { id: "capital", label: "Ratio de Capital Global", unit: "PERCENT" },
    ],
    periods: [
      {
        date: "2026-06",
        effective: { capital: "2026-05" },
        values: { capital: 14 },
      },
      {
        date: "2026-07",
        effective: { capital: "2026-06" },
        values: { capital: 15 },
      },
    ],
  };
  const row = reportRows(data, data.periods[1])[0];
  assert.equal(row.prior, 14);
  assert.equal(row.year, null);
});
