import {finite,growth,shift,norm} from './analytics.js';
export function guaranteeModel(data,date,selected,query=''){
 const periods=(data?.periods||[]).filter(p=>p.date<=date),p=periods.at(-1),catalog=data?.catalog||[];
 const total=catalog.find(r=>r.label==='Total créditos directos');
 const amount=(period,r)=>{
  const t=period?.values[total?.id],v=period?.values[r?.id];
  return finite(t)&&finite(v)?r.id===total.id?v:t*v/100:null;
 };
 const ordered=[total,catalog.find(r=>r.label==='Garantías preferidas · Total'),...catalog.filter(r=>r.id!==total?.id&&r.label!=='Garantías preferidas · Total')].filter(Boolean);
 const tokens=norm(query).split(' ').filter(Boolean);
 const rows=ordered.map(r=>({r,value:amount(p,r),share:r.id===total.id?(p?.values[r.id]>0?100:null):p?.values[r.id]??null,
  child:r.label.startsWith('Garantías preferidas · ')&&!r.label.endsWith(' · Total'),
  mom:growth(amount(p,r),amount(periods.find(q=>q.date===shift(p?.date||date,-1)),r)),
  ytd:growth(amount(p,r),amount(periods.find(q=>q.date===`${Number((p?.date||date).slice(0,4))-1}-12`),r)),
  yoy:growth(amount(p,r),amount(periods.find(q=>q.date===shift(p?.date||date,-12)),r)),
 }));
 const metric=catalog.find(r=>r.id===selected)||total;
 return {period:p,total:amount(p,total),metric,rows:rows.filter(({r})=>tokens.every(t=>norm(r.label).includes(t))),
  anomaly:rows.some(r=>finite(r.share)&&(r.share<0||r.share>100)),
  points:periods.map(q=>({date:q.date,effective:q.effective?.[metric?.id],value:q.values[metric?.id]??null})),
 };
}
