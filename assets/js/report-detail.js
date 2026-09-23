import {RETURN_HELP,MORA_HELP,ADJUSTED_NPL_HELP} from './sbs-ratios.js';
import { norm, finite, shift, ratio } from "./analytics.js";
export const REPORT_NAMES = {
  "B-2401": "Indicadores",
  "B-2369": "Castigos",
  "B-2336": "Sectores",
  "B-2402": "Capital",
  "B-2340": "Liquidez",
  "B-230809": "RCL",
  "B-234021": "RFNE",
  "B-2368": "Posición ME",
  "B-2334": "Estructura · Créditos",
  "B-2344": "Estructura · Depósitos",
  "B-2349": "Concentración · Créditos",
  "B-2350": "Concentración · Depósitos",
};
export function metricLabel(row) {
  if (/Utilidad Neta Anualizada \/ Patrimonio Promedio/i.test(row.label))
    return `${row.label} · ROAE (ROE)`;
  if (/Utilidad Neta Anualizada \/ Activo Promedio/i.test(row.label))
    return `${row.label} · ROAA (ROA)`;
  return row.label;
}
export function metricGroup(code, row) {
  const s = norm(row.label);
  if(row.id.startsWith("calc:")&&/mora|morosidad|castigos/.test(s))return "Calidad de activos";
  if (code === "B-2401") {
    if (/capital|pasivo total/.test(s)) return "Solvencia";
    if (/provisiones/.test(s)) return "Cobertura";
    if (/creditos atrasados|refinanciados|cartera/.test(s))
      return "Calidad de activos";
    if (/utilidad neta/.test(s)) return "Rentabilidad";
    if (/liquidez|caja y bancos/.test(s)) return "Liquidez";
    return "Eficiencia y gestión";
  }
  if (code === "B-230809") {
    if (row.unit === "PERCENT") return "Ratio de cobertura de liquidez";
    if (s.startsWith("total ")) return "Totales regulatorios";
    if (s.startsWith("alac")) return "Activos líquidos de alta calidad (ALAC)";
    if (/^(fondos disponibles|creditos|otros flujos entrantes)/.test(s))
      return "Flujos entrantes a 30 días";
    if (/contingentes|lineas de credito no utilizadas/.test(s))
      return "Obligaciones contingentes";
    return "Flujos salientes a 30 días";
  }
  if (code === "B-234021") {
    if (row.unit === "PERCENT") return "Ratio de financiación neta estable";
    if (s.startsWith("total ")) return "Totales regulatorios";
    return s.startsWith("financiacion estable disponible")
      ? "Financiación estable disponible"
      : "Financiación estable requerida";
  }
  return "";
}
const groupOrder = [
  "Solvencia",
  "Calidad de activos",
  "Cobertura",
  "Rentabilidad",
  "Eficiencia y gestión",
  "Liquidez",
  "Ratio de cobertura de liquidez",
  "Ratio de financiación neta estable",
  "Totales regulatorios",
  "Activos líquidos de alta calidad (ALAC)",
  "Flujos entrantes a 30 días",
  "Flujos salientes a 30 días",
  "Obligaciones contingentes",
  "Financiación estable disponible",
  "Financiación estable requerida",
];
function sourceMetricHelp(code, row) {
  const label = metricLabel(row),
    s = norm(row.label);
  if(row.id==="calc:mora_real")return MORA_HELP;
  if(row.id==="calc:npl_writeoffs")return ADJUSTED_NPL_HELP;
  if(row.id==="calc:writeoffs_12m")return "Suma de 12 flujos mensuales de castigos B-2369. Un castigo retira del balance un crédito provisionado; no elimina la deuda del cliente.";
  let help = `${label}. Fuente SBS ${code}. `;
  if(code === "B-2369")return help+"Flujo mensual de créditos castigados del Reporte 25 SBS, en S/ miles. No es el saldo acumulado de cuentas de orden. Puede contener ajustes negativos publicados; se conservan al sumar doce meses.";
  if (code === "B-2334")
    return (
      help +
      "Saldo por tipo y situación de crédito. Las agrupaciones empresariales cambian desde octubre de 2024; la vista conserva la advertencia de comparabilidad."
    );
  if (code === "B-2344")
    return (
      help +
      "SBS publica participaciones por componente y un total monetario. El monto por componente se calcula como total × participación / 100."
    );
  if (row.id.startsWith("calc:capital-"))
    return (
      help +
      "TIER 1 = APR × ratio Nivel 1 / 100; patrimonio efectivo = APR × RCG / 100; TIER 2 = patrimonio efectivo − TIER 1. Las participaciones dividen cada nivel entre el patrimonio efectivo × 100. Se requiere la misma fecha y entidad para todos los insumos."
    );
  if (code === "B-2336")
    return (
      help +
      "Créditos empresariales del sector. Participación = saldo / TOTAL CRÉDITOS A ACTIVIDADES EMPRESARIALES × 100, de la misma entidad y fecha. El total no cambia al filtrar sectores."
    );
  if (code === "B-230809")
    return (
      help +
      (row.unit === "PERCENT"
        ? "RCL: activos líquidos admisibles / salidas netas de efectivo a 30 días × 100. El dato publicado es el promedio de ratios diarios del trimestre; no se obtiene dividiendo los saldos promedio."
        : "Promedio diario del trimestre. Base: importe antes de ponderaciones regulatorias; ajustado: después de aplicar ponderaciones. MN y total en soles; ME en dólares. Los subtotales no se suman con sus componentes.")
    );
  if (code === "B-234021")
    return (
      help +
      (row.unit === "PERCENT"
        ? "Financiación estable disponible / financiación estable requerida × 100. Mide cobertura de financiación a un horizonte de un año."
        : "Disponible: recursos estables de financiación. Requerida: financiación necesaria para activos y contingentes. Se conservan los tramos de vencimiento y la ponderación de SBS; no sumar totales y componentes.")
    );
  if (/utilidad neta anualizada/.test(s))
    return (
      help +
      RETURN_HELP
    );
  if (/ajustada/.test(s))
    return (
      help +
      "SBS incorpora el flujo anual de castigos y transferencias de cartera en numerador y denominador. La CAR ajustada también incluye refinanciados. No equivale a mora real calculada únicamente con castigos B-2369."
    );
  if (/capital global/.test(s))
    return (
      help +
      "Patrimonio efectivo / activos y contingentes ponderados por riesgo × 100. El patrimonio efectivo es regulatorio, distinto del patrimonio contable."
    );
  if (/liquidez/.test(s))
    return (
      help +
      "Indicador regulatorio publicado por SBS; usa los promedios y la moneda indicados, no los saldos contables de cierre."
    );
  if (row.label.includes("/"))
    return (
      help +
      "Cociente entre el numerador y el denominador indicados" +
      (row.unit === "PERCENT" ? " × 100." : ".") +
      " Se respeta la anualización, moneda y periodo de la fuente."
    );
  return (
    help +
    (row.unit === "PERCENT"
      ? "Porcentaje publicado; variaciones en puntos básicos (100 pb = 1 punto porcentual)."
      : "Importe o magnitud de la fuente, con su unidad y periodo declarado.")
  );
}
export function reportRows(data, p, query = "") {
  const code = data.code;
  const full = data.catalog.filter((r) => Object.hasOwn(p.values, r.id));
  const totalRow = full.find(
    (r) => norm(r.label) === "total creditos a actividades empresariales",
  );
  const total = totalRow ? p.values[totalRow.id] : null;
  const available = data.periods
    .filter((q) => q.date <= p.date)
    .slice()
    .reverse();
  const tokens = norm(query).split(" ").filter(Boolean);
  return full
    .map((r, index) => {
      const date = p.effective?.[r.id];
      function base(wanted) {
        if (p.warning || (code === "B-230809" && date !== p.date)) return null;
        const q = available.find(
          (q) =>
            q.effective?.[r.id] === wanted &&
            !q.warning &&
            (code !== "B-230809" || q.date === wanted),
        );
        return q?.values[r.id] ?? null;
      }
      return {
        r: { ...r, label: metricLabel(r) },
        index,
        date,
        group: metricGroup(code, r),
        help: metricHelp(code, r)+(p.calculated?.[r.id]?" "+p.calculated[r.id]:"")+(p.values[r.id]===null?" Sin componentes suficientes para este ámbito; no se sustituye por el total con exterior.":""),
        prior: date ? base(shift(date, -1)) : null,
        quarter: date ? base(shift(date, -3)) : null,
        year: date ? base(shift(date, -12)) : null,
        yearStart: date ? base(`${Number(date.slice(0, 4)) - 1}-12`) : null,
        share:
          total > 0 && p.effective?.[totalRow.id] === date
            ? ratio(p.values[r.id], total)
            : null,
      };
    })
    .filter(({ r, group }) =>
      tokens.every((t) => norm(r.label + " " + group).includes(t)),
    )
    .sort((a, b) =>
      code === "B-2336"
        ? (finite(b.share) ? b.share : -Infinity) -
            (finite(a.share) ? a.share : -Infinity) || a.index - b.index
        : groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group) ||
          a.index - b.index,
    );
}

export function metricHelp(code, row) {
  const group = metricGroup(code, row);
  const theory = {
    Solvencia:
      "La solvencia refleja la capacidad de absorber pérdidas con capital; distingue capital contable y regulatorio.",
    "Calidad de activos":
      "Estos indicadores muestran la exposición a problemas de pago. Una proporción más alta suele señalar mayor riesgo de deterioro; revisa también cobertura y evolución.",
    Cobertura:
      "Mide el respaldo de provisiones frente a la cartera problemática. 100% significa una unidad provisionada por cada unidad del denominador; no representa una garantía de recuperación.",
    Rentabilidad:
      "Mide el beneficio generado en relación con los recursos utilizados. ROE se refiere al patrimonio y ROA al activo; son porcentajes anualizados, no el rendimiento del mes.",
    "Eficiencia y gestión":
      "Relaciona costos, ingresos y recursos del banco. En ratios de gasto sobre margen, una menor proporción indica menos gasto por unidad de margen; en productividad, la lectura depende del denominador.",
    Liquidez:
      "Describe la capacidad para atender obligaciones de corto plazo. Importa la moneda y el horizonte, además del porcentaje.",
  };
  return (
    sourceMetricHelp(code, row) + (theory[group] ? " " + theory[group] : "")
  );
}
