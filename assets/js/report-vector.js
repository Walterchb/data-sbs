import {ensureChartFonts} from './chart-fonts.js';
// Convert saved SVG directly to PDF paths and text. Never rasterize chart data.
export async function vectorPdf(svg, fonts, PDFKit, SVGtoPDF) {
 if(!svg || !svg.includes('<svg'))throw Error('Este gráfico no tiene SVG. Vuelve a guardarlo desde Preparar imagen.');
 const chartFonts=await ensureChartFonts();
 const parsed=new DOMParser().parseFromString(svg,'image/svg+xml');
 if(parsed.querySelector('parsererror'))throw Error('No se pudo leer el SVG del gráfico.');
 const root=document.importNode(parsed.documentElement,true);
 const box=(root.getAttribute('viewBox')||'').split(/[ ,]+/).map(Number);
 const width=Number.parseFloat(root.getAttribute('width'))||box[2],height=Number.parseFloat(root.getAttribute('height'))||box[3];
 if(!(width>0&&height>0))throw Error('El gráfico no tiene dimensiones válidas.');
 if(root.querySelector('image,foreignObject'))throw Error('El gráfico contiene una imagen externa. Guarda una versión con elementos vectoriales.');
 // Only filter effects are composited; chart paths and all text remain vectorial.
 // A transparent shadow tile preserves the saved appearance without rasterizing data.
 for(const node of [...root.querySelectorAll('[filter]')]){
  const layer=root.cloneNode(false);layer.append(...[...root.querySelectorAll(':scope > defs')].map(d=>d.cloneNode(true)),node.cloneNode(true));
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(layer)],{type:'image/svg+xml'}));
  try{
   const img=new Image();await new Promise((ok,bad)=>{img.onload=ok;img.onerror=bad;img.src=url;});
   const factor=Math.min(2,4096/Math.max(width,height)),canvas=document.createElement('canvas');canvas.width=Math.round(width*factor);canvas.height=Math.round(height*factor);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
   const tile=document.createElementNS('http://www.w3.org/2000/svg','image');tile.setAttribute('width',width);tile.setAttribute('height',height);tile.setAttribute('href',canvas.toDataURL('image/png'));node.replaceWith(tile);
  }finally{URL.revokeObjectURL(url);}
 }
 root.querySelectorAll('filter').forEach(n=>n.remove());
 const host=document.createElement('div');host.style.cssText='position:fixed;left:-100000px;top:0;pointer-events:none;';host.append(root);document.body.append(host);
 try {
  // Expand ECharts font shorthands without changing font metrics, then parse the SVG so definitions
  // and paint servers resolve locally, independent of the dashboard DOM.
  root.querySelectorAll("text,tspan").forEach(node=>{const css=getComputedStyle(node);for(const key of ["font-family","font-size","font-weight","font-style","letter-spacing"]){const value=css.getPropertyValue(key);if(value)node.style.setProperty(key,value);}});
  root.querySelectorAll('text').forEach(node=>{
   const weight=parseFloat(node.style.fontWeight);node.style.fontWeight=weight>=600?'700':'400';
   // Preserve the browser's measured baseline, not the converter's font-bbox approximation.
   const before=node.getBBox().y;
   node.style.dominantBaseline='alphabetic';node.style.alignmentBaseline='alphabetic';
   node.setAttribute('dominant-baseline','alphabetic');node.setAttribute('alignment-baseline','alphabetic');
   const shift=before-node.getBBox().y;
   if(Math.abs(shift)>1e-6)node.setAttribute('dy',String((parseFloat(node.getAttribute('dy'))||0)+shift));
  });
  const standalone=new XMLSerializer().serializeToString(root);
  return await new Promise((resolve,reject)=>{
   const doc=new PDFKit({size:[width,height],margin:0,compress:true,autoFirstPage:true});
   const chunks=[];doc.on('data',v=>chunks.push(v));doc.on('error',reject);
   doc.on('end',()=>{const data=new Uint8Array(chunks.reduce((n,c)=>n+c.length,0));let i=0;for(const c of chunks){data.set(c,i);i+=c.length;}resolve(data);});
   for(const f of chartFonts)doc.registerFont(f.family+(f.weight===700?'-Bold':''),new Uint8Array(f.bytes));
   try {
    SVGtoPDF(doc,standalone,0,0,{width,height,assumePt:true,useCSS:false,preserveAspectRatio:'xMidYMid meet',fontCallback:(family,bold,italic)=>{
     const f=chartFonts.find(f=>family.includes(f.family)&&f.weight===(bold?700:400));
     if(!f)throw Error('El gráfico usa una tipografía anterior. Vuelve a guardarlo desde Preparar imagen.');
     return f.family+(bold?'-Bold':'');
    },warningCallback:message=>{if(/could not|can't be rendered|not found/i.test(message))throw Error('No se pudo convertir un elemento del gráfico a PDF vectorial.');}});
    doc.end();
   }catch(error){reject(error);doc.end();}
  });
 }finally{host.remove();}
}
