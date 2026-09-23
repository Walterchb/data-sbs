import {norm} from './analytics.js';
import {SBS_GLOSSARY} from './sbs-ratios.js';
export const GUARANTEE_SOURCE='https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=B-2366';
export function metricHelpSource(code,row){if(row?.id?.match(/^calc:(mora_real|npl_writeoffs|writeoffs_12m)$/))code="B-2369";return ['B-2401','B-2402','B-2368','B-2340'].includes(code)?SBS_GLOSSARY:`https://www.sbs.gob.pe/app/stats_net/stats/EstadisticaSistemaFinancieroResultados.aspx?c=${code}`;}
export function guaranteeHelp(label){
 const s=norm(label);let text;
 if(s==='total creditos directos')text='Cartera de créditos directos de esta entidad y ámbito. Es el total financiado que se distribuye entre tipos de respaldo; no es el valor de las garantías.';
 else if(s.includes('autoliquidables'))text='Respaldos que pueden aplicarse directamente al pago de la deuda, como dinero afectado en garantía, cuando cumplen los requisitos SBS. No significa que el crédito ya esté pagado.';
 else if(s.includes('muy rapida'))text='Garantías preferidas con alta facilidad de realización conforme a los requisitos regulatorios. Se busca convertir el respaldo en dinero con rapidez, pero sigue existiendo riesgo de crédito.';
 else if(s.includes('primera hipoteca'))text='Respaldo mediante una hipoteca de primer rango sobre un inmueble. La recuperación depende de su valor y de la ejecución. Puede respaldar crédito empresarial: no equivale solo a préstamos de vivienda.';
 else if(s.includes('otras garantias preferidas'))text='Otros respaldos reconocidos como preferidos que no pertenecen a las tres categorías anteriores. Su reconocimiento exige condiciones de valoración, documentación y posibilidad de realización.';
 else if(s.includes('preferidas')&&s.includes('total'))text='Subtotal de autoliquidables, de muy rápida realización, primera hipoteca y otras preferidas. No sumarlo de nuevo con sus cuatro componentes. “Preferida” es una categoría regulatoria del respaldo, no una calificación del deudor.';
 else if(s.includes('responsabilidad subsidiaria'))text='Créditos en los que existe un obligado adicional que respalda el cumplimiento en las condiciones previstas. Importan su capacidad de pago y la exigibilidad del respaldo; no es garantía de recuperación total.';
 else if(s.includes('arrendamiento'))text='Créditos de leasing, cuyo financiamiento se vincula a un bien. En esta clasificación SBS se presentan separados de las garantías preferidas; no reasignarlos a hipotecas ni sumarlos dos veces.';
 else if(s.includes('no preferidas'))text='Créditos con respaldos que no se clasifican como garantías preferidas. Tener una garantía no significa que cumpla las condiciones regulatorias para recibir ese tratamiento.';
 else text='Créditos clasificados sin garantía en esta distribución SBS. El deudor conserva la obligación de pagar y el banco evalúa su capacidad de pago. No significa necesariamente atraso o mala calidad crediticia.';
 return `${text}\n\nB-2366 publica participación (%). Monto estimado = total de créditos directos × porcentaje / 100; no es una tasación del respaldo. Explicación práctica de las categorías del Anexo 2 SBS.`;
}
export function officialMetricTheory(code,row){
 const s=norm(row.label);
 if(code==='B-2366')return guaranteeHelp(row.label);
 if(code==='B-2340')return 'Ratio de liquidez = promedio mensual de activos líquidos / promedio mensual de pasivos de corto plazo × 100, en la moneda indicada. Relaciona recursos líquidos y obligaciones próximas según criterios SBS; no es saldo de caja / depósitos al cierre ni el RCL a 30 días. Base: Glosario SBS y reporte B-2340.';
 if(code==='B-2401'){
  if(/pasivo total/.test(s))return 'Apalancamiento = pasivo total / (capital social + reservas), en veces. Por ejemplo, 8 veces significa 8 de obligaciones por 1 de ese capital y reservas; no utiliza todo el patrimonio contable. Base: Glosario SBS, solvencia.';
  if(/provisiones.*atrasados/.test(s))return 'Cobertura = provisiones de créditos directos / (vencidos + cobranza judicial) × 100. Usa el saldo de provisiones, no el gasto del año. Un 120% equivale a 1.20 provisionado por cada 1 de cartera atrasada; no asegura el cobro. Base: Glosario SBS, calidad de activos.';
  if(/mas de 90/.test(s))return 'Morosidad a más de 90 días = cartera con ese atraso / créditos directos × 100. El corte es distinto del criterio SBS por tipo de crédito, por lo que ambos ratios pueden diferir. Base: Glosario SBS, calidad de activos.';
  if(/creditos atrasados/.test(s))return 'Morosidad SBS = (vencidos + cobranza judicial) / créditos directos brutos × 100, en la moneda indicada. Un 3% significa que 3 de cada 100 están atrasados. La SBS aplica reglas de vencimiento según el tipo de crédito. Base: Glosario SBS, calidad de activos.';
  if(/refinanciados y reestructurados/.test(s))return 'Refinanciados y reestructurados / créditos directos brutos × 100. Identifica financiamiento con dificultades de pago o reestructuración formal. Sumado a la morosidad permite aproximar CAR cuando coincide ámbito, fecha y denominador. Base: Glosario SBS, calidad de activos.';
  if(/gastos de operacion/.test(s))return 'Eficiencia SBS = (administración + depreciación + amortización) / (margen financiero bruto + ingresos por servicios − gastos por servicios) × 100. Ambas partes acumuladas del año. Un 45% significa que 45 de cada 100 del margen se destinan a estos gastos. Base: Glosario SBS, eficiencia.';
  if(/gastos de administracion.*activo productivo/.test(s))return 'Gastos administrativos de los últimos 12 meses / promedio de activos productivos de 12 cierres × 100. Mide el costo de administrar los activos que generan rendimientos, no todos los activos. Base: Glosario SBS, eficiencia.';
  if(/ingresos financieros.*activo productivo/.test(s))return 'Ingresos financieros de los últimos 12 meses / activo productivo promedio de 12 cierres × 100. Aproxima el rendimiento del conjunto de activos productivos. Incluye conceptos financieros distintos de intereses: no es la tasa cobrada a los préstamos. Base: Glosario SBS, eficiencia.';
  if(/ingresos financieros.*ingresos totales/.test(s))return 'Ingresos financieros / ingresos totales × 100, ambos acumulados del año. El total regulatorio incorpora servicios y el saldo positivo de otras operaciones definido por SBS; no equivale siempre a sumar solo financieros y servicios. Muestra la dependencia del negocio financiero. Base: Glosario SBS, eficiencia.';
  if(/creditos directos.*personal/.test(s))return 'Créditos directos / número de trabajadores. Se publica en miles de soles por trabajador. Describe volumen atendido, no utilidad por empleado; depende del modelo de negocio y del tipo de cartera. Base: Glosario SBS, productividad.';
  if(/depositos.*oficinas/.test(s))return 'Depósitos / número de oficinas. Se publica en miles de soles por oficina. Es una medida de escala comercial, no de rentabilidad; bancos digitales y redes físicas pueden no ser comparables. Base: Glosario SBS, productividad.';
  if(/caja y bancos/.test(s))return 'Caja y bancos / obligaciones a la vista, de la misma moneda, en veces. Relaciona recursos inmediatos con obligaciones exigibles a la vista. No incorpora todos los flujos de caja ni equivale al RCL. Base: Glosario SBS, liquidez.';
  if(/ratio de liquidez/.test(s))return 'Promedio mensual de activos líquidos / promedio mensual de pasivos de corto plazo × 100, en MN o ME según la fila. Mide respaldo líquido del fondeo de corto plazo. No se obtiene de dos saldos de cierre ni equivale al RCL a 30 días. Base: Glosario SBS, liquidez.';
 }
 if(code==='B-2402'&&!row.id.startsWith('calc:')){
  if(s.includes('capital ordinario'))return 'Capital ordinario de nivel 1 (CET1) / APR totales × 100. Relaciona el capital de mayor capacidad de absorción de pérdidas con riesgos ponderados. Es regulatorio y no equivale a capital social / activo. Base: Glosario SBS, patrimonio efectivo.';
  if(s.includes('nivel 1'))return 'Patrimonio efectivo de nivel 1 / APR totales × 100. Nivel 1 = capital ordinario + capital adicional elegible, después de deducciones regulatorias. No todo el patrimonio contable resulta elegible. Base: Glosario SBS, patrimonio efectivo.';
  if(s.includes('requerimiento'))return 'Capital regulatorio exigido para cubrir el riesgo indicado, o la suma cuando dice Total. Es una exigencia, no el capital disponible del banco. Crédito: impago; mercado: precios y tipos de cambio; operacional: procesos, personas, sistemas y eventos externos. Fuente SBS B-2402.';
  if(s.includes('apr')&&!s.includes('ratio'))return 'Activos y contingentes ponderados por riesgo (APR): exposición ajustada por riesgo, no la suma contable de activos. El total incorpora crédito, mercado y operacional; es el denominador del ratio de capital global. Fuente SBS B-2402 y Glosario SBS.';
  if(s.includes('patrimonio efectivo'))return 'Capital regulatorio elegible para absorber pérdidas, después de ajustes y deducciones. Incluye los niveles aplicables al periodo. Puede diferir del patrimonio del balance; se compara con APR para medir solvencia. Base: Glosario SBS.';
 }
 if(code==='B-2368'){
  if(s.includes('global'))return 'Posición global en ME = posición de cambio de balance (a) + posición neta en derivados (b) + delta de opciones (c). Positiva: posición larga; negativa: corta. Mide exposición cambiaria, no utilidad por diferencia de cambio. Base: Glosario SBS, posición global.';
  if(s.includes('delta'))return 'Exposición equivalente de las opciones a movimientos de la moneda, ajustada por su delta (sensibilidad). No es el valor nominal de las opciones ni una utilidad. Se agrega como (c) a la posición global. Base: definición de posición global SBS; explicación de sensibilidad.';
  if(s.includes('derivados'))return 'Posición neta de los contratos derivados en ME, según el reporte. Puede compensar o ampliar la exposición del balance. Se agrega como (b) al calcular la posición global. Base: Glosario SBS, posición global.';
  return 'Activos en moneda extranjera − pasivos en moneda extranjera. Si es positiva, el banco tiene más activos que pasivos en esa moneda. Es (a); deben añadirse derivados y opciones para obtener la exposición global. Base: Glosario SBS, posición de cambio.';
 }
 return null;
}
export function componentTheory(code,row){
 const s=norm(row.label);
 if(code==='B-230809'){
  if(row.unit==='PERCENT')return '';
  if(s.includes('alac'))return 'ALAC son activos líquidos de alta calidad admisibles para enfrentar tensión de liquidez. Los niveles tienen condiciones y recortes diferentes; el saldo contable no es necesariamente el importe computable. ';
  if(s.includes('contingentes')||s.includes('lineas de credito'))return 'Posibles necesidades de efectivo si se ejecutan garantías o los clientes utilizan líneas comprometidas. Un compromiso sin desembolso puede generar una salida futura. ';
  if(/^(fondos disponibles|creditos|otros flujos entrantes|total flujos entrantes)/.test(s))return 'Cobros esperados dentro de 30 días que cumplen las condiciones regulatorias. Las entradas admisibles tienen límites y ponderaciones; no se descuentan todas sin restricción. ';
  if(s.includes('netos'))return 'Necesidad neta de liquidez: salidas esperadas menos entradas admitidas bajo las reglas SBS. Es el denominador del RCL. ';
  return 'Salidas de efectivo consideradas en un escenario regulatorio de tensión a 30 días. Las ponderaciones dependen de estabilidad, contraparte y compromiso. ';
 }
 if(code==='B-234021'&&row.unit!=='PERCENT')return s.includes('disponible')?'Recursos a los que SBS asigna estabilidad según su naturaleza y plazo. El valor ponderado determina cuánto fondeo estable puede reconocerse. ':'Financiación estable exigida para sostener activos y compromisos según liquidez, plazo y riesgo. La ponderación puede exigir más estabilidad a activos de más largo plazo. ';
 if(code==='B-2334'){
  const kind=s.includes('hipotecari')?'Financiamiento para vivienda; no todo crédito con garantía hipotecaria pertenece a este tipo. ':s.includes('consumo')?'Financiamiento de necesidades personales ajenas a la actividad empresarial. Revolvente permite reutilizar el cupo; no revolvente sigue el financiamiento pactado. ':s.includes('total')?'Total de los tipos y situaciones indicados. ':'Crédito empresarial según la clasificación SBS del deudor; no equivale automáticamente a persona jurídica. ';
  return kind+(s.includes('atrasados')?'Situación atrasada: vencidos y cobranza judicial. ':s.includes('refinanciados')?'Incluye operaciones refinanciadas o reestructuradas. ':'');
 }
 if(code==='B-2344')return s.includes('cts')?'CTS: depósitos del beneficio laboral por tiempo de servicios. En B-2344 se muestran separados; en B-2201 forman parte de Plazo. ':s.includes('plazo')?'Depósitos del público a plazo, según el agregado de B-2344. No confundir con los depósitos restringidos que esta fuente separa. ':s.includes('vista')?'Depósitos exigibles a la vista, como cuentas corrientes. ':s.includes('ahorro')?'Fondos depositados en cuentas de ahorro. ':s.includes('restringidos')?'Depósitos del público sujetos a restricciones de disposición, presentados por separado en esta fuente. ':s.includes('sistema financiero')?'Depósitos recibidos de otras entidades financieras y organismos internacionales. Se agregan a los del público para llegar al total. ':s.includes('publico')?'Subtotal del público: vista + ahorro + plazo + restringidos. No sumarlo nuevamente con sus componentes. ':'';
 return '';
}
