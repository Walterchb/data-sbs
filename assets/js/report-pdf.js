import {sourceReference,sourceColumn} from './report-reference.js';
import {contentPages} from './report-layout.js';
import {formatResult} from './calculator-engine.js';
import {tableNumber,numericColumns} from './report-assets.js';
export async function buildReportPdf(report, lib, fonts) {
  const {PDFDocument, StandardFonts, rgb} = lib;
  const doc = await PDFDocument.create();
  if (fonts) doc.registerFontkit(fonts.kit);
  const font = await doc.embedFont(fonts?.normal || StandardFonts.Helvetica,{subset:true});
  const bold = await doc.embedFont(fonts?.bold || StandardFonts.HelveticaBold,{subset:true});
  doc.setTitle(report.title); doc.setSubject('Informe financiero · cálculos y evidencia');
  const W=841.89,H=595.28,M=44,U=W-M*2;
  const editorial=report.pdfStyle==='editorial',paper=report.pdfStyle==='paper',plain=editorial||paper;
  const navy=plain?rgb(.08,.09,.08):rgb(.035,.11,.19),blue=editorial?rgb(.02,.4,.33):paper?rgb(.2,.2,.2):rgb(.05,.36,.55),gray=rgb(.38,.42,.43),pale=plain?rgb(.93,.93,.90):rgb(.94,.96,.975),white=rgb(1,1,1),ink=rgb(.08,.14,.19),line=plain?rgb(.72,.73,.70):rgb(.83,.88,.91),background=editorial?rgb(.973,.969,.945):white;
  const headerFill=plain?background:navy,headerInk=plain?navy:white;
  const targets=new Map(),indexJobs=[],externalJobs=[],continuations=[],vectorCache=new Map();
  const assets=(report.attachments||[]).map((a,i)=>({...a,ref:`${a.kind==='chart'?'G':'T'}${String((report.attachments||[]).slice(0,i+1).filter(b=>b.kind===a.kind).length).padStart(2,'0')}`}));
  const content=contentPages(assets,report.layout);
  const date=report.reviewDate.split('-').reverse().join('/');
  const safe=t=>String(t??'').replace(/[−–—]/g,'-').replace(/›/g,'/').replace(/Δ/g,'Var.').replace(/→/g,'a').replace(/[^\u0020-\u007e\u00a0-\u00ff\n]/g,' ');
  const lines=(text,size=11,f=font,max=U)=>{
    const out=[];
    for(const p of safe(text).split('\n')) {
      let l='';
      for(const word of p.split(/\s+/)) {
        if(f.widthOfTextAtSize((l?l+' ':'')+word,size)<=max) l+=(l?' ':'')+word;
        else {if(l)out.push(l);l='';for(const ch of word){if(f.widthOfTextAtSize(l+ch,size)>max){out.push(l);l='';}l+=ch;}}
      }
      out.push(l);
    }
    return out;
  };
  let page,y,section='';
  const draw=(text,x,yy,size=11,f=font,color=ink)=>page.drawText(safe(text),{x,y:yy,size,font:f,color});
  function newPage(title=section) {
    section=title.replace(/(?: · continuación)+$/,''); page=doc.addPage([W,H]); page.drawRectangle({x:0,y:0,width:W,height:H,color:background}); y=H-40;
    draw('TREASURY HUB  /  INFORME FINANCIERO',M,y,8,bold,gray);
    draw(date,W-M-60,y,8,font,gray); if(plain)page.drawLine({start:{x:M,y:y-10},end:{x:W-M,y:y-10},thickness:.7,color:navy}); y-=38;
    for(const l of lines(title,22,bold)){draw(l,M,y,22,bold,navy);y-=27;}
    page.drawLine({start:{x:M,y:y+9},end:{x:M+44,y:y+9},thickness:2,color:blue});y-=15;
  }
  function room(h){if(y-h<52)newPage(section+' · continuación');}
  function para(text,size=11,color=ink,f=font){for(const l of lines(text,size,f)){room(size+6);draw(l,M,y,size,f,color);y-=size+6;}y-=5;}
  function grid(headers,rows,widths,numeric=numericColumns(headers,rows)) {
    const top=()=>{
      const h=Math.max(...headers.map((v,i)=>lines(v,10,bold,widths[i]-16).length))*13+16;
      room(h+30); page.drawRectangle({x:M,y:y-h+7,width:U,height:h,color:headerFill});
      if(plain){page.drawLine({start:{x:M,y:y+7},end:{x:W-M,y:y+7},thickness:.7,color:navy});page.drawLine({start:{x:M,y:y-h+7},end:{x:W-M,y:y-h+7},thickness:.6,color:navy});}
      let x=M; headers.forEach((v,i)=>{lines(v,10,bold,widths[i]-16).forEach((l,j)=>draw(l,numeric[i]?x+widths[i]-8-bold.widthOfTextAtSize(l,10):x+8,y-7-j*13,10,bold,headerInk));x+=widths[i];});y-=h;
    };
    top();
    rows.forEach((cells,n)=>{
      const wrapped=cells.map((v,i)=>lines(v,9,font,widths[i]-16));
      let offset=0,total=Math.max(...wrapped.map(a=>a.length));
      // Ordinary rows stay together; split only a row taller than a full page.
      if (total*13+14 <= H-210 && y-total*13-14<52) {newPage();top();}
      while(offset<total){
        if(y-32<52){newPage();top();}
        const count=Math.min(total-offset,Math.max(1,Math.floor((y-70)/13)));
        const h=count*13+14;
        if(!plain&&n%2===0)page.drawRectangle({x:M,y:y-h+7,width:U,height:h,color:pale});
        let x=M; wrapped.forEach((ls,i)=>{ls.slice(offset,offset+count).forEach((l,j)=>draw(l,numeric[i] ? x+widths[i]-8-font.widthOfTextAtSize(l,9) : x+8,y-5-j*13,9,font));x+=widths[i];});
        y-=h; offset+=count;
        if(offset<total){newPage();top();}
      }
    });page.drawLine({start:{x:M,y:y+6},end:{x:W-M,y:y+6},thickness:.5,color:line});y-=14;
  }
  // Cover: editorial hierarchy with an original side motif, never a copied logo.
  page=doc.addPage([W,H]);page.drawRectangle({x:0,y:0,width:W,height:H,color:plain?background:navy});
  const gridInk=plain?line:rgb(.3,.5,.6);
  const fade=(x,y)=>.26*Math.exp(-((x-W*.82)**2/(W*.48)**2+(y-H*.7)**2/(H*.65)**2));
  for(let x=0;x<W;x+=36)for(let yy=0;yy<H;yy+=36)for(const vertical of [true,false])page.drawLine({start:{x,y:yy},end:{x:vertical?x:Math.min(x+36,W),y:vertical?Math.min(yy+36,H):yy},thickness:.5,color:gridInk,opacity:fade(x,yy),dashArray:[3,5]});
  if(!plain)page.drawRectangle({x:W-170,y:0,width:170,height:H,color:rgb(.045,.16,.25)});
  if(!plain)for(let i=0;i<5;i++)page.drawLine({start:{x:W-150+i*26,y:90},end:{x:W-150+i*26,y:180+i*56},thickness:2,color:rgb(.15,.34,.44)});
  draw('TREASURY HUB',M,H-55,12,bold,plain?navy:white);draw('INFORME FINANCIERO',M,H-81,9,font,plain?gray:rgb(.59,.75,.83));
  y=H-190;
  let coverSize=30; while(coverSize>24 && lines(report.title,coverSize,bold,580).length>4)coverSize-=2;
  for(const l of lines(report.title,coverSize,bold,580)){draw(l,M,y,coverSize,bold,plain?navy:white);y-=coverSize+8;}
  y-=12;page.drawLine({start:{x:M,y},end:{x:M+66,y},thickness:4,color:plain?blue:rgb(.28,.72,.8)});y-=32;
  for(const l of lines(report.subtitle||'Análisis financiero',14,font,565)){draw(l,M,y,14,font,plain?gray:rgb(.75,.84,.89));y-=20;}
  draw('FECHA DE REVISIÓN',M,95,8,bold,plain?gray:rgb(.59,.75,.83));draw(date,M,72,13,font,plain?navy:white);
  if(report.author){draw('PREPARADO POR',260,95,8,bold,plain?gray:rgb(.59,.75,.83)); lines(report.author.toLocaleUpperCase('es-PE'),11,font,365).slice(0,2).forEach((l,i)=>draw(l,260,72-i*14,11,font,plain?navy:white));}
  if(report.items.length || report.conclusion || report.tableNote) {
    newPage('Resultados');targets.set('results',doc.getPageCount());
    if(report.items.length)grid(['Indicador / cálculo','Detalle','Resultado'],report.items.map((item,i)=>[`${String(i+1).padStart(2,'0')}. ${item.name}`,item.note||'',formatResult(item.value,item.unit)]),[245,U-385,140],[false,false,true]);
    if(report.tableNote)para(`Nota de tabla: ${report.tableNote}`,9,gray);
    if(report.conclusion){room(60);para('Conclusión',14,navy,bold);para(report.conclusion);}
  }

  async function vectorChart(a,x,top,w,h) {
    if(!fonts?.vector)throw Error('No se pudo cargar el exportador vectorial. Reintenta la descarga.');
    if(!vectorCache.has(a.id)){
      const bytes=await fonts.vector(a.svg);
      const [embedded]=await doc.embedPdf(bytes,[0]);vectorCache.set(a.id,embedded);
    }
    const picture=vectorCache.get(a.id),scale=Math.min(w/picture.width,h/picture.height);
    page.drawPage(picture,{x:x+(w-picture.width*scale)/2,y:top-picture.height*scale,width:picture.width*scale,height:picture.height*scale});
  }
  function compactTable(a,x,top,w,h) {
    const maxCols=w<U-5?4:8,indices=Array.from({length:Math.min(a.headers.length,maxCols)},(_,i)=>i);
    const widths=indices.map((_,i)=>indices.length===1?w:i===0?w*.4:w*.6/(indices.length-1));
    const size=w<U-5?7.8:9,hs=size+1,lh=hs+4,numeric=numericColumns(a.headers,a.rows);
    const heads=indices.map((c,i)=>lines(a.headers[c],hs,bold,widths[i]-12));
    const hh=Math.max(...heads.map(l=>l.length))*lh+12;
    page.drawRectangle({x,y:top-hh+5,width:w,height:hh,color:headerFill});
    if(plain){for(const yy of [top+5,top-hh+5])page.drawLine({start:{x,y:yy},end:{x:x+w,y:yy},thickness:.6,color:navy});}
    let xx=x;heads.forEach((ls,i)=>{ls.forEach((l,j)=>draw(l,numeric[indices[i]]?xx+widths[i]-6-bold.widthOfTextAtSize(l,hs):xx+6,top-5-j*lh,hs,bold,headerInk));xx+=widths[i];});
    let yy=top-hh,count=0;
    for(const row of a.rows){
      const values=indices.map(c=>{const n=c>0?tableNumber(row[c]):null;return n?formatResult(n.value,n.percent?'percent':'number'):row[c]||'';});
      const wrapped=values.map((v,i)=>lines(v,size,font,widths[i]-12));
      const rh=Math.max(...wrapped.map(l=>l.length))*lh+10;
      if(yy-rh<top-h+27)break;
      if(!plain&&count%2===0)page.drawRectangle({x,y:yy-rh+5,width:w,height:rh,color:pale});
      xx=x;wrapped.forEach((ls,i)=>{ls.forEach((l,j)=>draw(l,numeric[indices[i]]?xx+widths[i]-6-font.widthOfTextAtSize(l,size):xx+6,yy-4-j*lh,size,font));xx+=widths[i];});
      yy-=rh;count++;
    }
    page.drawLine({start:{x,y:yy+4},end:{x:x+w,y:yy+4},thickness:.5,color:line});
    if(count<a.rows.length || indices.length<a.headers.length){
      continuations.push(a);const target=`detail-${a.ref}`;
      draw(`Vista parcial · tabla completa en anexo ${a.ref}`,x,Math.min(yy-14,top-h+15),8,font,gray);
      indexJobs.push({page,y:Math.min(yy-14,top-h+15),ref:target,x:x+w-40});
    }
  }
  for(const group of content) {
    newPage(`Contenido ${String(group.number).padStart(2,'0')}`);
    const top=y,cols=group.items.length===1?1:2,rows=group.items.length>2?2:1,gap=22,cw=(U-gap*(cols-1))/cols,ch=(top-58-gap*(rows-1))/rows;
    for(const [i,a]of group.items.entries()){
      const x=M+(i%cols)*(cw+gap),pt=top-Math.floor(i/cols)*(ch+gap);
      targets.set(a.ref,doc.getPageCount());targets.set(`content-${group.number}`,doc.getPageCount());
      const titleLines=lines(`${a.ref} · ${a.title}`,11,bold,cw);
      titleLines.forEach((l,j)=>draw(l,x,pt-j*14,11,bold,navy));
      const chartTop=pt-titleLines.length*14-4,available=ch-titleLines.length*14-6;
      if(a.kind==='chart')await vectorChart(a,x,chartTop,cw,available);
      else compactTable(a,x,chartTop,cw,available);
    }
  }
  // Each calculation keeps its formula and compact inputs together. Source files are listed once.
  const sources=new Map();
  if(report.annexes!==false)for(const [i,item]of report.items.entries()){
    const vars=Object.entries(item.variables),entities=[...new Set(vars.map(([,v])=>v.entityName).filter(Boolean))];
    const sourceId=v=>{if(v.source&&!sources.has(v.source))sources.set(v.source,{n:sources.size+1,date:v.date,code:v.id?.startsWith('B-2402:')?'B-2402':'B-2201'});return v.source?`S${String(sources.get(v.source).n).padStart(2,'0')}`:'';};
    const rows=vars.map(([key,v])=>[key,v.label,formatResult(v.value)+(v.unit==='PERCENT'?'%':''),v.date?new Date(Date.UTC(Number(v.date.slice(0,4)),Number(v.date.slice(5,7)),0)).toLocaleDateString('es-PE',{timeZone:'UTC',day:'2-digit',month:'2-digit',year:'numeric'}):'—',sourceColumn(v),v.kind==='constant'?'Definido por el usuario':`${sourceReference(v).replace('B-2201 · ','').replace('B-2402 · '+v.label,'Métrica B-2402')} · ${sourceId(v)}${entities.length>1?' · '+v.entityName:''}`]);
    const widths=[40,220,110,84,96,U-550];
    const rowHeight=row=>Math.max(...row.map((v,c)=>lines(v,9,font,widths[c]-16).length))*13+14;
    const headHeight=90+lines(item.name,14,bold).length*20+lines(item.expression,10).length*16;
    if(i===0)newPage('Anexo A · Cálculos');else room(Math.min(H-180,headHeight+rows.reduce((h,r)=>h+rowHeight(r),0)));
    targets.set(`A${i+1}`,doc.getPageCount());
    para(`A${String(i+1).padStart(2,'0')} · ${item.name}`,14,navy,bold);
    para(`Resultado: ${formatResult(item.value,item.unit)}     |     Fórmula: ${item.expression}`,10,blue);
    if(entities.length===1)para(entities[0],9,gray);
    grid(['Var.','Cuenta / indicador','Valor','Cierre','Unidad','Referencia'],rows,widths,[false,false,true,false,false,false]);
  }
  for(const a of continuations){
    const batch=7,groups=[];for(let c=1;c<a.headers.length;c+=batch)groups.push([0,...Array.from({length:Math.min(batch,a.headers.length-c)},(_,n)=>c+n)]);if(!groups.length)groups.push([0]);
    for(const [g,indices]of groups.entries()){
      newPage(`Anexo ${a.ref} · ${a.title}${groups.length>1?` · ${g+1}/${groups.length}`:''}`);
      if(g===0)targets.set(`detail-${a.ref}`,doc.getPageCount());
      para(a.context||'',9,gray);
      const weights=indices.map((c,i)=>{const values=a.rows.map(r=>String(r[c]||''));const numeric=c>0&&values.every(v=>tableNumber(v)||!v||/^[—–-]$/.test(v));return numeric?76:Math.min(320,Math.max(i===0?140:85,Math.max(String(a.headers[c]).length,...values.map(v=>v.length))*4.4));});
      const sum=weights.reduce((a,b)=>a+b,0),widths=weights.map(w=>w/sum*U);
      grid(indices.map(c=>a.headers[c]),a.rows.map(r=>indices.map(c=>{const n=c>0?tableNumber(r[c]):null;return n?formatResult(n.value,n.percent?'percent':'number'):r[c]||'';})),widths);
    }
  }
  if(sources.size){newPage('Anexo S · Fuentes');targets.set('sources',doc.getPageCount());para('Archivos oficiales utilizados. Cada referencia abre el archivo de origen.',10,gray);
    for(const [url,s]of sources){room(52);const label=`S${String(s.n).padStart(2,'0')} · ${s.code} · ${s.date}`;draw(label,M,y,11,bold,blue);externalJobs.push({page,x:M,y:y-3,w:U,h:18,url});y-=20;para(url,8,gray);}
  }
  // Insert the index immediately after the cover, then resolve all final page numbers.
  const entries=[...(targets.has('results')?[['results','Resultados']]:[]),...content.flatMap(g=>[[`content-${g.number}`,`Contenido ${String(g.number).padStart(2,'0')}`],...g.items.map(a=>[a.ref,`${a.ref} · ${a.title}`,true])]),...(report.annexes!==false?report.items.map((item,i)=>[`A${i+1}`,`A${String(i+1).padStart(2,'0')} · ${item.name}`]):[]),...continuations.map(a=>[`detail-${a.ref}`,`Anexo ${a.ref} · ${a.title}`]),...(sources.size?[['sources','Anexo S · Fuentes']]:[])];
  const indexGroups=[[]];let used=0;
  for(const entry of entries){const h=lines(entry[1],10,entry[2]?font:bold,U-65).length*14+13;if(used+h>H-180){indexGroups.push([]);used=0;}indexGroups.at(-1).push({entry,h});used+=h;}
  const indexCount=indexGroups.length;
  const link=(p,x,yy,w,h,target)=>p.node.addAnnot(doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Link',Rect:[x,yy,x+w,yy+h],Border:[0,0,0],Dest:[doc.getPage(target-1).ref,lib.PDFName.of('Fit')]})));
  for(const [i,group]of indexGroups.entries()){
    page=doc.insertPage(i+1,[W,H]);page.drawRectangle({x:0,y:0,width:W,height:H,color:background});
    draw('TREASURY HUB  /  INFORME FINANCIERO',M,H-40,8,bold,gray);draw('Índice'+(i?' · continuación':''),M,H-86,24,bold,navy);
    page.drawLine({start:{x:M,y:H-101},end:{x:W-M,y:H-101},thickness:.7,color:navy});y=H-132;
    for(const {entry:[ref,label,child],h}of group){const x=M+(child?12:0),f=child?font:bold;for(const [j,l]of lines(label,10,f,U-65).entries())draw(l,x,y-j*14,10,f,child?gray:navy);indexJobs.push({page,y,ref,x:W-M-35,left:M,height:h});y-=h;}
  }
  for(const job of indexJobs){const before=targets.get(job.ref);if(before){const target=before+indexCount;job.page.drawText(`p. ${target}`,{x:job.x??W-M-35,y:job.y,size:9,font,color:blue});link(job.page,job.left??job.x??W-M-35,job.y-(job.height||14)+12,job.left?U:40,job.height||14,target);}}
  for(const job of externalJobs)job.page.node.addAnnot(doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Link',Rect:[job.x,job.y,job.x+job.w,job.y+job.h],Border:[0,0,0],A:{S:'URI',URI:lib.PDFString.of(job.url)}})));
  const pages=doc.getPages();pages.forEach((p,i)=>{if(i===0)return;p.drawLine({start:{x:M,y:34},end:{x:W-M,y:34},thickness:.5,color:line});p.drawText((i>indexCount?'Volver al índice · ':'Treasury Hub · ')+safe(report.title).slice(0,90),{x:M,y:20,size:8,font,color:gray});if(i>indexCount)link(p,M,15,120,16,2);p.drawText(`${i+1} / ${pages.length}`,{x:W-M-40,y:20,size:8,font,color:gray});});
  return doc.save();
}
