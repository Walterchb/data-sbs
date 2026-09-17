import {formatResult} from './calculator-engine.js';
import {tableNumber} from './report-assets.js';
export async function buildReportPdf(report, lib, fonts) {
  const {PDFDocument, StandardFonts, rgb} = lib;
  const doc = await PDFDocument.create();
  if (fonts) doc.registerFontkit(fonts.kit);
  const font = await doc.embedFont(fonts?.normal || StandardFonts.Helvetica,{subset:true});
  const bold = await doc.embedFont(fonts?.bold || StandardFonts.HelveticaBold,{subset:true});
  doc.setTitle(report.title); doc.setSubject('Informe financiero · cálculos y evidencia');
  const W=841.89,H=595.28,M=44,U=W-M*2;
  const navy=rgb(.035,.11,.19), blue=rgb(.05,.36,.55), gray=rgb(.38,.44,.49), pale=rgb(.94,.96,.975), white=rgb(1,1,1), ink=rgb(.08,.14,.19), line=rgb(.83,.88,.91);
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
    section=title.replace(/(?: · continuación)+$/,''); page=doc.addPage([W,H]); y=H-40;
    draw('TREASURY HUB  /  INFORME FINANCIERO',M,y,8,bold,gray);
    draw(date,W-M-60,y,8,font,gray); y-=38;
    for(const l of lines(title,22,bold)){draw(l,M,y,22,bold,navy);y-=27;}
    page.drawLine({start:{x:M,y:y+9},end:{x:M+44,y:y+9},thickness:2,color:blue});y-=15;
  }
  function room(h){if(y-h<52)newPage(section+' · continuación');}
  function para(text,size=11,color=ink,f=font){for(const l of lines(text,size,f)){room(size+6);draw(l,M,y,size,f,color);y-=size+6;}y-=5;}
  function grid(headers,rows,widths) {
    const top=()=>{
      const h=Math.max(...headers.map((v,i)=>lines(v,9,bold,widths[i]-16).length))*13+16;
      room(h+30); page.drawRectangle({x:M,y:y-h+7,width:U,height:h,color:navy});
      let x=M; headers.forEach((v,i)=>{lines(v,9,bold,widths[i]-16).forEach((l,j)=>draw(l,x+8,y-7-j*13,9,bold,white));x+=widths[i];});y-=h;
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
        if(n%2===0)page.drawRectangle({x:M,y:y-h+7,width:U,height:h,color:pale});
        let x=M; wrapped.forEach((ls,i)=>{ls.slice(offset,offset+count).forEach((l,j)=>draw(l,/^[+-]?[\d,.]+\s?%?$/.test(String(cells[i]).trim()) ? x+widths[i]-8-font.widthOfTextAtSize(l,9) : x+8,y-5-j*13,9,font));x+=widths[i];});
        y-=h; offset+=count;
        if(offset<total){newPage();top();}
      }
    });y-=14;
  }
  // Cover: editorial hierarchy with an original side motif, never a copied logo.
  page=doc.addPage([W,H]);page.drawRectangle({x:0,y:0,width:W,height:H,color:navy});
  page.drawRectangle({x:W-170,y:0,width:170,height:H,color:rgb(.045,.16,.25)});
  for(let i=0;i<5;i++)page.drawLine({start:{x:W-150+i*26,y:90},end:{x:W-150+i*26,y:180+i*56},thickness:2,color:rgb(.15,.34,.44)});
  draw('TREASURY HUB',M,H-55,12,bold,white);draw('INFORME FINANCIERO',M,H-81,9,font,rgb(.59,.75,.83));
  y=H-190;
  let coverSize=30; while(coverSize>24 && lines(report.title,coverSize,bold,580).length>4)coverSize-=2;
  for(const l of lines(report.title,coverSize,bold,580)){draw(l,M,y,coverSize,bold,white);y-=coverSize+8;}
  y-=12;page.drawLine({start:{x:M,y},end:{x:M+66,y},thickness:4,color:rgb(.28,.72,.8)});y-=32;
  for(const l of lines(report.subtitle||'Análisis financiero',14,font,565)){draw(l,M,y,14,font,rgb(.75,.84,.89));y-=20;}
  draw('FECHA DE REVISIÓN',M,95,8,bold,rgb(.59,.75,.83));draw(date,M,72,13,font,white);
  if(report.author){draw('PREPARADO POR',260,95,8,bold,rgb(.59,.75,.83)); lines(report.author,11,font,365).slice(0,2).forEach((l,i)=>draw(l,260,72-i*14,11,font,white));}
  if(report.items.length || report.conclusion) {
    newPage('Resumen de resultados');
    if(report.items.length)grid(['Indicador / cálculo','Resultado','Unidad'],report.items.map(i=>[i.name,formatResult(i.value,i.unit==='percent'?'percent':'number'),{number:'Número',percent:'Porcentaje',times:'Veces',money:'S/ miles'}[i.unit]]),[U-285,180,105]);
    for(const [i,item] of report.items.entries()) if(item.note){room(55);para(`${i+1}. ${item.name}`,12,navy,bold);para(item.note);}
    if(report.conclusion){room(60);para('Conclusión',14,navy,bold);para(report.conclusion);}
  }
  const imageCache=new Map();
  for(const [i,a] of (report.attachments||[]).entries()) {
    if(a.kind==='chart') {
      newPage(`Gráfico ${String(i+1).padStart(2,'0')}`);
      if(!imageCache.has(a.id))imageCache.set(a.id,await doc.embedPng(await a.png.arrayBuffer()));
      const img=imageCache.get(a.id), scale=Math.min(U/img.width,(y-92)/img.height);
      page.drawImage(img,{x:M+(U-img.width*scale)/2,y:y-img.height*scale,width:img.width*scale,height:img.height*scale});
      y-=img.height*scale+20;para(a.title,10,navy,bold);
      // Source is already baked into the chart, avoid duplicating long captions.
    } else {
      const batch=a.rows.every(r=>r.slice(1).every(v=>String(v||'').length<=20))?7:4;
      const groups=[];for(let c=1;c<a.headers.length;c+=batch)groups.push([0,...Array.from({length:Math.min(batch,a.headers.length-c)},(_,n)=>c+n)]);
      if(!groups.length)groups.push([0]);
      for(const [g,indices] of groups.entries()){
        newPage(a.title+(groups.length>1?` · ${g+1}/${groups.length}`:''));
        para(a.context||'',9,gray);
        const weights=indices.map((c,i)=>{
          const values=a.rows.map(r=>String(r[c]||''));
          const numeric=c>0 && values.every(v=>tableNumber(v)||!v||/^[—–-]$/.test(v));
          return numeric?76:Math.min(320,Math.max(i===0?140:85,Math.max(String(a.headers[c]).length,...values.map(v=>v.length))*4.4));
        });
        const sum=weights.reduce((a,b)=>a+b,0), widths=weights.map(w=>w/sum*U);
        grid(indices.map(c=>a.headers[c]),a.rows.map(r=>indices.map(c=>{const n=c>0?tableNumber(r[c]):null;return n?formatResult(n.value,n.percent?'percent':'number'):r[c]||'';})),widths);
      }
    }
  }
  // Supporting detail is intentionally separated from the executive results.
  const sources=new Map();
  report.items.forEach((item,i)=>{
    newPage(`Anexo ${i+1} · Cálculo y datos`);
    para(item.name,17,navy,bold);
    para(`Resultado: ${formatResult(item.value,item.unit)}`,16,blue,bold);
    para(`Fórmula: ${item.expression}`,11,gray);
    para('Cuentas monetarias en S/ miles. Valores de origen con precisión completa en Excel.',9,gray);
    grid(['Variable','Cuenta / referencia','Valor','Entidad · cierre · columna'],Object.entries(item.variables).map(([key,v])=>{
      if(v.source&&!sources.has(v.source))sources.set(v.source,sources.size+1);
      const ref=v.source?` [${sources.get(v.source)}]`:'';
      const close=v.date?new Date(Date.UTC(Number(v.date.slice(0,4)),Number(v.date.slice(5,7)),0)).toLocaleDateString('es-PE',{timeZone:'UTC',day:'2-digit',month:'2-digit',year:'numeric'}):'';
      return [key,`${v.path?.join(' / ')||v.label}${v.reference?' · '+v.reference:''}${ref}`,formatResult(v.value),v.kind==='constant'?'Constante definida por el usuario':`${v.entityName}\n${close} · ${['MN','ME','Total'][Number(v.currency)]}\n${v.kind==='ytd'?'Acumulado YTD':'Saldo de cierre'}`];
    }),[62,310,135,U-507]);
  });
  if(sources.size){room(100);para('Fuentes',14,navy,bold);para('Referencias de las cuentas utilizadas. Los números remiten al anexo de cada cálculo.',10,gray);for(const [url,n] of sources){room(45);para(`[${n}] ${url}`,9,blue);}}
  const pages=doc.getPages();pages.forEach((p,i)=>{if(i===0)return;p.drawLine({start:{x:M,y:34},end:{x:W-M,y:34},thickness:.5,color:line});p.drawText('Treasury Hub · '+safe(report.title).slice(0,95),{x:M,y:20,size:8,font,color:gray});p.drawText(`${i+1} / ${pages.length}`,{x:W-M-40,y:20,size:8,font,color:gray});});
  return doc.save();
}
