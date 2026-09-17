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
