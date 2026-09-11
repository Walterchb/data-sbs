import { shift, growth, ratio } from "./analytics.js";
export const STRUCTURE_REPORTS = ["B-2334", "B-2344"];
export const CREDIT_GROUPS = [
  "Corporativos",
  "Grandes empresas",
  "Medianas empresas",
  "Pequeñas empresas",
  "Microempresas",
  "Consumo",
  "Consumo revolvente",
  "Consumo no revolvente",
  "Hipotecarios",
];
const BUSINESS = CREDIT_GROUPS.slice(0, 5);
export function structureModel(report, state) {
  const credit = report.code === "B-2334";
  const status = credit ? state.structureStatus : "Total";
  const period = report.periods.filter((p) => p.date <= state.date).at(-1);
  const ids = Object.fromEntries(report.catalog.map((m) => [m.label, m.id]));
  const label = (name) =>
    name === "Total"
      ? credit && status !== "Total"
        ? `Total · ${status}`
        : "Total"
      : `${name} · ${credit ? status : "Monto"}`;
  const value = (p, name) => p?.values[ids[label(name)]];
  const isBusiness = (name) => credit && BUSINESS.includes(name);
  const comparable = (name, a, b) =>
    !isBusiness(name) || a < "2024-10" === b < "2024-10";
  const dates = period
    ? {
        mom: shift(period.date, -1),
        ytd: `${Number(period.date.slice(0, 4)) - 1}-12`,
        yoy: shift(period.date, -12),
      }
    : {};
  const changes = (name) =>
    Object.fromEntries(
      Object.entries(dates).map(([mode, date]) => [
        mode,
        comparable(name, period.date, date)
          ? growth(
              value(period, name),
              value(
                report.periods.find((p) => p.date === date),
                name,
              ),
            )
          : null,
      ]),
    );
  const names = credit
    ? CREDIT_GROUPS
    : ["Vista", "Ahorro", "Plazo", "Restringidos", "Sistema financiero"];
  const total = value(period, "Total");
  const rows = names.map((name) => ({
    name,
    value: value(period, name),
    share: credit
      ? ratio(value(period, name), total)
      : period?.values[ids[`${name} · Participación`]],
    changes: changes(name),
    child: name.startsWith("Consumo "),
  }));
  const selected = ["Total", ...names].includes(state.structureMetric)
    ? state.structureMetric
    : "Total";
  const points = report.periods
    .filter((p) => p.date <= state.date)
    .map((p) => ({ date: p.date, value: value(p, selected) }));
  return {
    credit,
    status,
    period,
    total,
    rows,
    selected,
    points,
    changes: period ? changes("Total") : {},
    business: isBusiness(selected),
    warning: period?.peer_warnings?.[state.entity],
  };
}
