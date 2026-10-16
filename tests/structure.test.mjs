import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { structureModel } from "../assets/js/structure.js";
import { selectReport } from "../assets/js/entities.js";
const report = (code) =>
  JSON.parse(
    readFileSync(new URL(`../data/reports/${code}.json`, import.meta.url)),
  );
function assertMonthlyHistory(r) {
  const dates = r.periods.map(p => p.date);
  assert.ok(dates.length > 0);
  assert.deepEqual(dates, [...new Set(dates)].sort());
  const sources = JSON.parse(readFileSync(new URL('../config/sources.json', import.meta.url)));
  const [year, month] = dates.at(-1).split('-').map(Number);
  const expected = [];
  for (let i = sources[r.code].start_year * 12; i < year * 12 + month; i++)
    expected.push(`${Math.floor(i / 12)}-${String(i % 12 + 1).padStart(2, '0')}`);
  assert.deepEqual(dates, expected, 'History must contain every month, including new observations');
}
const base = {
  entity: "banbif",
  date: "2026-07",
  structureStatus: "Total",
  structureMetric: "Total",
};
test("structure preserves official totals, deposit weights and exact comparison periods", () => {
  const r = report("B-2344"),
    m = structureModel(r, base);
  assertMonthlyHistory(r);
  assert.ok(Math.abs(m.total - 16489585.034) < 0.001);
  assert.ok(
    Math.abs(m.rows.reduce((s, r) => s + r.value, 0) - m.total) < 0.001,
  );
  assert.ok(Math.abs(m.rows.reduce((s, r) => s + r.share, 0) - 100) < 1e-8);
  const prior = structureModel(r, { ...base, date: "2026-06" });
  assert.ok(Math.abs(m.changes.mom - (m.total / prior.total - 1) * 100) < 1e-9);
  const missing = structureModel(
    { ...r, periods: r.periods.filter((p) => p.date !== "2026-06") },
    base,
  );
  assert.equal(missing.changes.mom, null);
  assert.equal(missing.changes.ytd, m.changes.ytd);
});
test("credit situation, classification cutover and bank scope remain distinct", () => {
  const r = report("B-2334"),
    m = structureModel(r, base);
  assertMonthlyHistory(r);
  assert.ok(Math.abs(m.total - 15692393.887) < 0.001);
  const overdue = structureModel(r, { ...base, structureStatus: "Atrasados" });
  assert.ok(overdue.total > 0 && overdue.total < m.total);
  assert.ok(
    Math.abs(
      overdue.rows.filter((r) => !r.child).reduce((s, r) => s + r.value, 0) -
        overdue.total,
    ) < 0.05,
  );
  const cutoff = structureModel(r, { ...base, date: "2024-10" });
  assert.equal(cutoff.rows[0].changes.mom, null);
  assert.notEqual(cutoff.changes.mom, null);
  assert.notEqual(
    cutoff.rows.find((r) => r.name === "Consumo").changes.mom,
    null,
  );
  const local = structureModel(selectReport(r, "system"), {
    ...base,
    entity: "system",
  });
  assert.equal(local.total, undefined);
  const system = structureModel(selectReport(r, "system_foreign"), {
    ...base,
    entity: "system_foreign",
  });
  assert.ok(system.total > m.total);
  const pichincha = structureModel(selectReport(r, "pichincha"), {
    ...base,
    date: "2024-04",
    entity: "pichincha",
  });
  assert.match(pichincha.warning, /difiere/);
});
test("supplemental reports load without manifest registration, reuse cache and roll back failed refresh", async () => {
  const Data = await import("../assets/js/data.js?structure-test");
  let version = "first",
    fail = false,
    requests = 0;
  globalThis.fetch = async (path) => {
    if (path.includes("B-2334")) {
      requests++;
      if (fail) return new Response("", { status: 503 });
      return Response.json({
        schema_version: 1,
        version,
        code: "B-2334",
        catalog: [],
        periods: [],
      });
    }
    if (path.includes("manifest"))
      return Response.json({
        schema_version: 1,
        version: "main",
        overview: "overview.json",
        health: "health.json",
        financial: "financial.json",
        reports: {},
      });
    return Response.json({ schema_version: 1, version: "main", errors: 0 });
  };
  await Data.initialize();
  assert.equal((await Data.loadStructure("B-2334")).version, "first");
  await Data.loadStructure("B-2334");
  assert.equal(requests, 1);
  version = "second";
  assert.equal(await Data.refresh(), true);
  assert.equal((await Data.loadStructure("B-2334")).version, "second");
  fail = true;
  await assert.rejects(Data.refresh(), /503/);
  assert.equal((await Data.loadStructure("B-2334")).version, "second");
});

test("monthly history permits growth but rejects a missing, duplicate or unordered observation", () => {
  const r = structuredClone(report("B-2344"));
  const [year, month] = r.periods.at(-1).date.split('-').map(Number);
  const next = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7);
  r.periods.push({...r.periods.at(-1), date: next});
  assertMonthlyHistory(r);
  assert.throws(() => assertMonthlyHistory({...r, periods: r.periods.slice(1)}));
  assert.throws(() => assertMonthlyHistory({...r, periods: [...r.periods, r.periods.at(-1)]}));
  assert.throws(() => assertMonthlyHistory({...r, periods: [...r.periods].reverse()}));
});
