// The image and PDF share the same font bytes, independent of the user's OS.
export const CHART_FAMILIES={humanist:'THHumanist',sans:'THSans',serif:'THSerif',times:'THTimes',mono:'THMono'};
let loaded;
export function ensureChartFonts(){
 if(!loaded)loaded=Promise.all(Object.values(CHART_FAMILIES).flatMap(family=>[400,700].map(async weight=>{
  const name=family.slice(2),ext='ttf',file=`${name}-${weight===700?'Bold':'Regular'}.${ext}`;
  const r=await fetch(new URL('../vendor/chart-fonts/'+file,import.meta.url));if(!r.ok)throw Error('No se pudo cargar una tipografía del gráfico. Reintenta.');
  const bytes=await r.arrayBuffer(),face=new FontFace(family,bytes,{weight:String(weight)});await face.load();document.fonts.add(face);
  let binary='';for(const b of new Uint8Array(bytes))binary+=String.fromCharCode(b);
  return {family,weight,bytes,data:`data:font/${ext};base64,${btoa(binary)}`};
 }))).catch(error=>{loaded=null;throw error;});return loaded;
}
export function fontDefinitions(fonts){return '<defs data-chart-fonts="true"><style>'+fonts.map(f=>`@font-face{font-family:${f.family};font-weight:${f.weight};src:url("${f.data}")}`).join('')+'</style></defs>';}
export function embedChartFonts(svg,fonts){
 const used=fonts.filter(f=>svg.includes(f.family)||f.family==='THHumanist');
 return svg.includes('data-chart-fonts=')?svg:svg.replace(/(<svg\b[^>]*>)/,'$1'+fontDefinitions(used));
}
