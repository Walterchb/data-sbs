import test from "node:test";
import assert from "node:assert/strict";
import { peerModel, peerHistory } from "../assets/js/peers.js";
const bank = (slug, v, n = 10) => ({
  slug,
  name: `Oficial ${slug}`,
  total_assets: v,
  gross_credits: v,
  total_deposits: v,
  overdue: n,
  provisions: 20,
  net_income: v,
});
const financial = {
  periods: [
    { date: "2025-06", peers: [bank("banbif", 100), bank("bbva", 200)] },
    { date: "2025-12", peers: [bank("banbif", 120), bank("bbva", 220)] },
    { date: "2026-05", peers: [bank("banbif", 140), bank("bbva", 240)] },
    { date: "2026-06", peers: [bank("banbif", 150), bank("bbva", 250)] },
  ],
};
const state = {
  entity: "banbif",
  peerBanks: ["bbva"],
  peerExtra: [],
  peerMetric: "credits",
  peerMode: "level",
  range: 12,
  date: "2026-06",
};
test("peer statistics and variations use exact bases, raw amounts and declared units", () => {
  const m = peerModel(financial, {}, state),
    r = m.rows[0];
  assert.equal(r.unit, "PEN_THOUSAND");
  assert.equal(r.yoy, 50);
  assert.equal(r.ytd, 25);
  assert.ok(Math.abs(r.mom - 100 / 14) < 1e-10);
  assert.equal(r.average, (120 + 140 + 150) / 3);
  assert.equal(r.count, 3);
  assert.equal(r.min, 120);
  assert.equal(r.max, 150);
  assert.equal(r.official, "Oficial banbif");
  assert.equal(
    m.chartSeries[0].points.find((p) => p.date === "2026-04").value,
    null,
  );
  const profit = peerModel(
    financial,
    {},
    { ...state, peerMetric: "net_income" },
  ).rows[0];
  assert.equal(profit.mom, null);
  assert.equal(profit.ytd, null);
  assert.equal(profit.yoy, 50);
});
test("mixed units index all series to one positive common month without altering the statistics table", () => {
  const m = peerModel(
    financial,
    {},
    { ...state, peerExtra: [{ bank: "banbif", metric: "npl" }] },
  );
  assert.equal(m.unit, "INDEX");
  assert.equal(m.baseDate, "2025-12");
  for (const s of m.chartSeries)
    assert.equal(s.points.find((p) => p.date === m.baseDate).value, 100);
  assert.equal(m.rows[0].value, 150);
  assert.ok(Math.abs(m.rows[2].value - 100 / 15) < 1e-10);
  const bad = structuredClone(financial);
  bad.periods.forEach((p) => (p.peers[0].gross_credits = 0));
  assert.equal(
    peerModel(bad, {}, { ...state, peerMode: "index" }).baseDate,
    undefined,
  );
});
test("official peer history respects bank scope, effective period, publication cutoff and quality warnings", () => {
  const source = {
    periods: [
      {
        date: "2026-03",
        keys: { rcg: { id: "x", date: "2026-03" } },
        peers: { bcp_foreign: { x: 14 } },
      },
      {
        date: "2026-06",
        keys: { rcg: { id: "x", date: "2026-06" } },
        peers: { bcp_foreign: { x: 15 } },
        peer_effective: { bcp_foreign: { x: "2026-05" } },
      },
      {
        date: "2026-07",
        keys: { rcg: { id: "x", date: "2026-07" } },
        peers: { bcp_foreign: { x: 18 } },
      },
    ],
  };
  const sources = { "B-2402": source };
  assert.equal(
    peerHistory(financial, sources, "bcp", "rcg", "2026-06").size,
    0,
  );
  const h = peerHistory(financial, sources, "bcp_foreign", "rcg", "2026-06");
  assert.equal(h.get("2026-05").value, 15);
  assert.equal(h.has("2026-07"), false);
  const m = peerModel(financial, sources, {
    ...state,
    entity: "bcp_foreign",
    peerMetric: "rcg",
    peerBanks: [],
  });
  assert.equal(m.rows[0].date, "2026-05");
  assert.equal(m.rows[0].mom, null);
  assert.equal(m.rows[0].yoy, null);
});
