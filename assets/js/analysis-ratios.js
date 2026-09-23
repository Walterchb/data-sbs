import {sbsRatios,RETURN_HELP,MORA_HELP,ADJUSTED_NPL_HELP} from './sbs-ratios.js';
import { finite, shift, ratio } from "./analytics.js";
export const RATIO_GROUPS = {
  "Calidad de activos": ["npl", "refi_ratio", "car", "mora_real", "npl_writeoffs", "writeoffs_12m"],
  "Cobertura y costo de riesgo": [
    "coverage",
    "coverage_car",
    "provisions_direct",
    "credit_cost_12m",
  ],
  "Liquidez y fondeo": ["loan_deposit", "available_public"],
  "Solvencia contable": ["leverage", "liab_cap_res", "equity_assets"],
  "Rentabilidad y márgenes": ["roae", "roaa",
    "gross_fin_margin",
    "net_fin_margin",
    "operating_margin",
    "net_margin",
  ],
  Eficiencia: ["admin_eff", "admin_gross_margin", "admin_eff_12m"],
};
export const RATIO_HELP = {
  roae: RETURN_HELP, roaa: RETURN_HELP, mora_real:MORA_HELP, npl_writeoffs:ADJUSTED_NPL_HELP, writeoffs_12m:"Suma de los doce flujos mensuales de B-2369. Importes en S/ miles. Requiere los 12 meses completos; un dato ausente no se considera cero.",
  npl: "Cartera atrasada (vencidos + cobranza judicial) / créditos brutos × 100.",
  refi_ratio:
    "Créditos refinanciados y reestructurados / créditos brutos × 100.",
  car: "(Cartera atrasada + refinanciados y reestructurados) / créditos brutos × 100. CAR significa cartera de alto riesgo.",
  coverage:
    "Saldo de provisiones de créditos, en valor absoluto / cartera atrasada × 100.",
  coverage_car:
    "Saldo de provisiones de créditos, en valor absoluto / (atrasados + refinanciados y reestructurados) × 100.",
  provisions_direct:
    "Saldo de provisiones de créditos, en valor absoluto / créditos brutos × 100.",
  loan_deposit:
    "Créditos brutos / depósitos × 100. Depósitos = vista + ahorro + plazo + restringidos + depósitos del sistema financiero; excluye otras obligaciones.",
  available_public:
    "Disponible / obligaciones con el público × 100. Es una relación contable de cierre, no el ratio regulatorio de liquidez ni el RCL.",
  leverage:
    "Pasivo total / patrimonio contable, en veces. No usa patrimonio efectivo regulatorio.",
  liab_cap_res: "Pasivo total / (capital social + reservas), en veces.",
  net_fin_margin:
    "Margen financiero neto YTD / ingresos financieros YTD × 100.",
  operating_margin:
    "Margen operacional neto YTD / (ingresos financieros + ingresos por servicios financieros) YTD × 100.",
  net_margin:
    "Resultado neto del ejercicio YTD / ingresos financieros YTD × 100.",
  admin_eff:
    "Gastos administrativos YTD / (ingresos financieros + ingresos por servicios financieros) YTD × 100.",
  admin_gross_margin:
    "Gastos administrativos YTD / margen financiero bruto YTD × 100.",
  credit_cost_12m:
    "Gasto de provisiones para créditos directos de los últimos 12 meses / promedio de créditos brutos de los 13 cierres mensuales que delimitan esos 12 meses × 100. Medida analítica; no equivale al saldo de provisiones ni a una definición de clasificadora.",
  admin_eff_12m:
    "Gastos administrativos 12M / (ingresos financieros 12M + ingresos por servicios financieros 12M) × 100. B-2201 publica ingresos financieros, no una serie separada de ingresos por intereses: no se presenta como la fórmula específica de una clasificadora.",
  equity_assets:
    "Patrimonio contable / activos totales × 100. Capitalización contable; no es CET1 ni capital global.",
  gross_fin_margin:
    "Margen financiero bruto YTD / ingresos financieros YTD × 100.",
};
const ratioReading={
 roae:'Lectura: utilidad anual por cada 100 de patrimonio contable promedio. Relaciona Resultados → Resultado neto con Balance → Patrimonio; no mide el rendimiento de la acción.',
 roaa:'Lectura: utilidad anual por cada 100 de activos promedio. Relaciona Resultados → Resultado neto con Balance → Total activo; permite comparar rentabilidad relativa al tamaño.',
 npl:'Lectura: cartera ya vencida o judicial por cada 100 prestados. Un castigo puede reducir el saldo atrasado sin que exista recuperación de efectivo. Base: calidad de activos SBS.',
 refi_ratio:'Lectura: peso de créditos refinanciados o reestructurados. Una modificación por problemas de pago no significa que la deuda haya desaparecido.',
 car:'Lectura: combina mora y operaciones refinanciadas/reestructuradas. CAR no es cartera pesada: esta última usa categorías de riesgo del deudor.',
 mora_real:'Lectura: añade créditos retirados del balance durante doce meses para que una reducción por castigos no se interprete automáticamente como mejor cobranza. Cálculo analítico con fuentes SBS.',
 npl_writeoffs:'Lectura: añade castigos a la morosidad de balance. Puede diferir de la mora real que también incluye refinanciados. Cálculo analítico con fuentes SBS.',
 writeoffs_12m:'Lectura: mide cartera retirada del balance durante doce meses. Un castigo contable no implica que el banco haya cobrado la deuda.',
 coverage:'Lectura: 100% significa 1 provisionado por cada 1 atrasado. Es protección contable, no efectivo reservado ni garantía de recuperación.',
 coverage_car:'Lectura: extiende la cobertura a la cartera refinanciada y reestructurada. No es comparable directamente con cobertura solo de atrasados.',
 provisions_direct:'Lectura: porción del crédito bruto reconocida como provisión. Se utiliza el saldo de balance, no el gasto acumulado de resultados.',
 loan_deposit:'Lectura: 110% significa 110 de crédito por cada 100 de depósitos. Sugiere uso de otras fuentes de fondeo; por sí solo no determina un incumplimiento de liquidez.',
 available_public:'Lectura: muestra cuántos recursos disponibles hay frente a obligaciones con el público al cierre. Parte del disponible puede tener restricciones.',
 leverage:'Lectura: 8 veces significa 8 de pasivo por cada 1 de patrimonio contable. Mayor apalancamiento amplifica el efecto de ganancias y pérdidas sobre los accionistas.',
 liab_cap_res:'Lectura: usa solo capital social y reservas, una base distinta del patrimonio completo. Por eso puede diferir del apalancamiento Pasivo/Patrimonio.',
 gross_fin_margin:'Lectura: proporción del ingreso financiero que queda después del gasto financiero, antes de provisiones.',
 net_fin_margin:'Lectura: proporción que queda después del gasto financiero y provisiones de créditos directos; aún faltan administración e impuestos.',
 operating_margin:'Lectura: proporción que queda después de gastos administrativos sobre la base de ingresos indicada. Es una medida de la herramienta, no el ratio oficial de eficiencia SBS.',
 net_margin:'Lectura: utilidad final por cada 100 de ingresos financieros. No equivale a ROAE ni ROAA, que usan patrimonio o activo como denominador.',
 admin_eff:'Lectura: peso de administración sobre ingresos financieros y servicios. Menor suele significar menor gasto relativo, pero no incluye todos los costos operativos del indicador SBS.',
 admin_gross_margin:'Lectura: parte del margen financiero bruto absorbida por administración. Una base pequeña o negativa impide una interpretación porcentual útil.',
 admin_eff_12m:'Lectura: compara doce meses completos para reducir la dependencia del mes de corte. Es una medida analítica, distinta de Gastos de operación/Margen financiero total SBS.',
 equity_assets:'Lectura: capital contable por cada 100 de activos, sin ponderar riesgo. No sustituye los ratios regulatorios de solvencia.',
 credit_cost_12m:'Lectura: costo anual por provisiones respecto a la cartera bruta promedio. Un aumento puede reflejar deterioro o cambios en cobertura; requiere contexto.',
};
for(const [key,text] of Object.entries(ratioReading))RATIO_HELP[key]+='\n\n'+text;

export const EXTRA_RATIOS = {
  roae:{label:"ROAE · metodología SBS",unit:"PERCENT"},roaa:{label:"ROAA · metodología SBS",unit:"PERCENT"},mora_real:{label:"Mora real · CAR + castigos 12M",unit:"PERCENT"},npl_writeoffs:{label:"Morosidad con castigos 12M",unit:"PERCENT"},writeoffs_12m:{label:"Castigos acumulados · 12M",unit:"PEN_THOUSAND"},
  credit_cost_12m: {
    label: "Costo de riesgo crediticio · 12M",
    unit: "PERCENT",
  },
  admin_eff_12m: {
    label: "Gastos administrativos / ingresos financieros y servicios · 12M",
    unit: "PERCENT",
  },
  equity_assets: { label: "Patrimonio / activos", unit: "PERCENT" },
  gross_fin_margin: {
    label: "Margen financiero bruto / ingresos financieros YTD",
    unit: "PERCENT",
  },
};
const sum = (values) =>
  values.every(finite) ? values.reduce((a, b) => a + b, 0) : null;
export function trailingIncome(periods, id, date) {
  const byDate = new Map(periods.map((p) => [p.date, p]));
  const get = (d) => byDate.get(d)?.values[id]?.[2];
  const current = get(date);
  if (date.endsWith("-12")) return finite(current) ? current : null;
  const december = get(`${Number(date.slice(0, 4)) - 1}-12`),
    prior = get(shift(date, -12));
  return [current, december, prior].every(finite)
    ? current + december - prior
    : null;
}
export function withAnalysisRatios(overview, financial, writeoffs, entity="banbif") {
  const sbs=sbsRatios(financial,writeoffs,entity);
  const byDate = new Map(financial.periods.map((p) => [p.date, p]));
  const gross = (d) =>
    sum([26, 37, 38].map((n) => byDate.get(d)?.values[`balance:${n}`]?.[2]));
  return {
    ...overview,
    periods: overview.periods.map((p) => {
      const f = byDate.get(p.date),
        v = (id) => f?.values[id]?.[2];
      const averages = Array.from({ length: 13 }, (_, i) =>
        gross(shift(p.date, -i)),
      );
      const mean = averages.every(finite) ? sum(averages) / 13 : null;
      const calc = {
        ...sbs.get(p.date),
        credit_cost_12m:
          mean > 0
            ? ratio(
                trailingIncome(financial.periods, "income:36", p.date),
                mean,
              )
            : null,
        admin_eff_12m: ratio(
          trailingIncome(financial.periods, "income:56", p.date),
          sum(
            ["income:9", "income:40"].map((id) =>
              trailingIncome(financial.periods, id, p.date),
            ),
          ),
        ),
        equity_assets: ratio(v("balance:126"), v("balance:59")),
        gross_fin_margin: ratio(v("income:34"), v("income:9")),
      };
      return {
        ...p,
        metrics: {
          ...p.metrics,
          ...Object.fromEntries([["roe","roae"],["roa","roaa"]].filter(([key])=>!finite(p.metrics[key]?.value)).map(([key,computed])=>[key,{value:sbs.get(p.date)?.[computed]??null,date:p.date,source:"B-2201 · calculado SBS"}])),
          ...Object.fromEntries(
            Object.entries(calc).map(([key, value]) => [
              key,
              { value, date: p.date, source: ["mora_real","npl_writeoffs","writeoffs_12m"].includes(key)?"B-2201 + B-2369":"B-2201" },
            ]),
          ),
        },
      };
    }),
  };
}
