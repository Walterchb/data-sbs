// Convert saved SVG directly to PDF paths and text. Never rasterize chart data.
export async function vectorPdf(svg, fonts, PDFKit, SVGtoPDF) {
 if(!svg || !svg.includes('<svg'))throw Error('Este gráfico no tiene SVG. Vuelve a guardarlo desde Preparar imagen.');
 const parsed=new DOMParser().parseFromString(svg,'image/svg+xml');
 if(parsed.querySelector('parsererror'))throw Error('No se pudo leer el SVG del gráfico.');
 const root=document.importNode(parsed.documentElement,true);
 const box=(root.getAttribute('viewBox')||'').split(/[ ,]+/).map(Number);
 const width=Number.parseFloat(root.getAttribute('width'))||box[2],height=Number.parseFloat(root.getAttribute('height'))||box[3];
 if(!(width>0&&height>0))throw Error('El gráfico no tiene dimensiones válidas.');
 if(root.querySelector('image,foreignObject'))throw Error('El gráfico contiene una imagen externa. Guarda una versión con elementos vectoriales.');
 // Blur is a raster filter; omit only its shadow, keeping all shapes and labels.
 root.querySelectorAll('[filter]').forEach(n=>n.removeAttribute('filter'));
 root.querySelectorAll('filter').forEach(n=>n.remove());
 const host=document.createElement('div');host.style.cssText='position:fixed;left:-100000px;top:0;pointer-events:none;';host.append(root);document.body.append(host);
 try {
  // Expand ECharts font shorthands, then parse the standalone SVG so definitions
  // and paint servers resolve locally, independent of the dashboard DOM.
  root.querySelectorAll("text,tspan").forEach(node=>{const css=getComputedStyle(node);for(const key of ["font-family","font-size","font-weight","font-style","letter-spacing"]){const value=css.getPropertyValue(key);if(value)node.style.setProperty(key,value);}});
  const standalone=new XMLSerializer().serializeToString(root);
  return await new Promise((resolve,reject)=>{
   const doc=new PDFKit({size:[width,height],margin:0,compress:true,autoFirstPage:true});
   const chunks=[];doc.on('data',v=>chunks.push(v));doc.on('error',reject);
   doc.on('end',()=>{const data=new Uint8Array(chunks.reduce((n,c)=>n+c.length,0));let i=0;for(const c of chunks){data.set(c,i);i+=c.length;}resolve(data);});
   doc.registerFont('ReportSans',new Uint8Array(fonts.normal));doc.registerFont('ReportSans-Bold',new Uint8Array(fonts.bold));
   try {
    SVGtoPDF(doc,standalone,0,0,{width,height,assumePt:true,useCSS:false,preserveAspectRatio:'xMidYMid meet',fontCallback:(family,bold,italic)=>{
     if(/Georgia|Times|serif(?!,)/i.test(family)&&!/sans-serif/i.test(family))return bold?'Times-Bold':italic?'Times-Italic':'Times-Roman';
     if(/Consolas|Courier|mono/i.test(family))return bold?'Courier-Bold':italic?'Courier-Oblique':'Courier';
     return bold?'ReportSans-Bold':'ReportSans';
    },warningCallback:message=>{if(/could not|can't be rendered|not found/i.test(message))throw Error('No se pudo convertir un elemento del gráfico a PDF vectorial.');}});
    doc.end();
   }catch(error){reject(error);doc.end();}
  });
 }finally{host.remove();}
}
