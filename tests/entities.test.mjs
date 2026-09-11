import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  selectReport,
  selectFinancial,
  selectOverview,
} from "../assets/js/entities.js";
const read = (name) =>
  JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url)));

test("entity projections retain exact scope and independent dates without mutating shared data", () => {
  const base = read("reports/B-2401"),
    before = JSON.stringify(base);
  const bank = selectReport(base, "bbva");
  const system = selectReport(base, "system_foreign");
  const local = selectReport(base, "system");
  const mid = base.catalog.find((m) =>
    m.label.startsWith("Créditos Atrasados (criterio"),
  ).id;
  assert.equal(
    system.periods.find((p) => p.date === "2026-06").values[mid],
    2.85,
  );
  assert.deepEqual(local.periods.find((p) => p.date === "2026-06").values, {});
  assert.notEqual(
    bank.periods.at(-1).values[mid],
    base.periods.at(-1).values[mid],
  );
  assert.equal(JSON.stringify(base), before);
  const dated = {
    code: "B-230809",
    periods: [
      {
        date: "2026-06",
        values: { m: 10 },
        effective: { m: "2026-03" },
        warning: "BanBif conflict",
        keys: { rcl: { id: "m", date: "2026-03" } },
        peers: { bbva: { m: 20 } },
        peer_effective: { bbva: { m: "2026-06" } },
      },
    ],
  };
  const chosen = selectReport(dated, "bbva").periods[0];
  assert.equal(chosen.keys.rcl.value, 20);
  assert.equal(chosen.keys.rcl.date, "2026-06");
  assert.equal(chosen.warning, null);
  const financial = read("financial"),
    bundle = read("entities/system_foreign");
  assert.equal(
    selectFinancial(financial, bundle).periods.find((p) => p.date === "2026-06")
      .values["income:79"][2],
    8498947.2684,
  );
  assert.equal(
    selectOverview(read("overview"), bundle).periods.find(
      (p) => p.date === "2026-06",
    ).metrics.net_income.value,
    8498947.2684,
  );
});

test("entity downloads are lazy, bounded, retryable and refresh only the active entity", async () => {
  const Data = await import("../assets/js/data.js?entities-cache-test");
  let version = "v1",
    fail = false;
  const calls = [];
  globalThis.fetch = async (path) => {
    calls.push(path);
    if (path.includes("manifest"))
      return Response.json({
        schema_version: 1,
        version,
        overview: "overview.json",
        health: "health.json",
        financial: "financial.json",
        reports: {},
        entities: Object.fromEntries(
          ["a", "b", "c", "d", "e"].map((s) => [
            s,
            { path: `entities/${s}.json` },
          ]),
        ),
      });
    if (fail && path.includes("entities/b"))
      return new Response("", { status: 503 });
    return Response.json({
      schema_version: 1,
      version,
      errors: 0,
      entity: path.match(/entities\/(\w+)/)?.[1],
    });
  };
  await Data.initialize();
  assert.ok(calls.every((p) => !p.includes("entities/")));
  await Data.loadEntity("a");
  await Data.loadEntity("banbif");
  await Data.loadEntity("a");
  assert.equal(calls.filter((p) => p.includes("entities/a")).length, 1);
  fail = true;
  await assert.rejects(Data.loadEntity("b"), /503/);
  fail = false;
  await Data.loadEntity("b");
  await Data.loadEntity("c");
  await Data.loadEntity("d");
  await Data.loadEntity("e");
  await Data.loadEntity("a");
  assert.equal(
    calls.filter((p) => p.includes("entities/a")).length,
    2,
    "Least recently used entity evicted",
  );
  version = "v2";
  await Data.refresh();
  const refreshed = calls.filter(
    (p) => p.includes("entities/") && p.includes("v2"),
  );
  assert.equal(refreshed.length, 1);
  assert.match(refreshed[0], /entities\/a/);
});
