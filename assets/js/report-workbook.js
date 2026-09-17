import {tableNumber} from './report-assets.js';
const x=s=>String(s??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const col=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
const cell=(r,c,value,style=0)=>`<c r="${col(c)}${r}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${x(value)}</t></is></c>`;
const head='<?xml version="1.0" encoding="UTF-8"?>';
export async function addWorkbookAttachments(parts, attachments) {
  if(!attachments.length)return parts;
  const out={...parts};
  out['[Content_Types].xml']=out['[Content_Types].xml'].replace('</Types>','<Default Extension="png" ContentType="image/png"/></Types>');
  const main=out['xl/worksheets/sheet1.xml'];
  let rr=Math.max(...[...main.matchAll(/<row r="(\d+)"/g)].map(m=>Number(m[1])))+3;
  let extra=`<row r="${rr}" ht="25" customHeight="1">${cell(rr,1,'CONTENIDO ADJUNTO',2)}</row>`;
  for (const [i,a] of attachments.entries()) { rr++; extra+=`<row r="${rr}" ht="36" customHeight="1">${cell(rr,1,`${a.kind==='chart'?'Gráfico':'Tabla'} ${i+1}`)}${cell(rr,2,a.title)}${cell(rr,3,a.kind==='chart'?'Imagen sin pérdida':`${a.rows.length} filas`)}</row>`; }
  out['xl/worksheets/sheet1.xml']=main.replace('</sheetData>',extra+'</sheetData>');
  for(const [i,a] of attachments.entries()) {
    const n=i+3, rel=`rId${n+1}`, last=a.kind==='chart'?'L':col(a.headers.length-1);
    const name=`${a.kind==='chart'?'Gráfico':'Tabla'} ${i+1}`;
    out['xl/workbook.xml']=out['xl/workbook.xml'].replace('</sheets>',`<sheet name="${name}" sheetId="${n}" r:id="${rel}"/></sheets>`);
    out['xl/_rels/workbook.xml.rels']=out['xl/_rels/workbook.xml.rels'].replace('</Relationships>',`<Relationship Id="${rel}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${n}.xml"/></Relationships>`);
    out['[Content_Types].xml']=out['[Content_Types].xml'].replace('</Types>',`<Override PartName="/xl/worksheets/sheet${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`);
    let rows=`<row r="1" ht="45" customHeight="1">${cell(1,0,a.title,1)}</row><row r="2" ht="35" customHeight="1">${cell(2,0,a.context||a.subtitle||'',6)}</row>`,drawing='',cols='';
    if(a.kind==='table') {
      cols=a.headers.map((h,c)=>`<col min="${c+1}" max="${c+1}" width="${c===0?52:22}" customWidth="1"/>`).join('');
      rows+=`<row r="4" ht="32" customHeight="1">${a.headers.map((h,c)=>cell(4,c,h,2)).join('')}</row>`;
      a.rows.forEach((r,j)=>{
        const height=Math.min(400,Math.max(25,...r.map((v,c)=>Math.ceil(String(v).length/(c===0?48:20))*14+9)));
        rows+=`<row r="${j+5}" ht="${height}" customHeight="1">${a.headers.map((_,c)=>{const v=r[c]??'',num=c>0?tableNumber(v):null;return num?`<c r="${col(c)}${j+5}" s="${num.percent?4:3}"><v>${num.value}</v></c>`:cell(j+5,c,v);}).join('')}</row>`;
      });
    }else{
      cols='<col min="1" max="12" width="12" customWidth="1"/>';
      const w=Math.min(1000,a.width),h=Math.round(w*a.height/a.width),cx=w*9525,cy=h*9525;
      // Native DrawingML image; one compressed PNG, no base64 in worksheet cells.
      out[`xl/media/chart${i+1}.png`]=await a.png.arrayBuffer();
      out[`xl/drawings/drawing${i+1}.xml`]=head+`<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>3</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="${cx}" cy="${cy}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${i+1}" name="${x(a.title)}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`;
      out[`xl/drawings/_rels/drawing${i+1}.xml.rels`]=head+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/chart${i+1}.png"/></Relationships>`;
      out[`xl/worksheets/_rels/sheet${n}.xml.rels`]=head+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${i+1}.xml"/></Relationships>`;
      out['[Content_Types].xml']=out['[Content_Types].xml'].replace('</Types>',`<Override PartName="/xl/drawings/drawing${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`);
      drawing='<drawing r:id="rId1"/>';
    }
    out[`xl/worksheets/sheet${n}.xml`]=head+`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${rows}</sheetData>${a.kind==='table'?`<autoFilter ref="A4:${last}${a.rows.length+4}"/>`:''}<mergeCells count="2"><mergeCell ref="A1:${last}1"/><mergeCell ref="A2:${last}2"/></mergeCells><pageMargins left="0.35" right="0.35" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>${drawing}</worksheet>`;
  }
  return out;
}
