import test from "node:test";
import assert from "node:assert/strict";
import { exportComparisons } from "../assets/js/chart-annotations.js";
test("growth comparisons use exact dates and the selected bank; invalid bases never draw misleading percentages", () => {
  const spec = {
    comparison: true,
    series: [
      {
        points: [
          { date: "2025-12", value: 100 },
          { date: "2026-12", value: 120 },
        ],
      },
      {
        points: [
          { date: "2025-12", value: 50 },
          { date: "2026-12", value: 40 },
        ],
      },
    ],
  };
  const comparison = { from: "2025-12", to: "2026-12", seriesIndex: 1 };
  assert.equal(exportComparisons(spec, [comparison])[0].percent, -20);
  assert.equal(
    exportComparisons(spec, [{ ...comparison, seriesIndex: 0 }])[0].percent,
    20,
  );
  for (const value of [0, -50, null, undefined]) {
    spec.series[1].points[0].value = value;
    const result = exportComparisons(spec, [comparison])[0];
    assert.equal(result.valid, false);
    assert.equal(result.percent, null);
  }
  assert.equal(
    exportComparisons(spec, [
      { ...comparison, from: "2026-12", to: "2025-12" },
    ])[0].valid,
    false,
  );
  assert.equal(
    exportComparisons(spec, [{ ...comparison, from: "2025-11" }])[0].valid,
    false,
  );
  spec.series[1].points[0] = {
    date: "2025-12",
    effective: "2025-11",
    value: 50,
  };
  assert.equal(exportComparisons(spec, [comparison])[0].valid, false);
});
