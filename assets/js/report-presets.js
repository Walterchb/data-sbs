import {CAPITAL_INPUTS} from './capital.js';
import {sourceReference} from './report-reference.js';
import {captureCalculation, variableName} from './calculator-engine.js';
import {shift} from './analytics.js';
export const REPORT_PRESETS = [
 ['capital_apr','APR total','Capital'],['capital_rcg','Ratio de capital global','Capital'],['capital_cet1','Capital ordinario nivel 1 / APR','Capital'],['capital_tier1_ratio','TIER 1 / APR','Capital'],['capital_total','Patrimonio efectivo total · calculado','Capital'],['capital_tier1','TIER 1 · calculado','Capital'],['capital_tier2','TIER 2 · calculado','Capital'],['capital_tier1_share','TIER 1 / patrimonio efectivo','Capital'],
 ['npl','Morosidad de créditos','Calidad de activos'],['car','Cartera de alto riesgo (CAR)','Calidad de activos'],['refi_ratio','Refinanciados / créditos brutos','Calidad de activos'],
 ['coverage','Cobertura de cartera atrasada','Cobertura'],['coverage_car','Cobertura de CAR','Cobertura'],['provisions_direct','Provisiones / créditos brutos','Cobertura'],['credit_cost_12m','Costo de riesgo crediticio · 12M','Cobertura'],
 ['loan_deposit','Créditos / depósitos','Liquidez y fondeo'],['available_public','Disponible / obligaciones con el público','Liquidez y fondeo'],
 ['equity_assets','Patrimonio / activos','Solvencia contable'],['leverage','Pasivo / patrimonio','Solvencia contable'],
 ['gross_fin_margin','Margen financiero bruto / ingresos YTD','Rentabilidad'],['net_fin_margin','Margen financiero neto / ingresos YTD','Rentabilidad'],['net_margin','Utilidad / ingresos financieros YTD','Rentabilidad'],
 ['roa_analytic','ROA analítico · 12M / 13 cierres','Rentabilidad'],['roe_analytic','ROE analítico · 12M / 13 cierres','Rentabilidad'],
 ['admin_eff','Gastos administrativos / ingresos YTD','Eficiencia'],['admin_gross_margin','Gastos administrativos / margen bruto YTD','Eficiencia']
].map(([id,name,group])=>({id,name,group}));
export function buildPreset(id, ctx, date, currency='2') {
 const spec=REPORT_PRESETS.find(p=>p.id===id);if(!spec)throw Error('Selecciona un cálculo.');
 if(id.startsWith('capital_'))return buildCapitalPreset(spec,ctx,date,currency);
 const variables={},keys=new Map(),periods=new Map(ctx.financial.periods.map(p=>[p.date,p]));
 const ref=(row,d=date)=>{
  const token=`${row}|${d}`;if(keys.has(token))return keys.get(token);
  const r=ctx.financial.catalog.find(r=>r.id===row),p=periods.get(d),value=p?.values[row]?.[Number(currency)];
  if(!r||!Number.isFinite(value))throw Error(`Falta ${r?.label||row} en ${d} para esta entidad y columna.`);
  const key=variableName(keys.size);keys.set(token,key);
  variables[key]={id:row,reference:sourceReference(r),label:r.label,path:r.path,kind:r.kind,date:d,currency,entity:ctx.entity,entityName:ctx.entityName,source:p.source_url,value};return key;
 };
 const b=(n,d)=>ref(`balance:${n}`,d),f=(n,d)=>ref(`income:${n}`,d);
 const sum=arr=>`(${arr.join('+')})`,gross=d=>sum([26,37,38].map(n=>b(n,d))),abs=k=>`(${k}^2)^0.5`;
 const trailing=n=>date.endsWith('-12')?f(n):`(${f(n)}+${f(n,`${Number(date.slice(0,4))-1}-12`)}-${f(n,shift(date,-12))})`;
 let expression,note='',unit='percent';
 switch(id){
  case 'npl':expression=`${b(38)}/${gross()}`;note='Cartera atrasada sobre créditos brutos al cierre.';break;
  case 'car':expression=`${sum([b(38),b(37)])}/${gross()}`;note='Incluye atrasados, refinanciados y reestructurados.';break;
  case 'refi_ratio':expression=`${b(37)}/${gross()}`;break;
  case 'coverage':expression=`${abs(b(41))}/${b(38)}`;note='Usa el saldo de provisiones en valor absoluto, no el gasto del periodo.';break;
  case 'coverage_car':expression=`${abs(b(41))}/${sum([b(38),b(37)])}`;break;
  case 'provisions_direct':expression=`${abs(b(41))}/${gross()}`;break;
  case 'loan_deposit':expression=`${gross()}/${sum([78,79,80,85,90].map(n=>b(n)))}`;note='Depósitos: vista, ahorro, plazo, restringidos y sistema financiero. Excluye otras obligaciones.';break;
  case 'available_public':expression=`${b(9)}/${b(76)}`;note='Relación contable de cierre. No equivale al RCL regulatorio.';break;
  case 'equity_assets':expression=`${b(126)}/${b(59)}`;note='Capitalización contable; no equivale al capital global regulatorio.';break;
  case 'leverage':expression=`${b(124)}/${b(126)}`;unit='times';break;
  case 'gross_fin_margin':expression=`${f(34)}/${f(9)}`;break;
  case 'net_fin_margin':expression=`${f(38)}/${f(9)}`;break;
  case 'net_margin':expression=`${f(79)}/${f(9)}`;break;
  case 'admin_eff':expression=`${f(56)}/${sum([f(9),f(40)])}`;break;
  case 'admin_gross_margin':expression=`${f(56)}/${f(34)}`;break;
  case 'roa_analytic':case 'roe_analytic':{
   const row=id==='roa_analytic'?59:126;
   expression=`${trailing(79)}/(${sum(Array.from({length:13},(_,i)=>b(row,shift(date,-i))))}/13)`;
   note='Medida analítica: utilidad de los últimos 12 meses / promedio de 13 cierres mensuales. No se presenta como el ROA o ROE publicado en B-2401.';break;
  }
  case 'credit_cost_12m':expression=`${trailing(36)}/(${sum(Array.from({length:13},(_,i)=>gross(shift(date,-i))))}/13)`;note='Gasto de provisiones de los últimos 12 meses / promedio de créditos brutos de 13 cierres mensuales. No usa el saldo de provisiones.';break;
 }
 return captureCalculation({name:spec.name,expression,variables,unit,note});
}

function buildCapitalPreset(spec,ctx,date,currency){
 if(currency!=='2')throw Error('Los indicadores de capital se publican para el total. Selecciona Total.');
 const report=ctx.capital,p=report?.periods.find(p=>p.date===date);
 if(!p)throw Error(`No hay capital B-2402 para ${date}. Elige un periodo publicado${report?.periods.length?' (último: '+report.periods.at(-1).date+')':''}.`);
 if(p.warning)throw Error('La fuente de capital tiene una advertencia de periodo. Revisa Indicadores / Capital.');
 const variables={};
 const ref=id=>{const r=report.catalog.find(r=>r.id===id),value=p.values[id];if(!r||!Number.isFinite(value)||p.effective[id]!==date)throw Error('Falta un dato de capital para esta entidad y fecha.');const key=variableName(Object.keys(variables).length);variables[key]={id:'B-2402:'+id,label:r.label,unit:r.unit,kind:r.kind,value,date,entity:ctx.entity,entityName:ctx.entityName,source:p.source_url,reference:'B-2402 · '+r.label};return key;};
 let expression,unit='percent';const apr=()=>ref(CAPITAL_INPUTS.apr),rcg=()=>ref(CAPITAL_INPUTS.rcg),tier=()=>ref(CAPITAL_INPUTS.tier1);
 switch(spec.id){
 case 'capital_apr':expression=apr();unit='money';break;
 case 'capital_rcg':expression=rcg()+'/100';break;
 case 'capital_cet1':expression=ref('d0e5243c470fb4f9')+'/100';break;
 case 'capital_tier1_ratio':expression=tier()+'/100';break;
 case 'capital_total':expression=`${apr()}*${rcg()}/100`;unit='money';break;
 case 'capital_tier1':expression=`${apr()}*${tier()}/100`;unit='money';break;
 case 'capital_tier2':expression=`${apr()}*(${rcg()}-${tier()})/100`;unit='money';break;
 case 'capital_tier1_share':expression=`${tier()}/${rcg()}`;break;
 }
 const a=p.values[CAPITAL_INPUTS.apr],r=p.values[CAPITAL_INPUTS.rcg],t=p.values[CAPITAL_INPUTS.tier1];
 if(a<=0||r<=0||t<0||t>r)throw Error('Las bases de capital no permiten calcular este indicador.');
 return captureCalculation({name:spec.name,expression,variables,unit,note:spec.id.startsWith('capital_tier')&&!spec.id.endsWith('ratio')||spec.id==='capital_total'?'Cálculo a partir de APR y ratios de B-2402. Los porcentajes de la fuente se dividen entre 100; los importes se expresan en S/ miles.':'Dato de capital regulatorio B-2402 para la entidad y el cierre elegidos.'});
}
