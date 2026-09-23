import {finite,ratio,shift} from './analytics.js';
export const SBS_GLOSSARY='https://www.sbs.gob.pe/app/web_doc/Paginas/documentos.aspx?cod=SF-0002';
export const RETURN_HELP='Utilidad neta 12M = resultado neto YTD actual + diciembre anterior − mismo mes del año anterior. Se divide entre el promedio simple de los 12 cierres mensuales, incluido el actual, × 100. Metodología SBS; requiere todas las observaciones.';
export const MORA_HELP='Mora real (CAR + castigos) = (atrasados + refinanciados y reestructurados + castigos de los últimos 12 meses) / (créditos brutos + castigos de los últimos 12 meses) × 100. Castigos: suma de 12 flujos mensuales B-2369. No incluye transferencias de cartera: es distinta de la CAR ajustada publicada en B-2401.';
export const ADJUSTED_NPL_HELP='(Créditos atrasados + castigos 12M) / (créditos brutos + castigos 12M) × 100. No incorpora refinanciados, reestructurados ni transferencias de cartera.';
const total=xs=>xs.every(finite)?xs.reduce((a,b)=>a+b,0):null;
export function trailingValue(get,date){
 const current=get(date);if(date.endsWith('-12'))return finite(current)?current:null;
 const dec=get(`${Number(date.slice(0,4))-1}-12`),prior=get(shift(date,-12));
 return [current,dec,prior].every(finite)?current+dec-prior:null;
}
export function returnOnAverage(getIncome,getBalance,date){
 const values=Array.from({length:12},(_,i)=>getBalance(shift(date,-i)));
 const mean=values.every(finite)?total(values)/12:null,income=trailingValue(getIncome,date);
 return {value:mean>0?ratio(income,mean):null,income,mean};
}
export function writeoffMonths(report,entity,date){
 const id=report?.catalog.find(r=>r.label==='Castigos del mes')?.id;
 const periods=new Map((report?.periods||[]).map(p=>[p.date,p]));
 return Array.from({length:12},(_,i)=>{
  const d=shift(date,-i),p=periods.get(d),value=(p?.peers?.[entity]||(entity==='banbif'?p?.values:null))?.[id];
  return {date:d,value:finite(value)&&(!p?.peer_effective?.[entity]?.[id]||p.peer_effective[entity][id]===d)?value:null,source:p?.source_url,id};
 });
}
export function writeoffs12m(report,entity,date){const value=total(writeoffMonths(report,entity,date).map(p=>p.value));return finite(value)&&value>=0?value:null;}
export function sbsRatios(financial,writeoffs,entity='banbif'){
 const byDate=new Map(financial.periods.map(p=>[p.date,p]));
 const val=(d,id)=>byDate.get(d)?.values[id]?.[2];
 return new Map(financial.periods.map(p=>{
  const d=p.date,v=id=>val(d,id),casts=writeoffs12m(writeoffs,entity,d),gross=total([26,37,38].map(n=>v(`balance:${n}`)));
  const mora=(includeRefi)=>[casts,gross,v('balance:38'),...(includeRefi?[v('balance:37')]:[])].every(finite)&&gross+casts>0?ratio(v('balance:38')+(includeRefi?v('balance:37'):0)+casts,gross+casts):null;
  return [d,{roae:returnOnAverage(d=>val(d,'income:79'),d=>val(d,'balance:126'),d).value,roaa:returnOnAverage(d=>val(d,'income:79'),d=>val(d,'balance:59'),d).value,mora_real:mora(true),npl_writeoffs:mora(false),writeoffs_12m:casts}];
 }));
}
export function withLocalIndicators(report,financial,entity,writeoffs,extraSources={}){
 if(report.code!=='B-2401')return report;
 const ratios=sbsRatios(financial,writeoffs,entity),byDate=new Map(financial.periods.map(p=>[p.date,p]));
 const labels={mora_real:'Mora real · CAR + castigos 12M',npl_writeoffs:'Morosidad con castigos 12M',writeoffs_12m:'Castigos acumulados · 12M'};
 const added=Object.entries(labels).map(([k,label])=>({id:'calc:'+k,label,unit:k==='writeoffs_12m'?'PEN_THOUSAND':'PERCENT',kind:k==='writeoffs_12m'?'flow':'ratio'}));
 return {...report,coverage_note:entity==='system'?'B-2401 publica el agregado con sucursales del exterior. Aquí se reconstruyen los ratios locales disponibles con B-2201 y se incorporan capital y liquidez de sus reportes específicos con su fecha declarada. — indica que faltan componentes del ámbito local.':report.coverage_note,catalog:[...report.catalog,...added],periods:report.periods.map(p=>{
  const values={...p.values},effective={...p.effective},calculated={},sources={},origins={};const f=byDate.get(p.date),v=(n,c=2)=>f?.values[`balance:${n}`]?.[c],inc=n=>f?.values[`income:${n}`]?.[2],calc=ratios.get(p.date)||{};
  if(entity==='system'){
   const gross=c=>total([26,37,38].map(n=>v(n,c)));
   const fill={c2fc8dfb2b1132c2:calc.roae,'52d6369b3061959f':calc.roaa,a029459723d42a58:ratio(v(38),gross(2)),'4d1cb4c16ba14c0b':ratio(v(37),gross(2)),c4bb861de8d83a0c:ratio(v(38,0),gross(0)),d1f2cab909da52c4:ratio(v(38,1),gross(1)),'7887c3bba94ba715':ratio(finite(v(41))?Math.abs(v(41)):null,v(38)),'287cc0002861c71f':total([v(127),v(129)])>0&&finite(v(124))?v(124)/total([v(127),v(129)]):null};
   const expenses=total([56,70,71].map(inc)),margin=[inc(34),inc(40),inc(46)].every(finite)?inc(34)+inc(40)-inc(46):null;
   fill['54e5c9a00989a033']=ratio(expenses,margin);
   for(const r of report.catalog)if(!finite(values[r.id])){values[r.id]=finite(fill[r.id])?fill[r.id]:null;effective[r.id]=p.date;if(finite(values[r.id])){calculated[r.id]='Calculado con B-2201 · ámbito local';sources[r.id]=f?.source_url;}}
   for(const [target,code,sourceId] of [['b352bb3dd997b9fc','B-2402','b352bb3dd997b9fc'],['37473705943c6830','B-2340','868f609caf5bd530'],['96727b1e01ff7fff','B-2340','7f34ed7b17330a2f']]){
    const q=extraSources[code]?.periods.filter(q=>q.date<=p.date).at(-1),value=q?.peers?.[entity]?.[sourceId];
    if(!finite(values[target])&&finite(value)){values[target]=value;effective[target]=q.peer_effective?.[entity]?.[sourceId]||q.effective[sourceId]||q.date;sources[target]=q.source_url;origins[target]='SBS '+code;}
   }
  }
  for(const [key]of Object.entries(labels)){
   const id='calc:'+key;values[id]=calc[key]??null;effective[id]=p.date;calculated[id]=key==='mora_real'?MORA_HELP:key==='npl_writeoffs'?ADJUSTED_NPL_HELP:'Suma de doce flujos mensuales publicados en B-2369. Cada mes se usa una vez.';sources[id]=[f?.source_url,...writeoffMonths(writeoffs,entity,p.date).map(m=>m.source)].filter(Boolean).join(' ; ');
  }
  const keys=Object.fromEntries(Object.entries(p.keys).map(([k,m])=>[k,{...m,value:values[m.id]??null,date:effective[m.id]||m.date}]));
  return {...p,values,effective,keys,calculated,calculation_sources:sources,origins};
 })};
}
