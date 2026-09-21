import test from "node:test";
import assert from "node:assert/strict";
import {
  parseFormula,
  evaluateFormula,
  excelFormula,
  captureCalculation,
  formulaVariables,
} from "../assets/js/calculator-engine.js";
import { workbookParts } from "../assets/js/calculator-export.js";
import { searchEntries, buildEntries } from "../assets/js/global-search.js";
import { METRICS } from "../assets/js/config.js";
import { EXTRA_RATIOS } from "../assets/js/analysis-ratios.js";
test("calculator supports arithmetic, exponent precedence, decimals, variables and exact Excel grouping", () => {
  for (const [expression, expected] of [
    ["(a+b)/c^(1/360)", 15 / 2 ** (1 / 360)],
    ["2+3*4", 14],
    ["-2^2", -4],
    ["2^3^2", 512],
    ["2^-2", 0.25],
    ["1,5+2.25", 3.75],
    ["(2+3)*4", 20],
  ])
    assert.ok(
      Math.abs(
        evaluateFormula(parseFormula(expression), { a: 10, b: 5, c: 2 }) -
          expected,
      ) < 1e-10,
      expression,
    );
  assert.equal(excelFormula(parseFormula("-2^2"), {}), "(-(2^2))");
  assert.equal(
    excelFormula(parseFormula("a/(b+c)"), { a: "A1", b: "B1", c: "C1" }),
    "(A1/(B1+C1))",
  );
});
test("invalid or unsafe expressions fail without evaluation; missing values do not become zero", () => {
  for (const s of [
    "window.alert(1)",
    "constructor",
    "1;alert(2)",
    "2(3)",
    "(1+2",
    "a+",
    "2**3",
    "1..2",
    "1/0",
    "(-1)^.5",
    "1e309",
  ])
    assert.throws(() => evaluateFormula(parseFormula(s), {}), s);
  assert.throws(() => evaluateFormula(parseFormula("a/b"), { a: null, b: 10 }));
  assert.equal(evaluateFormula(parseFormula("a/b"), { a: 0, b: 10 }), 0);
});
test("saved calculations are immutable snapshots; workbook formulas reference typed source cells", () => {
  const variables = {
    a: {
      value: 4,
      label: "Activo",
      date: "2026-06",
      currency: "2",
      kind: "stock",
      entityName: "Banco",
      source: "https://www.sbs.gob.pe/",
    },
    b: { value: 2, label: "Patrimonio", kind: "constant" },
  };
  const item = captureCalculation({
    name: "Cobertura",
    expression: "a/b",
    variables,
    unit: "percent",
  });
  variables.a.value = 999;
  assert.equal(item.value, 2);
  assert.equal(item.variables.a.value, 4);
  const parts = workbookParts({
    title: "Revisión & prueba",
    reviewDate: "2026-09-17",
    items: [item],
    conclusion: "Revisado.",
  });
  assert.ok(parts["xl/worksheets/sheet1.xml"].includes("<f>(&apos;") === false);
  assert.ok(
    parts["xl/worksheets/sheet1.xml"].includes(
      "<f>('Datos'!$H$5/'Datos'!$H$6)</f><v>2</v>",
    ),
  );
  assert.ok(
    parts["xl/worksheets/sheet2.xml"].includes('<c r="H5" s="3"><v>4</v></c>'),
  );
  assert.ok(
    parts["xl/worksheets/sheet1.xml"].includes("Revisión &amp; prueba"),
  );
  assert.deepEqual(formulaVariables(item.ast), ["a", "b"]);
});
test("exact search CAR matches the alias without matching cartera or unrelated explanations", () => {
  Object.assign(METRICS, EXTRA_RATIOS);
  const entries = buildEntries(
    {
      catalog: [
        {
          id: "balance:1",
          statement: "balance",
          label: "CARTERA",
          path: ["CARTERA"],
        },
      ],
    },
    {},
  );
  const result = searchEntries(entries, "CAR", 40, true);
  assert.equal(result.length, 1);
  assert.equal(result[0].target.reportMetric, "car");
  assert.ok(searchEntries(entries, "CAR", 40, false).length > 1);
});

test('report results use exactly two decimals while formulas retain full precision', async () => {
  const {formatResult} = await import('../assets/js/calculator-engine.js');
  assert.equal(formatResult(1/3), '0.33');
  assert.equal(formatResult(1/3,'percent'), '33.33%');
  const item=captureCalculation({name:'Precisión',expression:'1/3',variables:{}});
  assert.equal(item.value,1/3);
  const parts=workbookParts({title:'Prueba',reviewDate:'2026-09-17',items:[item]});
  assert.ok(parts['xl/styles.xml'].includes('formatCode="0.00%"'));
  assert.ok(!parts['xl/styles.xml'].includes('0.00####'));
  assert.ok(parts['xl/worksheets/sheet1.xml'].includes('<f>(1/3)</f>'));
});
test('attachments-only reports keep numeric table cells and native PNG drawings with valid relationships', async () => {
  const {addWorkbookAttachments} = await import('../assets/js/report-workbook.js');
  const {tableNumber} = await import('../assets/js/report-assets.js');
  assert.deepEqual(tableNumber('1,250.23'),{value:1250.23,percent:false});
  assert.deepEqual(tableNumber('-2.45%'),{value:-.0245,percent:true});
  assert.equal(tableNumber('31/07/2026'),null);
  const attachments=[{kind:'table',title:'Balance',headers:['Rubro','Saldo','Var %'],rows:[['Activo','1,250.23','2.50%']],context:'Banco · Jul 2026'}, {kind:'chart',title:'Serie',png:new Blob(['test']),width:1600,height:900}];
  const parts=await addWorkbookAttachments(workbookParts({title:'Adjuntos',reviewDate:'2026-09-17',items:[],attachments}),attachments);
  assert.ok(parts['xl/worksheets/sheet3.xml'].includes('<v>1250.23</v>'));
  assert.ok(parts['xl/worksheets/sheet3.xml'].includes('s="4"><v>0.025</v>'));
  assert.ok(parts['xl/workbook.xml'].includes('r:id="rId5"'));
  assert.ok(parts['xl/worksheets/sheet4.xml'].includes('<drawing r:id="rId1"/>'));
  assert.ok(parts['xl/media/chart2.png'] instanceof ArrayBuffer);
  assert.ok(parts['xl/drawings/_rels/drawing2.xml.rels'].includes('../media/chart2.png'));
});

test('preset formulas reconcile with source ratios and reject missing historical data', async () => {
 const fs=await import('node:fs');
 const {REPORT_PRESETS,buildPreset}=await import('../assets/js/report-presets.js');
 const financial=JSON.parse(fs.readFileSync(new URL('../data/financial.json',import.meta.url)));
 const overview=JSON.parse(fs.readFileSync(new URL('../data/overview.json',import.meta.url)));
 const {withAnalysisRatios}=await import('../assets/js/analysis-ratios.js');
 const ctx={financial,entity:'banbif',entityName:'Banco Interamericano de Finanzas'};
 const date=financial.periods.at(-1).date, expected=withAnalysisRatios(overview,financial).periods.find(p=>p.date===date);
 for(const preset of REPORT_PRESETS.filter(p=>!p.id.startsWith("capital_"))){
  const item=buildPreset(preset.id,ctx,date);
  assert.ok(Number.isFinite(item.value),preset.id);
  if(!preset.id.endsWith('_analytic')){
   const target=expected.metrics[preset.id].value;
   assert.ok(Math.abs(item.value*(item.unit==='percent'?100:1)-target)<1e-8,preset.id);
  }
 }
 assert.throws(()=>buildPreset('roe_analytic',ctx,financial.periods[0].date),/Falta/);
 const zero={...ctx,financial:{...financial,periods:financial.periods.map(p=>p.date===date?{...p,values:{...p.values,'balance:126':[0,0,0]}}:p)}};
 assert.throws(()=>buildPreset('leverage',zero,date),/cero/);
});
test('page compositions preserve every item once and enforce four panels per custom page', async()=>{
 const {contentPages}=await import('../assets/js/report-layout.js');
 const items=Array.from({length:8},(_,i)=>({id:i,kind:i%2?'table':'chart',page:i<4?1:3}));
 for(const layout of ['single','two','four','mixed','manual']){
  const pages=contentPages(items,layout);
  assert.deepEqual(pages.flatMap(p=>p.items.map(a=>a.id)).sort((a,b)=>a-b),items.map(a=>a.id));
  assert.ok(pages.every(p=>p.items.length<=4));
 }
 assert.throws(()=>contentPages(items.map(a=>({...a,page:1})),'manual'),/hasta 4/);
 const mixed=contentPages(items,'mixed');assert.equal(mixed[0].items.filter(a=>a.kind==='chart').length,2);
});
test('details always remain beside names, including legacy footnote entries',()=>{
 const inline=captureCalculation({name:'Nombre',expression:'1/3',variables:{},note:'Comentario en columna'});
 const foot=captureCalculation({name:'Otro',expression:'2/3',variables:{},note:'Texto de nota',noteMode:'footnote'});
 const parts=workbookParts({title:'Prueba',reviewDate:'2026-09-21',items:[inline,foot],tableNote:'Nota general',author:'Equipo de tesorería'});
 const sheet=parts['xl/worksheets/sheet1.xml'];
 assert.ok(sheet.includes('<c r="C6" s="0" t="inlineStr"><is><t xml:space="preserve">Comentario en columna'));
 assert.ok(sheet.includes('>Texto de nota</t>'));assert.ok(!sheet.includes('Nota [2]'));assert.ok(sheet.includes('>Detalle</t>'));assert.ok(sheet.includes('Nota de tabla: Nota general'));
 assert.ok(sheet.includes('EQUIPO DE TESORERÍA'));
});

test('capital presets use the exact entity, date and regulatory units',async()=>{
 const fs=await import('node:fs');const {buildPreset}=await import('../assets/js/report-presets.js');const {selectReport}=await import('../assets/js/entities.js');
 const report=JSON.parse(fs.readFileSync(new URL('../data/reports/B-2402.json',import.meta.url)));
 const ctx={capital:report,entity:'banbif',entityName:'BanBif'},date='2026-06';
 const total=buildPreset('capital_total',ctx,date),t1=buildPreset('capital_tier1',ctx,date),t2=buildPreset('capital_tier2',ctx,date);
 assert.ok(Math.abs(total.value-t1.value-t2.value)<1e-8);assert.equal(total.unit,'money');
 assert.ok(Math.abs(buildPreset('capital_rcg',ctx,date).value-.15046569190903158)<1e-12);
 assert.ok(Math.abs(buildPreset('capital_tier1_share',ctx,date).value-t1.value/total.value)<1e-12);
 assert.throws(()=>buildPreset('capital_total',ctx,'2026-07'),/No hay capital/);
 assert.throws(()=>buildPreset('capital_total',ctx,date,'1'),/Total/);
 assert.throws(()=>buildPreset('capital_total',{...ctx,capital:selectReport(report,'missing'),entity:'missing'},date),/Falta/);
 assert.notEqual(buildPreset('capital_total',{...ctx,capital:selectReport(report,'bbva'),entity:'bbva'},date).value,total.value);
});
test('financial references distinguish sheet and row without inventing cell columns',async()=>{
 const {sourceReference}=await import('../assets/js/report-reference.js');
 assert.equal(sourceReference({id:'balance:124'}),'B-2201 · hoja 1 (Balance) · fila 124');
 assert.equal(sourceReference({id:'income:79'}),'B-2201 · hoja 2 (Resultados) · fila 79');
});

import {reportAnnex,formulaLabel} from '../assets/js/report-annex.js';
test('annex shares inputs without mixing entities, dates, currencies or raw precision',()=>{
 const account={id:'balance:124',label:'Patrimonio',value:123.456,entity:'banbif',entityName:'BanBif',date:'2026-06',currency:'2',source:'https://example.test/source',kind:'stock'};
 const items=[captureCalculation({name:'Primero',expression:'a/b+1e-3',variables:{a:account,b:{kind:'constant',label:'Factor',value:2}}}),captureCalculation({name:'Segundo',expression:'b/a',variables:{b:account,a:{kind:'constant',label:'Factor',value:2}}}),...['entity','date','currency','value'].map((field,i)=>captureCalculation({name:field,expression:'a',variables:{a:{...account,[field]:['other','2025-06','0',123.457][i]}}}))];
 const annex=reportAnnex(items);
 assert.equal(annex.inputs.length,6);
 assert.equal(annex.formulas[0].expression,'A/B+1E-3');
 assert.equal(annex.formulas[1].expression,'A/B');
 const shared=Object.fromEntries(annex.inputs.map(v=>[v.symbol.toLowerCase(),v]));
 annex.formulas.forEach((f,i)=>assert.equal(evaluateFormula(parseFormula(f.expression),shared),items[i].value));
 assert.equal(formulaLabel('a+1e-3+bb',{a:'C',bb:'D'}),'C+1e-3+D');
 assert.equal(captureCalculation({name:'Mayúsculas',expression:'a/2',variables:{a:account}}).expression,'A/2');
});
