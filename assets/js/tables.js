import { escape, format, num, month } from "./format.js";
import {
  finite,
  growth,
  difference,
  ratio,
  shift,
  months,
  treeOrder,
  filterTree,
} from "./analytics.js";
import { spark } from "./charts.js";
export const wrapTable = (html, label = "Tabla de análisis", bounded = false) =>
  `<div class="table-wrap ${bounded ? "bounded" : ""}" tabindex="0" role="region" aria-label="${escape(label)}">${html}</div>`;
export function accountTable(data, state) {
  const current = data.periods.find((p) => p.date === state.date),
    previous = data.periods.find((p) => p.date === shift(state.date, -1)),
    year = data.periods.find((p) => p.date === shift(state.date, -12));
  let catalog = data.catalog.filter(
    (r) => r.statement === state.statement && r.group !== "Control",
  );
  catalog = filterTree(treeOrder(catalog), state.query, state.collapsed);
  if (state.mainOnly) catalog = catalog.filter((r) => r.depth <= 1);
  if (state.sort === "impact")
    catalog.sort(
      (a, b) =>
        Math.abs(
          difference(current?.values[b.id]?.[2], previous?.values[b.id]?.[2]) ??
            0,
        ) -
        Math.abs(
          difference(current?.values[a.id]?.[2], previous?.values[a.id]?.[2]) ??
            0,
        ),
    );
  if (state.sort === "value")
    catalog.sort(
      (a, b) =>
        (current?.values[b.id]?.[2] ?? -Infinity) -
        (current?.values[a.id]?.[2] ?? -Infinity),
    );
  if (!catalog.length)
    return {
      html: '<div class="empty">No hay coincidencias. Prueba el nombre del rubro o su referencia de fila.</div>',
      rows: [],
    };
  const history = state.tableView !== "snapshot";
  const dates =
    state.tableView === "annual"
      ? Array.from(
          { length: 5 },
          (_, i) =>
            `${Number(state.date.slice(0, 4)) - 4 + i}-${state.date.slice(5)}`,
        )
      : months(state.date, 12);
  const annualIncome = state.statement === "income";
  let head = history
    ? dates.map((d) => `<th class="number">${month(d)}</th>`).join("")
    : `<th class="number">MN · S/ MM</th><th class="number">ME · S/ MM</th><th class="number">Total · S/ MM</th><th class="number">${annualIncome ? "Δ YTD YoY" : "Δ mes · S/ MM"}</th><th class="number">${annualIncome ? "YTD YoY" : "MoM"}</th><th class="number">${annualIncome ? "" : "YoY"}</th><th class="number">% padre</th><th>Tendencia 12M</th>`;
  const rows = catalog.map((r) => {
    const v = current?.values[r.id] || [],
      prev = previous?.values[r.id]?.[2],
      lastyear = year?.values[r.id]?.[2],
      parent = current?.values[r.parent]?.[2];
    const hasChildren = data.catalog.some((c) => c.parent === r.id),
      delta = difference(v[2], annualIncome ? lastyear : prev);
    const rowClass =
      r.id === state.account
        ? "selected"
        : r.depth === 0 && r.statement === "balance"
          ? "root"
          : hasChildren
            ? "parent"
            : "";
    const title = `${r.path.join(" › ")} · ${r.reference}`;
    const cell = `<td><div class="account-label" style="--depth:${state.sort === "hierarchy" ? r.depth : 0}">${hasChildren && state.sort === "hierarchy" ? `<button class="tree-toggle" data-collapse="${r.id}" aria-expanded="${!state.collapsed.has(r.id)}" aria-label="${escape((state.collapsed.has(r.id) ? "Expandir " : "Contraer ") + r.label)}">${state.collapsed.has(r.id) ? "▸" : "▾"}</button>` : '<span class="tree-spacer"></span>'}<div class="row-title"><button class="text-button" data-account="${r.id}" title="${escape(title)}">${escape(r.label)}</button><small>${escape(state.query || state.sort !== "hierarchy" ? r.path.slice(0, -1).join(" › ") : r.reference)}</small></div></div></td>`;
    const vals = history
      ? dates
          .map(
            (d) =>
              `<td class="number">${num((data.periods.find((p) => p.date === d)?.values[r.id]?.[2] ?? NaN) / 1000)}</td>`,
          )
          .join("")
      : `<td class="number">${num(finite(v[0]) ? v[0] / 1000 : null)}</td><td class="number">${num(finite(v[1]) ? v[1] / 1000 : null)}</td><td class="number"><b>${num(finite(v[2]) ? v[2] / 1000 : null)}</b></td><td class="number">${num(delta === null ? null : delta / 1000)}</td><td class="number">${format(growth(v[2], annualIncome ? lastyear : prev), "PERCENT", true)}</td><td class="number">${annualIncome ? "—" : format(growth(v[2], lastyear), "PERCENT", true)}</td><td class="number">${format(ratio(v[2], parent), "PERCENT")}</td><td>${spark(months(state.date, 12).map((d) => data.periods.find((p) => p.date === d)?.values[r.id]?.[2] ?? null))}</td>`;
    return {
      html: `<tr class="${rowClass}">${cell}${vals}</tr>`,
      export: [
        state.date,
        r.reference,
        r.path.join(" > "),
        ...(history
          ? dates.map(
              (d) =>
                data.periods.find((p) => p.date === d)?.values[r.id]?.[2] ??
                null,
            )
          : [
              ...v,
              delta,
              growth(v[2], annualIncome ? lastyear : prev),
              growth(v[2], lastyear),
              ratio(v[2], parent),
            ]),
      ],
    };
  });
  return {
    html: wrapTable(
      `<table class="account-table ${history ? "history-table" : ""}"><thead><tr><th>Rubro SBS ${history ? "· importes en S/ MM" : ""}</th>${head}</tr></thead><tbody>${rows.map((r) => r.html).join("")}</tbody></table>`,
      "Cuentas SBS; desplazamiento horizontal para más columnas",
      true,
    ),
    rows: [
      [
        "periodo",
        "referencia",
        "ruta",
        ...(history
          ? dates
          : [
              "MN_miles_PEN",
              "ME_miles_PEN",
              "total_miles_PEN",
              "delta_miles_PEN",
              "var_pct",
              "yoy_pct",
              "participacion_padre_pct",
            ]),
      ],
      ...rows.map((r) => r.export),
    ],
  };
}
