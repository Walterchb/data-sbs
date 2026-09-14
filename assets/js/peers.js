import { finite, ratio, compare, shift, months } from "./analytics.js";
import { METRICS, BANK_NAMES } from "./config.js";
export const PEER_METRICS = [
  "assets",
  "credits",
  "deposits",
  "equity",
  "net_income",
  "npl",
  "coverage",
  "roe",
  "roa",
  "efficiency",
  "rcg",
  "liq_mn",
  "liq_me",
  "rcl",
  "rfne",
];
export const peerReportCode = (key) =>
  ({
    roe: "B-2401",
    roa: "B-2401",
    efficiency: "B-2401",
    liq_mn: "B-2401",
    liq_me: "B-2401",
    rcg: "B-2402",
    rcl: "B-230809",
    rfne: "B-234021",
  })[key];
const fields = {
  assets: "total_assets",
  credits: "gross_credits",
  deposits: "total_deposits",
  equity: "equity",
  net_income: "net_income",
};
export function bankFinancialValue(b, key) {
  if (!b) return null;
  if (fields[key]) return b[fields[key]];
  if (key === "npl") return ratio(b.overdue, b.gross_credits);
  if (key === "coverage") return ratio(b.provisions, b.overdue);
  return null;
}
export function peerChoices(state) {
  const foreign = state.entity.endsWith("_foreign");
  const scope = (b) => (foreign && b === "bcp" ? "bcp_foreign" : b);
  const list = [
    { bank: state.entity, metric: state.peerMetric },
    ...state.peerBanks.map((b) => ({
      bank: scope(b),
      metric: state.peerMetric,
    })),
    ...(state.peerExtra || []),
  ];
  return [...new Map(list.map((s) => [`${s.bank}:${s.metric}`, s])).values()];
}
export function peerHistory(financial, sources, bank, key, cutoff) {
  const result = new Map(),
    code = peerReportCode(key);
  if (!code) {
    for (const p of financial.periods) {
      if (p.date > cutoff) continue;
      const b = p.peers.find((b) => b.slug === bank);
      result.set(p.date, {
        date: p.date,
        value: bankFinancialValue(b, key),
        official: b?.name || "",
        warning: "",
      });
    }
  } else
    for (const p of sources[code]?.periods || []) {
      if (p.date > cutoff) continue;
      const id = p.keys?.[key]?.id;
      if (!id) continue;
      const effective =
        p.peer_effective?.[bank]?.[id] ||
        p.effective?.[id] ||
        p.keys[key].date ||
        p.date;
      if (effective > cutoff) continue;
      const value = p.peers?.[bank]?.[id];
      if (finite(value))
        result.set(effective, {
          date: effective,
          value,
          official: p.entity_names?.[bank] || "",
          warning:
            p.peer_warnings?.[bank] ||
            (bank === "banbif" ? p.warning : "") ||
            "",
        });
    }
  return result;
}
function summarize(history, choice, dates, cutoff) {
  const unit = METRICS[choice.metric].unit || "PEN_THOUSAND";
  const actual = [...history.values()]
    .filter((p) => finite(p.value) && p.date <= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
  const date = actual?.date || cutoff;
  const delta = (base) => {
    const p = history.get(base);
    return actual?.warning || p?.warning
      ? null
      : compare(actual?.value, p?.value, unit).value;
  };
  const visible = dates
    .map((date) => history.get(date))
    .filter((p) => finite(p?.value) && !p.warning);
  return {
    ...choice,
    id: `${choice.bank}:${choice.metric}`,
    unit,
    name: `${BANK_NAMES[choice.bank] || choice.bank} · ${METRICS[choice.metric].label}`,
    date,
    value: actual?.value ?? null,
    official: actual?.official || "",
    warning: actual?.warning || "",
    mom: choice.metric === "net_income" ? null : delta(shift(date, -1)),
    ytd:
      choice.metric === "net_income"
        ? null
        : delta(`${Number(date.slice(0, 4)) - 1}-12`),
    yoy: delta(shift(date, -12)),
    average: visible.length
      ? visible.reduce((s, p) => s + p.value, 0) / visible.length
      : null,
    min: visible.length ? Math.min(...visible.map((p) => p.value)) : null,
    max: visible.length ? Math.max(...visible.map((p) => p.value)) : null,
    count: visible.length,
    points: dates.map((date) => ({
      date,
      value: history.get(date)?.warning
        ? null
        : (history.get(date)?.value ?? null),
    })),
    history,
  };
}
const colors = [
  "#1c7ff2",
  "#e58b24",
  "#12a184",
  "#9567d7",
  "#e15a79",
  "#54839b",
  "#b49a16",
  "#5c65ca",
];
export function peerModel(financial, sources, state) {
  const allDates = financial.periods
    .map((p) => p.date)
    .filter((d) => d <= state.date);
  const dates = state.range ? months(state.date, state.range) : allDates;
  const rows = peerChoices(state).map((c) =>
    summarize(
      peerHistory(financial, sources, c.bank, c.metric, state.date),
      c,
      dates,
      state.date,
    ),
  );
  const availableRows = rows.filter((r) =>
    r.points.some((p) => finite(p.value)),
  );
  const mixed = new Set(availableRows.map((r) => r.unit)).size > 1;
  const mode = mixed ? "index" : state.peerMode || "level";
  const baseDate =
    mode === "index"
      ? dates.find(
          (date) =>
            availableRows.length &&
            availableRows.every(
              (r) =>
                finite(r.history.get(date)?.value) &&
                r.history.get(date).value > 0 &&
                !r.history.get(date).warning,
            ),
        )
      : null;
  const unit =
    mode === "index"
      ? "INDEX"
      : availableRows[0]?.unit || rows[0]?.unit || "PEN_THOUSAND";
  const chartSeries = rows.map((r, i) => ({
    analysis: true,
    slug: r.bank,
    entity: r.bank,
    name: r.name,
    color: colors[i % colors.length],
    points: r.points.map((p) => ({
      date: p.date,
      value:
        mode === "index"
          ? baseDate && p.date >= baseDate && finite(p.value)
            ? (p.value / r.history.get(baseDate).value) * 100
            : null
          : p.value,
    })),
  }));
  // Retain the selected group's aggregate; official ratios are explicitly a simple mean.
  const banks = [
    ...new Set(
      state.peerBanks.map((b) =>
        state.entity.endsWith("_foreign") && b === "bcp" ? "bcp_foreign" : b,
      ),
    ),
  ].filter((b) => !b.startsWith("system"));
  let group = null;
  if (banks.length) {
    const histories = banks.map((b) =>
      peerHistory(financial, sources, b, state.peerMetric, state.date),
    );
    const h = new Map();
    for (const date of allDates) {
      const observations = histories.map((h) => h.get(date));
      let value = null;
      if (observations.every((p) => finite(p?.value) && !p.warning)) {
        if (["npl", "coverage"].includes(state.peerMetric)) {
          const bs =
            financial.periods
              .find((p) => p.date === date)
              ?.peers.filter((b) => banks.includes(b.slug)) || [];
          const n = state.peerMetric === "npl" ? "overdue" : "provisions",
            d = state.peerMetric === "npl" ? "gross_credits" : "overdue";
          if (
            bs.length === banks.length &&
            bs.every((b) => finite(b[n]) && finite(b[d]))
          )
            value = ratio(
              bs.reduce((s, b) => s + b[n], 0),
              bs.reduce((s, b) => s + b[d], 0),
            );
        } else
          value =
            observations.reduce((s, p) => s + p.value, 0) /
            (peerReportCode(state.peerMetric) ? banks.length : 1);
      }
      h.set(date, { date, value });
    }
    group = summarize(
      h,
      { bank: "group", metric: state.peerMetric },
      dates,
      state.date,
    );
    group.name = `Grupo elegido · ${peerReportCode(state.peerMetric) ? "media simple" : "agregado"}`;
  }
  return {
    rows,
    group,
    chartSeries,
    unit,
    mode,
    mixed,
    baseDate,
    dates,
    colors,
  };
}
