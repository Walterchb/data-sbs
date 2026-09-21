import {captureCalculation, variableName} from './calculator-engine.js';
import {shift} from './analytics.js';
export const REPORT_PRESETS = [
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
 const variables={},keys=new Map(),periods=new Map(ctx.financial.periods.map(p=>[p.date,p]));
 const ref=(row,d=date)=>{
  const token=`${row}|${d}`;if(keys.has(token))return keys.get(token);
  const r=ctx.financial.catalog.find(r=>r.id===row),p=periods.get(d),value=p?.values[row]?.[Number(currency)];
  if(!r||!Number.isFinite(value))throw Error(`Falta ${r?.label||row} en ${d} para esta entidad y columna.`);
  const key=variableName(keys.size);keys.set(token,key);
  variables[key]={id:row,reference:r.reference,label:r.label,path:r.path,kind:r.kind,date:d,currency,entity:ctx.entity,entityName:ctx.entityName,source:p.source_url,value};return key;
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
