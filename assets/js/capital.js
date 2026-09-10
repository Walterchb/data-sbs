// B-2402 inputs. Ratios are percentages; source amounts remain in S/ thousands.
export const CAPITAL_INPUTS = {
  apr: "ca5ea45f0a5cc8ef",
  tier1: "083c1b55b8ab601a",
  rcg: "b352bb3dd997b9fc",
};
export const CAPITAL_CALCULATED = [
  {
    id: "calc:capital-total",
    label: "Patrimonio efectivo total (calculado)",
    unit: "PEN_THOUSAND",
    kind: "stock",
  },
  {
    id: "calc:capital-tier1",
    label: "Patrimonio efectivo Nivel 1 · TIER 1 (calculado)",
    unit: "PEN_THOUSAND",
    kind: "stock",
  },
  {
    id: "calc:capital-tier2",
    label: "Patrimonio efectivo Nivel 2 · TIER 2 (calculado)",
    unit: "PEN_THOUSAND",
    kind: "stock",
  },
  {
    id: "calc:capital-tier1-share",
    label: "TIER 1 / patrimonio efectivo (calculado)",
    unit: "PERCENT",
    kind: "ratio",
  },
  {
    id: "calc:capital-tier2-share",
    label: "TIER 2 / patrimonio efectivo (calculado)",
    unit: "PERCENT",
    kind: "ratio",
  },
];
function calculate(period, values = {}) {
  const empty = Object.fromEntries(
    CAPITAL_CALCULATED.map(({ id }) => [id, null]),
  );
  const ids = Object.values(CAPITAL_INPUTS);
  if (
    period.warning ||
    ids.some(
      (id) =>
        period.effective?.[id] !== period.date || !Number.isFinite(values[id]),
    )
  )
    return empty;
  const apr = values[CAPITAL_INPUTS.apr],
    tier1Ratio = values[CAPITAL_INPUTS.tier1],
    rcg = values[CAPITAL_INPUTS.rcg];
  if (apr <= 0 || rcg <= 0 || tier1Ratio < 0 || tier1Ratio > rcg) return empty;
  const total = (apr * rcg) / 100,
    tier1 = (apr * tier1Ratio) / 100;
  const amounts = [
    total,
    tier1,
    total - tier1,
    (tier1Ratio / rcg) * 100,
    ((rcg - tier1Ratio) / rcg) * 100,
  ];
  return Object.fromEntries(
    CAPITAL_CALCULATED.map(({ id }, index) => [id, amounts[index]]),
  );
}
export function withCalculatedCapital(report) {
  if (report.code !== "B-2402") return report;
  return {
    ...report,
    catalog: [
      ...report.catalog.filter(({ id }) => !id.startsWith("calc:capital-")),
      ...CAPITAL_CALCULATED,
    ],
    periods: report.periods.map((period) => ({
      ...period,
      values: { ...period.values, ...calculate(period, period.values) },
      effective: {
        ...period.effective,
        ...Object.fromEntries(
          CAPITAL_CALCULATED.map(({ id }) => [id, period.date]),
        ),
      },
      peers: Object.fromEntries(
        Object.entries(period.peers || {}).map(([slug, values]) => [
          slug,
          { ...values, ...calculate(period, values) },
        ]),
      ),
    })),
  };
}
