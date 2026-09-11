import test from "node:test";
import assert from "node:assert/strict";
import { compositionData } from "../assets/js/composition.js";
test("composition includes exited balances, signed changes and exact bases without double counting", () => {
  const data = {
    catalog: [
      { id: "a", parent: "total" },
      { id: "b", parent: "total" },
      { id: "nested", parent: "a" },
    ],
    periods: [
      {
        date: "2025-06",
        values: { total: [0, 0, 200], a: [0, 0, 100], b: [0, 0, 100] },
      },
      {
        date: "2025-12",
        values: { total: [0, 0, 160], a: [0, 0, 160], b: [0, 0, 0] },
      },
      {
        date: "2026-05",
        values: { total: [0, 0, 130], a: [0, 0, 80], b: [0, 0, 50] },
      },
      {
        date: "2026-06",
        values: {
          total: [0, 0, 120],
          a: [0, 0, 120],
          b: [0, 0, 0],
          nested: [0, 0, 120],
        },
      },
    ],
  };
  const c = compositionData(data, "2026-06", "total");
  assert.equal(c.total, 120);
  assert.equal(c.rows.length, 2);
  assert.equal(c.rows[0].delta, 40);
  assert.equal(c.rows[1].delta, -50);
  assert.equal(c.changes.yoy, -40);
  assert.equal(c.changes.ytd, -25);
  assert.equal(c.rows[1].changes.ytd, null);
  assert.equal(compositionData(data, "2026-04", "total").total, undefined);
  assert.equal(compositionData(data, "2025-06", "total").rows[0].delta, null);
});
