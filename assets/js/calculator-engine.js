import { finite } from "./analytics.js";
export function parseFormula(expression) {
  if (!expression.trim()) throw Error("Agrega cuentas o escribe una fórmula.");
  if (expression.length > 1500)
    throw Error("La fórmula excede 1.500 caracteres.");
  const source = expression.replace(/,/g, "."),
    tokens = [];
  const regex =
    /\s*(?:(\d+(?:\.\d*)?|\.\d+)(?:([eE][+-]?\d+))?|([a-zA-Z]+)|([+\-*/^()]))/gy;
  let pos = 0;
  while (pos < source.length) {
    if (!source.slice(pos).trim()) break;
    regex.lastIndex = pos;
    const m = regex.exec(source);
    if (!m)
      throw Error(
        `Carácter no válido en la posición ${pos + 1}. Usa números, variables y + − * / ^ ( ).`,
      );
    tokens.push(
      m[1]
        ? { type: "number", value: Number(m[1] + (m[2] || "")) }
        : m[3]
          ? { type: "variable", name: m[3].toLowerCase() }
          : { type: m[4] },
    );
    pos = regex.lastIndex;
  }
  let i = 0,
    depth = 0;
  function primary() {
    if (++depth > 60) throw Error("Demasiados paréntesis anidados.");
    let t = tokens[i++],
      node;
    if (!t) throw Error("La fórmula está incompleta.");
    if (t.type === "number" || t.type === "variable") node = t;
    else if (t.type === "(") {
      node = expr(0);
      if (tokens[i++]?.type !== ")") throw Error("Falta cerrar un paréntesis.");
    } else if (t.type === "+" || t.type === "-")
      node = { type: "unary", op: t.type, child: expr(3) };
    else throw Error("Se esperaba un número, una cuenta o un paréntesis.");
    depth--;
    return node;
  }
  const precedence = { "+": 1, "-": 1, "*": 2, "/": 2, "^": 4 };
  function expr(min) {
    let left = primary();
    while (i < tokens.length) {
      const op = tokens[i].type,
        p = precedence[op];
      if (!p || p < min) break;
      i++;
      left = { type: "binary", op, left, right: expr(op === "^" ? p : p + 1) };
    }
    return left;
  }
  const ast = expr(0);
  if (i !== tokens.length)
    throw Error("Falta un operador entre cuentas o hay un paréntesis extra.");
  return ast;
}
export function formulaVariables(ast) {
  return [
    ...new Set(
      ast.type === "variable"
        ? [ast.name]
        : ast.type === "binary"
          ? [...formulaVariables(ast.left), ...formulaVariables(ast.right)]
          : ast.type === "unary"
            ? formulaVariables(ast.child)
            : [],
    ),
  ];
}
export function evaluateFormula(ast, variables) {
  function calc(n) {
    let v;
    if (n.type === "number") v = n.value;
    else if (n.type === "variable") {
      const data = variables[n.name];
      v = typeof data === "number" ? data : data?.value;
      if (!finite(v))
        throw Error(
          `La variable ${n.name} no tiene un valor válido. Selecciona otra cuenta o fecha.`,
        );
    } else if (n.type === "unary") v = (n.op === "-" ? -1 : 1) * calc(n.child);
    else {
      const a = calc(n.left),
        b = calc(n.right);
      if (n.op === "/" && b === 0)
        throw Error("No se puede dividir entre cero.");
      v =
        n.op === "+"
          ? a + b
          : n.op === "-"
            ? a - b
            : n.op === "*"
              ? a * b
              : n.op === "/"
                ? a / b
                : a ** b;
    }
    if (!finite(v))
      throw Error(
        "El cálculo no produce un número finito. Revisa bases, exponentes y magnitudes.",
      );
    return v;
  }
  return calc(ast);
}
export function excelFormula(ast, refs) {
  if (ast.type === "number") return String(ast.value);
  if (ast.type === "variable") {
    if (!refs[ast.name]) throw Error(`Referencia ausente: ${ast.name}`);
    return refs[ast.name];
  }
  if (ast.type === "unary")
    return `(${ast.op}${excelFormula(ast.child, refs)})`;
  return `(${excelFormula(ast.left, refs)}${ast.op}${excelFormula(ast.right, refs)})`;
}
export function variableName(index) {
  let s = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26))
    s = String.fromCharCode(97 + ((n - 1) % 26)) + s;
  return s;
}
export function formatResult(value, unit = "number") {
  return (
    new Intl.NumberFormat("es-PE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...(unit === "percent" ? { style: "percent" } : {}),
    }).format(value) +
    (unit === "times" ? "x" : unit === "money" ? " S/ miles" : "")
  );
}
export function captureCalculation({
  name,
  expression,
  variables,
  unit = "number",
  note = "",
  noteMode = "inline",
}) {
  const ast = parseFormula(expression),
    used = formulaVariables(ast),
    values = Object.fromEntries(used.map((key) => [key, variables[key]]));
  const value = evaluateFormula(ast, values);
  if (!name.trim()) throw Error("Escribe un nombre para el cálculo.");
  return {
    name: name.trim(),
    expression: expression.trim().toUpperCase(),
    variables: JSON.parse(JSON.stringify(values)),
    unit,
    note,
    noteMode,
    ast,
    value,
  };
}
