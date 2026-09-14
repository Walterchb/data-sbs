import { finite, growth } from "./analytics.js";

// Exact dates and one bank/series per comparison; never substitute missing values.
export function exportComparisons(spec, comparisons = []) {
  const series = spec.comparison
    ? spec.series
    : [{ name: spec.label, points: spec.points }];
  return comparisons.map((item) => {
    const seriesIndex = Number(item.seriesIndex ?? 0);
    const selected = series[seriesIndex];
    const fromIndex =
      selected?.points.findIndex((p) => p.date === item.from) ?? -1;
    const toIndex = selected?.points.findIndex((p) => p.date === item.to) ?? -1;
    const start = selected?.points[fromIndex],
      end = selected?.points[toIndex];
    let reason = "";
    if (spec.kind === "bar")
      reason = "Las comparaciones de fechas requieren una serie temporal.";
    else if (!selected || fromIndex < 0 || toIndex < 0)
      reason = "Elige dos fechas disponibles en la serie.";
    else if (item.from >= item.to)
      reason = "La fecha final debe ser posterior a la inicial.";
    else if (!finite(start?.value) || !finite(end?.value))
      reason = "No hay datos en ambas fechas.";
    else if ([start, end].some((p) => p.effective && p.effective !== p.date))
      reason = "Uno de los datos corresponde a otro periodo declarado.";
    else if (start.value <= 0)
      reason = "Var % no calculable con base cero o negativa.";
    const percent = reason ? null : growth(end.value, start.value);
    return {
      ...item,
      seriesIndex,
      fromIndex,
      toIndex,
      start,
      end,
      percent,
      reason,
      valid: !reason,
    };
  });
}
