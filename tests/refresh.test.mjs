import test from "node:test";
import assert from "node:assert/strict";
import { chartOptions } from "../assets/js/charts.js";

test("TC chart options retain null gaps, monetary units, gradient and mobile axes", () => {
  const points = [
    { date: "2026-01", value: 1500000 },
    { date: "2026-02", value: null },
    { date: "2026-03", value: 2000000 },
  ];
  const colors = {};
  const option = chartOptions(points, "PEN_THOUSAND", "Activos", colors, true);
  assert.equal(option.series[0].connectNulls, false);
  assert.deepEqual(option.series[0].data, [1500000, null, 2000000]);
  assert.equal(option.yAxis.position, "left");
  assert.equal(option.yAxis.axisLabel.formatter(1500000), "1,500.00");
  assert.equal(option.series[0].areaStyle.color.colorStops.length, 3);
  assert.match(
    option.tooltip.formatter([{ dataIndex: 0 }]),
    /S\/ 1,500\.00 MM/,
  );
  assert.equal(option.dataZoom[1].type, "slider");
});

test("refresh stages new data, rolls back a failed publication, then commits a complete version", async () => {
  const Data = await import("../assets/js/data.js?refresh-tests");
  let version = "old",
    fail = false;
  const makeManifest = () => ({
    schema_version: 1,
    version,
    overview: "overview.json",
    health: "health.json",
    financial: "financial.json",
    reports: {},
  });
  globalThis.fetch = async (path) => {
    if (path.includes("manifest")) return Response.json(makeManifest());
    if (fail && path.includes("financial"))
      return new Response("", { status: 503 });
    return Response.json({ schema_version: 1, version, errors: 0 });
  };
  await Data.initialize();
  await Data.load("financial");
  assert.equal(await Data.refresh(), false);
  version = "new";
  fail = true;
  await assert.rejects(Data.refresh(), /503/);
  assert.equal((await Data.initialize()).manifest.version, "old");
  assert.equal((await Data.load("financial")).version, "old");
  fail = false;
  assert.equal(await Data.refresh(), true);
  assert.equal((await Data.initialize()).manifest.version, "new");
  assert.equal((await Data.load("financial")).version, "new");
});
