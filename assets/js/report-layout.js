export const REPORT_LAYOUTS={single:'1 elemento por página',two:'2 elementos lado a lado',four:'4 elementos · cuadrícula',mixed:'2 gráficos + 2 tablas',manual:'Personalizado · asignar páginas'};
export function contentPages(attachments=[],layout='single') {
 if(layout==='manual'){
  const groups=new Map();
  for(const a of attachments){const n=Number(a.page)||1;if(n<1||n>30||!Number.isInteger(n))throw Error('Las páginas de contenido van de 1 a 30.');if(!groups.has(n))groups.set(n,[]);groups.get(n).push(a);}
  return [...groups].sort((a,b)=>a[0]-b[0]).map(([number,items])=>{if(items.length>4)throw Error(`La página ${number} tiene ${items.length} elementos. Admite hasta 4; mueve alguno a otra página.`);return {number,items};});
 }
 if(layout==='mixed'){
  const charts=attachments.filter(a=>a.kind==='chart'),tables=attachments.filter(a=>a.kind==='table'),pages=[];
  while(charts.length||tables.length){let items=charts.splice(0,2).concat(tables.splice(0,2));if(!charts.length)items.push(...tables.splice(0,4-items.length));else if(!tables.length)items.push(...charts.splice(0,4-items.length));pages.push({number:pages.length+1,items});}return pages;
 }
 const count=layout==='four'?4:layout==='two'?2:1;
 return Array.from({length:Math.ceil(attachments.length/count)},(_,i)=>({number:i+1,items:attachments.slice(i*count,(i+1)*count)}));
}
