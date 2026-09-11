import { finite, shift, growth, difference, ratio } from "./analytics.js";

// Exact month bases: missing observations and zero bases are never imputed.
export function compositionData(financial, date, parent, mode = "mom") {
  const bases = {
    mom: shift(date, -1),
    ytd: `${Number(date.slice(0, 4)) - 1}-12`,
    yoy: shift(date, -12),
  };
  const current = financial.periods.find((p) => p.date === date);
  const previous = Object.fromEntries(
    Object.entries(bases).map(([key, date]) => [
      key,
      financial.periods.find((p) => p.date === date),
    ]),
  );
  const at = (period, id) => period?.values[id]?.[2];
  const total = at(current, parent);
  const changes = (id) =>
    Object.fromEntries(
      Object.entries(previous).map(([key, p]) => [
        key,
        growth(at(current, id), at(p, id)),
      ]),
    );
  const rows = financial.catalog
    .filter((r) => r.parent === parent)
    .map((r) => ({
      id: r.id,
      label: r.label,
      value: at(current, r.id),
      share: ratio(at(current, r.id), total),
      changes: changes(r.id),
      delta: difference(at(current, r.id), at(previous[mode], r.id)),
    }))
    .filter(
      (r) =>
        finite(r.value) &&
        (r.value !== 0 || Object.values(r.changes).some(v => finite(v) && v !== 0)),
    )
    .sort(
      (a, b) =>
        (b.delta ?? -Infinity) - (a.delta ?? -Infinity) || b.value - a.value,
    );
  return {
    total,
    changes: changes(parent),
    rows,
    reference: bases[mode],
    max: Math.max(0, ...rows.map((r) => Math.abs(r.delta ?? 0))),
  };
}
