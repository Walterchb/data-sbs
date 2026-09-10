import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CAPITAL_INPUTS,
  CAPITAL_CALCULATED,
  withCalculatedCapital,
} from "../assets/js/capital.js";
import { format } from "../assets/js/format.js";
const report = JSON.parse(
  readFileSync(new URL("../data/reports/B-2402.json", import.meta.url)),
);
const june = report.periods.find((p) => p.date === "2026-06");
test("June capital reconstruction reconciles BanBif and system without modifying SBS inputs", () => {
  const before = JSON.stringify(report);
  const enriched = withCalculatedCapital(report);
  const p = enriched.periods.find((p) => p.date === "2026-06");
  assert.equal(format(p.values["calc:capital-tier1"]), "S/ 2,227.47 MM");
  assert.equal(format(p.values["calc:capital-total"]), "S/ 3,072.21 MM");
  assert.equal(format(p.values["calc:capital-tier2"]), "S/ 844.74 MM");
  for (const [slug, expected] of [
    ["banbif", "72.50%"],
    ["system", "76.76%"],
  ]) {
    const v = p.peers[slug];
    assert.equal(format(v["calc:capital-tier1-share"], "PERCENT"), expected);
    assert.ok(
      Math.abs(
        v["calc:capital-tier1"] +
          v["calc:capital-tier2"] -
          v["calc:capital-total"],
      ) < 1e-6,
    );
    assert.ok(
      Math.abs(
        v["calc:capital-tier1-share"] + v["calc:capital-tier2-share"] - 100,
      ) < 1e-10,
    );
  }
  assert.equal(JSON.stringify(report), before);
  assert.equal(
    withCalculatedCapital(enriched).catalog.length,
    enriched.catalog.length,
  );
  assert.ok(
    CAPITAL_CALCULATED.every(
      ({ id }) => enriched.periods[0].values[id] === null,
    ),
  );
});
test("capital calculation rejects missing, inconsistent, and mismatched-date inputs independently for each bank", () => {
  const calculate = (p) =>
    withCalculatedCapital({ ...report, periods: [p] }).periods[0];
  for (const patch of [
    { warning: "Periodo por confirmar" },
    { effective: { ...june.effective, [CAPITAL_INPUTS.apr]: "2026-05" } },
    { values: { ...june.values, [CAPITAL_INPUTS.apr]: null } },
    { values: { ...june.values, [CAPITAL_INPUTS.rcg]: 0 } },
    { values: { ...june.values, [CAPITAL_INPUTS.tier1]: 99 } },
  ])
    assert.ok(
      CAPITAL_CALCULATED.every(
        ({ id }) => calculate({ ...june, ...patch }).values[id] === null,
      ),
    );
  const p = calculate({
    ...june,
    peers: { system: { ...june.peers.system, [CAPITAL_INPUTS.tier1]: null } },
  });
  assert.equal(p.peers.system["calc:capital-tier1"], null);
  assert.ok(p.values["calc:capital-tier1"] > 0);
});
