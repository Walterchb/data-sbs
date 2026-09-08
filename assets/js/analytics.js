export const finite = (v) => typeof v === "number" && Number.isFinite(v);
export const norm = (v) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
export function shift(month, delta) {
  const [y, m] = month.split("-").map(Number),
    i = y * 12 + m - 1 + delta;
  return `${Math.floor(i / 12)}-${String((((i % 12) + 12) % 12) + 1).padStart(2, "0")}`;
}
export function months(end, count) {
  return Array.from({ length: count }, (_, i) => shift(end, i - count + 1));
}
export const growth = (a, b) =>
  finite(a) && finite(b) && b > 0 ? ((a - b) / b) * 100 : null;
export const difference = (a, b) => (finite(a) && finite(b) ? a - b : null);
export const ratio = (a, b) =>
  finite(a) && finite(b) && b !== 0 ? (a / b) * 100 : null;
export function compare(a, b, unit = "PEN_THOUSAND") {
  return unit === "PERCENT"
    ? { value: finite(a) && finite(b) ? (a - b) * 100 : null, unit: "BP" }
    : unit === "TIMES"
      ? { value: difference(a, b), unit: "TIMES" }
      : { value: growth(a, b), unit: "PERCENT" };
}
export function metricAt(overview, key, wanted) {
  // Match the actual observation date. A prior file is never an exact comparator.
  for (const p of overview.periods) {
    const m = p.metrics[key];
    if (m?.date === wanted) return m.value;
  }
  return null;
}
export function monthlyFlow(periods, id, date) {
  const current = periods.find((p) => p.date === date)?.values[id]?.[2];
  if (!finite(current)) return null;
  if (date.endsWith("-01")) return current;
  const previous = periods.find((p) => p.date === shift(date, -1))?.values[
    id
  ]?.[2];
  return difference(current, previous);
}
export function movementRows(data, date, mode, config) {
  const current = data.periods.find((p) => p.date === date);
  const reference =
    mode === "yoy"
      ? shift(date, -12)
      : mode === "ytd"
        ? `${Number(date.slice(0, 4)) - 1}-12`
        : shift(date, -1);
  const previous = data.periods.find((p) => p.date === reference);
  if (!current || !previous) return { reference, rows: [], available: false };
  const assets = current.values["balance:59"]?.[2];
  const rows = data.catalog
    .filter(
      (r) =>
        r.statement === "balance" &&
        r.depth === 1 &&
        r.group !== "Contingentes",
    )
    .map((r) => {
      const a = current.values[r.id]?.[2],
        b = previous.values[r.id]?.[2],
        delta = difference(a, b),
        pct = growth(a, b);
      const parent = current.values[r.parent]?.[2],
        oldParent = previous.values[r.parent]?.[2];
      return {
        ...r,
        a,
        b,
        delta,
        pct,
        share: ratio(a, parent),
        shareChange: difference(ratio(a, parent), ratio(b, oldParent)),
        reference,
      };
    })
    .filter(
      (r) =>
        finite(r.delta) &&
        Math.abs(r.delta) >= config.minimum_change_pen_thousand &&
        (ratio(Math.max(Math.abs(r.a), Math.abs(r.b)), assets) ?? 0) >=
          config.minimum_balance_share_pct &&
        ((r.pct !== null &&
          Math.abs(r.pct) >= config.minimum_relative_change_pct) ||
          Math.abs(r.delta) >= config.large_change_pen_thousand),
    );
  return { reference, rows, available: true };
}
export function filterTree(catalog, query, collapsed = new Set()) {
  const tokens = norm(query).split(" ").filter(Boolean),
    byId = new Map(catalog.map((r) => [r.id, r]));
  let selected = new Set();
  if (tokens.length) {
    for (const r of catalog)
      if (
        tokens.every((t) =>
          norm([...r.path, r.code || "", r.reference].join(" ")).includes(t),
        )
      ) {
        selected.add(r.id);
        let parent = r.parent;
        while (parent && byId.has(parent)) {
          selected.add(parent);
          parent = byId.get(parent).parent;
        }
      }
  }
  return catalog.filter((r) => {
    if (tokens.length) return selected.has(r.id);
    let parent = r.parent;
    while (parent && byId.has(parent)) {
      if (collapsed.has(parent)) return false;
      parent = byId.get(parent).parent;
    }
    return true;
  });
}
export function treeOrder(catalog) {
  const out = [],
    children = new Map();
  for (const r of catalog) {
    const p = r.parent || "";
    if (!children.has(p)) children.set(p, []);
    children.get(p).push(r);
  }
  const visit = (r) => {
    out.push(r);
    for (const c of children.get(r.id) || []) visit(c);
  };
  for (const root of children.get("") || []) visit(root);
  return out;
}
export function stats(points, unit) {
  const p = points.filter((p) => finite(p.value));
  if (!p.length) return null;
  const first = p[0],
    last = p.at(-1),
    span =
      (Number(last.date.slice(0, 4)) - Number(first.date.slice(0, 4))) * 12 +
      Number(last.date.slice(5)) -
      Number(first.date.slice(5));
  const min = p.reduce((a, b) => (a.value < b.value ? a : b)),
    max = p.reduce((a, b) => (a.value > b.value ? a : b));
  return {
    min,
    max,
    last,
    count: p.length,
    cagr:
      unit === "PEN_THOUSAND" && span >= 24 && first.value > 0 && last.value > 0
        ? ((last.value / first.value) ** (12 / span) - 1) * 100
        : null,
  };
}
