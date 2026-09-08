const formatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const num = (v) =>
  typeof v === "number" && Number.isFinite(v) ? formatter.format(v) : "—";
export function format(v, unit = "PEN_THOUSAND", signed = false) {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  const sign = signed && v > 0 ? "+" : "";
  if (unit === "PEN_THOUSAND") return `${sign}S/ ${num(v / 1000)} MM`;
  if (unit === "USD_THOUSAND") return `${sign}US$ ${num(v / 1000)} MM`;
  return `${sign}${num(v)}${unit === "PERCENT" ? "%" : unit === "BP" ? " pb" : unit === "TIMES" ? "x" : ""}`;
}
export function month(value, long = false) {
  if (!value) return "Sin dato";
  const [y, m] = value.slice(0, 7).split("-").map(Number);
  const names = long
    ? [
        "enero",
        "febrero",
        "marzo",
        "abril",
        "mayo",
        "junio",
        "julio",
        "agosto",
        "septiembre",
        "octubre",
        "noviembre",
        "diciembre",
      ]
    : [
        "Ene",
        "Feb",
        "Mar",
        "Abr",
        "May",
        "Jun",
        "Jul",
        "Ago",
        "Sep",
        "Oct",
        "Nov",
        "Dic",
      ];
  return `${names[m - 1]} ${y}`;
}
export const units = {
  PEN_THOUSAND: "S/ MM",
  USD_THOUSAND: "US$ MM",
  PERCENT: "%",
  TIMES: "veces",
};
export function csvCell(value) {
  const s = String(value ?? "");
  return (
    '"' +
    (/^[=+@\-\t\r]/.test(s) && typeof value !== "number" ? "'" : "") +
    s.replaceAll('"', '""') +
    '"'
  );
}
