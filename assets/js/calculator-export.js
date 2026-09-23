import {sourceReference, sourceColumn} from './report-reference.js';
import { vectorPdf } from "./report-vector.js";
import { buildReportPdf } from "./report-pdf.js";
import { addWorkbookAttachments } from "./report-workbook.js";
import {
  excelFormula,
  formatResult,
  evaluateFormula,
  parseFormula,
} from "./calculator-engine.js";
const xml = (s) =>
  String(s ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const loads = new Map();
function vendor(path, key) {
  if (globalThis[key]) return Promise.resolve(globalThis[key]);
  if (!loads.has(key))
    loads.set(
      key,
      new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = new URL(path, import.meta.url).href;
        script.onload = () => {
          if (globalThis[key]) resolve(globalThis[key]);
          else {
            loads.delete(key);
            reject(Error("No se pudo iniciar el exportador."));
          }
        };
        script.onerror = () => {
          loads.delete(key);
          script.remove();
          reject(Error("No se pudo cargar el exportador. Reintenta."));
        };
        document.head.append(script);
      }),
    );
  return loads.get(key);
}
const day = (month) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};
const serial = (date) =>
  (Date.parse(date + "T00:00:00Z") - Date.UTC(1899, 11, 30)) / 86400000;
function verified(draft) {
  if (!draft.items.length && !draft.attachments?.length) throw Error("Agrega un cálculo, gráfico o tabla.");
  return {
    ...draft,
    items: draft.items.map((item) => ({
      ...item,
      expression: item.expression.toUpperCase(),
      ast: parseFormula(item.expression),
      value: evaluateFormula(parseFormula(item.expression), item.variables),
    })),
  };
}
export function workbookParts(draft) {
  const report = verified(draft);
  const sheets = [[], []];
  function cell(col, row, value, style = 0, formula) {
    const ref = col + row;
    if (formula)
      return `<c r="${ref}" s="${style}"><f>${xml(formula)}</f><v>${value}</v></c>`;
    if (typeof value === "number")
      return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
    return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
  }
  function row(sheet, n, values, styles = [], height) {
    sheets[sheet].push(
      `<row r="${n}"${height ? ` ht="${height}" customHeight="1"` : ""}>${values.map((v, i) => cell(String.fromCharCode(65 + i), n, v, styles[i] ?? 0)).join("")}</row>`,
    );
  }
  row(0, 1, [report.title], [1], Math.max(34,Math.ceil(report.title.length/100)*28));
  row(
    0,
    2,
    ["", "Fecha de revisión", serial(report.reviewDate)],
    [0, 0, 5],
    24,
  );
  row(
    0,
    3,
    [
      "Resultados a 2 decimales. Cuentas SBS en S/ miles; fechas y entidades en Datos. Gráficos y tablas en hojas adicionales.",
    ],
    [6],
    26,
  );
  row(
    0,
    5,
    ["N°", "Cálculo", "Detalle", "Resultado", "Formato", "Expresión"],
    [2, 2, 2, 7, 2, 2],
    24,
  );
  row(1, 1, ["DATOS DE LA REVISIÓN"], [1], 32);
  row(
    1,
    2,
    [
      "Valores capturados al agregar cada cuenta. Edita Valor para recalcular la revisión.",
    ],
    [6],
    24,
  );
  row(
    1,
    4,
    [
      "Cálculo",
      "Variable",
      "Entidad SBS",
      "Cierre",
      "Cuenta / rubro",
      "Columna",
      "Naturaleza",
      "Valor",
      "Fuente",
      "Referencia",
    ],
    [2,2,2,2,2,2,2,7,2,2],
    24,
  );
  let inputRow = 5,
    outputRow = 6;
  const detailMerges = [];
  report.items.forEach((item, i) => {
    const refs = {};
    for (const [key, v] of Object.entries(item.variables)) {
      refs[key] = `'Datos'!$H$${inputRow}`;
      row(
        1,
        inputRow,
        [
          i + 1,
          key.toUpperCase(),
          v.entityName || "Definido por el usuario",
          v.date ? serial(day(v.date)) : "",
          v.kind === "constant" ? v.label.toUpperCase() : v.path?.join(" › ") || v.label,
          sourceColumn(v),
          v.kind === "constant"
            ? "CONSTANTE"
            : v.kind === "ytd"
              ? "Acumulado YTD"
              : v.kind === "flow" ? "Flujo mensual" : v.kind === "ratio" ? "Ratio al cierre" : "Saldo de cierre",
          v.value,
          v.source || "",
          sourceReference(v),
        ],
        [0, 0, 0, 5, 0, 0, 0, 3, 6, 6],
        Math.max(
          42,
          Math.ceil((v.path?.join(" › ") || v.label).length / 60) * 14 + 8,
          Math.ceil((v.source || "").length / 55) * 14 + 8,
        ),
      );
      inputRow++;
    }
    const detailChunks=(item.note||"").match(/[\s\S]{1,600}(?:\s|$)|[\s\S]{1,600}/g)||[""];
    const n = outputRow++,
      style = item.unit === "percent" ? 4 : 3;
    sheets[0].push(
      `<row r="${n}" ht="${Math.min(250, Math.max(38, Math.ceil(item.name.length / 35) * 14 + 8, Math.ceil(Math.min(item.expression.length, 180) / 25) * 14 + 8, Math.ceil(detailChunks[0].length / 52) * 14 + 8))}" customHeight="1">${cell("A", n, i + 1)}${cell("B", n, item.name)}${cell("C", n, detailChunks[0])}${cell("D", n, item.value, style, excelFormula(item.ast, refs))}${cell("E", n, { number: "Número", percent: "Porcentaje", times: "Veces", money: "S/ miles" }[item.unit])}${cell("F", n, item.expression.length > 180 ? "Expresión completa debajo" : item.expression, 6)}</row>`,
    );
    for(const detail of detailChunks.slice(1)){row(0,outputRow++,["","",detail],[0,0,0],Math.max(34,Math.ceil(detail.length/52)*14+8));}
    for (const text of [
      item.expression.length > 180 ? "Fórmula: " + item.expression : "",

    ].filter(Boolean)) {
      for (let start = 0; start < text.length; start += 180) {
        row(0, outputRow, ["", text.slice(start, start + 180)], [0, 0], 34);
        detailMerges.push(`B${outputRow}:F${outputRow}`);
        outputRow++;
      }
    }
  });
  const notes = [];
  if(report.tableNote)notes.push('Nota de tabla: '+report.tableNote);
  if(report.author)notes.push('PREPARADO POR: '+report.author.toLocaleUpperCase('es-PE'));
  for(const text of notes){
    for(let i=0;i<text.length;i+=180){row(0,outputRow,['',text.slice(i,i+180)],[0,6],34);detailMerges.push(`B${outputRow}:F${outputRow}`);outputRow++;}
  }
  const end = outputRow + 1;
  if (report.conclusion) {
    row(0, end, ["CONCLUSIÓN"], [2], 24);
    const chunks = report.conclusion.match(/.{1,180}(?:\s|$)|.{1,180}/gs) || [];
    chunks.forEach((t, i) => row(0, end + 1 + i, [t], [0], 34));
  }
  const merges = [
    "A1:F1",
    "A3:F3",
    ...detailMerges,
    ...(report.conclusion
      ? [
          `A${end}:F${end}`,
          ...Array.from(
            {
              length: (
                report.conclusion.match(/.{1,180}(?:\s|$)|.{1,180}/gs) || []
              ).length,
            },
            (_, i) => `A${end + 1 + i}:F${end + 1 + i}`,
          ),
        ]
      : []),
  ];
  function sheet(index, widths, merged, freeze) {
    return `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="${freeze}" topLeftCell="A${freeze + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="20"/><cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${sheets[index].join("")}</sheetData>${index === 1 ? `<autoFilter ref="A4:J${Math.max(4, inputRow - 1)}"/>` : ""}<mergeCells count="${merged.length}">${merged.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells><pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
  }
  return {
    "[Content_Types].xml":
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    "_rels/.rels":
      '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    "xl/workbook.xml":
      '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Revisión" sheetId="1" r:id="rId1"/><sheet name="Datos" sheetId="2" r:id="rId2"/></sheets><calcPr calcId="191029" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>',
    "xl/_rels/workbook.xml.rels":
      '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    "xl/styles.xml": `<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="3"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="#,##0.00;[Red](#,##0.00);0.00"/><numFmt numFmtId="166" formatCode="0.00%"/></numFmts><fonts count="4"><font><sz val="11"/><color rgb="FF102033"/><name val="Calibri"/></font><font><b/><sz val="18"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><sz val="11"/><color rgb="FF005AA9"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B2246"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="8">${[
      { f: 0, n: 0 },
      { f: 1, n: 0, fill: 2 },
      { f: 2, n: 0, fill: 2 },
      { f: 3, n: 165 },
      { f: 0, n: 166 },
      { f: 0, n: 164 },
      { f: 0, n: 0 },
      { f: 2, n: 0, fill: 2, a: "right" },
    ]
      .map(
        (s) =>
          `<xf numFmtId="${s.n}" fontId="${s.f}" fillId="${s.fill || 0}" borderId="0" xfId="0" applyAlignment="1" applyNumberFormat="1"><alignment horizontal="${s.a || ([165,166].includes(s.n)?"right":"left")}" vertical="center" wrapText="1" indent="1"/></xf>`,
      )
      .join(
        "",
      )}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
    "xl/worksheets/sheet1.xml": sheet(0, [6, 40, 58, 24, 16, 30], merges, 5),
    "xl/worksheets/sheet2.xml": sheet(
      1,
      [9, 10, 40, 15, 66, 12, 22, 24, 60, 18],
      ["A1:J1", "A2:J2"],
      4,
    ),
  };
}
export async function pdfBytes(draft, lib, fonts) {
  return buildReportPdf(verified(draft), lib, fonts);
}
async function fontBytes(name) {
  const r = await fetch(new URL("../vendor/" + name, import.meta.url));
  if (!r.ok) throw Error("No se pudo cargar la tipografía del informe.");
  return r.arrayBuffer();
}
export async function downloadReview(draft, type) {
  let blob;
  if (type === "xlsx") {
    const JSZip = await vendor("../vendor/jszip.min.js", "JSZip"),
      zip = new JSZip();
    for (const [name, content] of Object.entries(await addWorkbookAttachments(workbookParts(draft), draft.attachments || [])))
      zip.file(name, content);
    blob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  } else {
    const [lib, kit, normal, bold] = await Promise.all([
      vendor("../vendor/pdf-lib.min.js", "PDFLib"),
      vendor("../vendor/fontkit.umd.min.js", "fontkit"),
      fontBytes("ReportSans.ttf"),
      fontBytes("ReportSans-Bold.ttf"),
    ]);
    const fonts = { kit, normal, bold };
    if (draft.attachments?.some(a=>a.kind === 'chart')) {
      const [PDFKit, SVGtoPDF] = await Promise.all([vendor('../vendor/pdfkit.min.js','PDFDocument'),vendor('../vendor/svg-to-pdfkit.min.js','SVGtoPDF')]);
      fonts.vector = svg => vectorPdf(svg, fonts, PDFKit, SVGtoPDF);
    }
    blob = new Blob([await pdfBytes(draft, lib, fonts)], {
      type: "application/pdf",
    });
  }
  if (type === 'preview') {
    const url = URL.createObjectURL(blob);
    const panel = document.querySelector('.report-pdf-preview');
    if (panel) { const old=panel.dataset.url; panel.dataset.url=url; panel.querySelector('iframe').src=url; panel.hidden=false; if(old)URL.revokeObjectURL(old); }
    return;
  }
  const name =
    draft.title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 100) || "Revision_SBS";
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `${name}_${draft.reviewDate}.${type}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
