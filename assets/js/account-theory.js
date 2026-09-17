const concepts = {
  "balance:9":
    "Recursos de disponibilidad inmediata, como caja y saldos en bancos. Ayudan a atender pagos y retiros; no equivalen por sí solos a los activos líquidos admisibles del RCL.",
  "balance:17":
    "Inversiones después de ajustes y provisiones. Su liquidez y riesgo dependen del instrumento, vencimiento y clasificación contable.",
  "balance:25":
    "Cartera de créditos neta de provisiones y otros ajustes. Para ratios sobre créditos brutos se suman vigentes, refinanciados/reestructurados y atrasados.",
  "balance:26":
    "Créditos que se mantienen en situación vigente. Es una clasificación de pago; no significa que todos tengan el mismo nivel de riesgo.",
  "balance:37":
    "Créditos cuyas condiciones se modificaron por dificultades de pago. Junto con los atrasados forman la cartera de alto riesgo.",
  "balance:38":
    "Créditos vencidos más créditos en cobranza judicial. Se usan como numerador de la morosidad bajo el criterio SBS.",
  "balance:41":
    "Provisiones acumuladas que reducen el valor contable de la cartera. Es un saldo de balance; distinto del gasto por provisiones del periodo.",
  "balance:59":
    "Recursos y derechos del banco: disponible, inversiones, créditos y otros activos. Activo = pasivo + patrimonio.",
  "balance:76":
    "Obligaciones frente al público, incluidos depósitos y otras obligaciones. El total de depósitos excluye otras obligaciones e incorpora depósitos del sistema financiero.",
  "balance:78":
    "Depósitos que pueden retirarse a la vista. Son una fuente de fondeo cuya estabilidad depende del comportamiento de los depositantes.",
  "balance:79":
    "Depósitos de ahorro. Contribuyen al fondeo del banco; su saldo puede variar por retiros y abonos.",
  "balance:80":
    "Depósitos con un plazo pactado. Su costo y vencimiento influyen en el gasto financiero y la gestión de liquidez.",
  "balance:124":
    "Obligaciones del banco con depositantes, financiadores y otros acreedores. Compararlo con el patrimonio permite analizar el apalancamiento contable.",
  "balance:126":
    "Participación residual de los accionistas: activos menos pasivos. No equivale al patrimonio efectivo regulatorio.",
  "balance:127":
    "Aportes de los accionistas y capitalizaciones reconocidas como capital social. Es un componente del patrimonio, no el patrimonio completo.",
  "income:9":
    "Ingresos financieros acumulados del año. Incluyen los conceptos del estado SBS y no deben confundirse automáticamente con ingresos exclusivamente por intereses.",
  "income:20":
    "Costo financiero acumulado, incluido el fondeo y otros conceptos financieros. Su evolución ayuda a entender el margen del negocio.",
  "income:34":
    "Ingresos financieros menos gastos financieros. Mide el margen antes de provisiones de créditos directos.",
  "income:36":
    "Gasto acumulado por provisiones de créditos directos. Afecta el resultado del periodo; no es el saldo de provisiones del balance.",
  "income:38":
    "Margen financiero después de provisiones para créditos directos. Permite observar cuánto margen queda tras ese costo crediticio.",
  "income:56":
    "Gastos administrativos acumulados: personal, servicios y otros conceptos. En relación con ingresos o márgenes ayudan a evaluar eficiencia.",
  "income:62":
    "Margen operacional después de gastos administrativos. Todavía no es la utilidad neta: faltan otros cargos e impuestos.",
  "income:79":
    "Utilidad o pérdida acumulada desde enero. Para el resultado de un mes se resta el acumulado anterior; en enero el acumulado ya corresponde al mes.",
};
export function accountTheory(r) {
  return `${r.path?.join(" › ") || r.label}. ${concepts[r.id] || `Componente de ${r.path?.slice(0, -1).join(" › ") || r.group || "los estados financieros"}. Mantén su jerarquía: sumar un subtotal con sus componentes duplica el importe.`} ${r.kind === "ytd" ? "Resultado acumulado desde enero; compara el mismo mes entre años." : "Saldo al cierre del periodo."} Fuente B-2201; MN y ME están expresadas en soles. La tabla muestra S/ MM.`;
}
