import { escape as e, month, num } from "./format.js";
import { finite, norm, filterTree, treeOrder } from "./analytics.js";
import { lockPageScroll } from "./modal-scroll.js";
import {
  parseFormula,
  evaluateFormula,
  captureCalculation,
  variableName,
  formatResult,
} from "./calculator-engine.js";
export function initCalculator(getContext) {
  let dialog,
    ctx,
    release,
    draft = {
      title: "Revisión financiera",
      reviewDate: new Date().toLocaleDateString("en-CA"),
      conclusion: "",
      items: [],
    },
    variables = {},
    nextVariable = 0,
    editing = -1,
    collapsed = new Set(),
    statement = "balance",
    period = "",
    currency = "2",
    query = "",
    busy = false;
  const $ = (s) => dialog.querySelector(s);
  function create() {
    dialog = document.createElement("dialog");
    dialog.className = "calculator-dialog";
    dialog.setAttribute("aria-labelledby", "calculator-title");
    dialog.innerHTML = `<header class="calc-header"><div><h2 id="calculator-title">Calculadora SBS</h2><p id="calc-context"></p></div><button type="button" data-calc-close aria-label="Cerrar calculadora">✕</button></header>
  <nav class="calc-mobile-nav" aria-label="Pasos de la calculadora"><button type="button" data-calc-step=".calc-source">Cuentas</button><button type="button" data-calc-step=".calc-composer">Cálculo</button><button type="button" data-calc-step=".calc-review">Informe</button></nav><div class="calc-body"><aside class="calc-source"><h3>1. Elige tus cuentas</h3><p>Arrastra una cuenta a la fórmula o toca + para insertarla.</p><div class="calc-source-controls"><select id="calc-statement" aria-label="Estado financiero"><option value="balance">Balance</option><option value="income">Resultados</option></select><select id="calc-period" aria-label="Periodo de la cuenta"></select><select id="calc-currency" aria-label="Columna monetaria"><option value="2">Total · S/ miles</option><option value="0">MN · S/ miles</option><option value="1">ME · S/ miles</option></select></div><input id="calc-search" type="search" placeholder="Buscar cuenta, rubro o fila…" aria-label="Buscar cuenta"><div class="calc-tree" role="region" aria-label="Jerarquía de cuentas SBS"></div></aside>
  <main class="calc-editor"><section class="calc-composer"><h3>2. Construye el cálculo</h3><label>Nombre del cálculo<input id="calc-name" maxlength="160" placeholder="Ej.: Cobertura de cartera atrasada"></label><div class="calc-formula-head"><label for="calc-expression">Fórmula</label><button type="button" data-calc-clear>Nuevo cálculo</button></div><textarea id="calc-expression" rows="3" spellcheck="false" placeholder="Ej.: (a+b)/c^(1/360)" aria-describedby="calc-formula-help"></textarea><p id="calc-formula-help">Las letras representan las cuentas elegidas. Escribe constantes y operadores; usa punto o coma decimal, sin separador de miles.</p><div class="calc-operators">${["+", "-", "*", "/", "^", "(", ")"].map((op) => `<button type="button" data-operator="${op}">${op}</button>`).join("")}<button type="button" data-calc-constant>+ Constante</button></div><div id="calc-variables"></div><div class="calc-result-row"><div><span>Resultado</span><output id="calc-result" aria-live="polite">—</output></div><label>Formato<select id="calc-unit"><option value="number">Número</option><option value="percent">Porcentaje · 0,12 → 12%</option><option value="times">Veces</option><option value="money">S/ miles</option></select></label></div><p id="calc-message" role="status"></p><label>Comentario <span class="muted">(opcional)</span><textarea id="calc-note" rows="2" maxlength="3000" placeholder="Lectura o conclusión de este cálculo"></textarea></label><button type="button" id="calc-add" class="primary">Agregar al informe</button></section>
  <section class="calc-review"><h3>3. Prepara la revisión</h3><div class="calc-review-fields"><label>Nombre de la revisión<input id="calc-title" maxlength="180"></label><label>Fecha de revisión<input type="date" id="calc-review-date"></label></div><div id="calc-items"></div><label>Conclusión general <span class="muted">(opcional)</span><textarea id="calc-conclusion" rows="2" maxlength="5000"></textarea></label><p class="footnote">El informe incluye los cálculos agregados, sus cuentas y fechas. El borrador se conserva durante esta sesión. Los valores se fijan al agregar cada cuenta.</p></section></main></div>
  <footer class="calc-footer"><span id="calc-export-status" role="status">Agrega un cálculo para exportar.</span><div><button type="button" id="calc-excel">Descargar Excel</button><button type="button" id="calc-pdf">Descargar PDF</button></div></footer>`;
    document.body.append(dialog);
    dialog.addEventListener("close", () => {
      release?.();
      document.getElementById("calculator-open").focus({ preventScroll: true });
    });
    $("[data-calc-close]").onclick = () => dialog.close();
    $("#calc-statement").onchange = (ev) => {
      statement = ev.target.value;
      renderTree();
    };
    $("#calc-period").onchange = (ev) => {
      period = ev.target.value;
      renderTree();
    };
    $("#calc-currency").onchange = (ev) => {
      currency = ev.target.value;
      renderTree();
    };
    $("#calc-search").oninput = (ev) => {
      query = ev.target.value;
      renderTree();
    };
    $("#calc-expression").oninput = preview;
    $("#calc-unit").onchange = preview;
    $("#calc-title").oninput = (ev) => {
      draft.title = ev.target.value;
    };
    $("#calc-review-date").onchange = (ev) => {
      draft.reviewDate = ev.target.value;
    };
    $("#calc-conclusion").oninput = (ev) => {
      draft.conclusion = ev.target.value;
    };
    dialog.addEventListener("click", (ev) => {
      const b = ev.target.closest("button");
      if (!b) return;
      if (b.dataset.calcStep)
        $(b.dataset.calcStep).scrollIntoView({ block: "start" });
      if (b.dataset.calcToggle) {
        const id = b.dataset.calcToggle;
        collapsed.has(id) ? collapsed.delete(id) : collapsed.add(id);
        renderTree();
      }
      if (b.dataset.calcAccount) addAccount(b.dataset.calcAccount);
      if (b.dataset.operator) insert(b.dataset.operator);
      if (b.dataset.calcInsert) insert(b.dataset.calcInsert);
      if (b.dataset.calcRemove) {
        delete variables[b.dataset.calcRemove];
        renderVariables();
        preview();
      }
      if (b.hasAttribute("data-calc-clear")) clearEditor();
      if (b.hasAttribute("data-calc-constant")) {
        while (variables[variableName(nextVariable)]) nextVariable++;
        const key = variableName(nextVariable++);
        variables[key] = { value: 1, label: "Constante", kind: "constant" };
        renderVariables();
        insert(key);
      }
      if (b.dataset.calcEdit !== undefined) {
        editing = Number(b.dataset.calcEdit);
        const item = draft.items[editing];
        variables = structuredClone(item.variables);
        nextVariable = 0;
        while (variables[variableName(nextVariable)]) nextVariable++;
        $("#calc-name").value = item.name;
        $("#calc-expression").value = item.expression;
        $("#calc-note").value = item.note;
        $("#calc-unit").value = item.unit;
        $("#calc-add").textContent = "Guardar cambios";
        renderVariables();
        preview();
        $("#calc-name").focus();
      }
      if (b.dataset.calcDelete !== undefined) {
        const index = Number(b.dataset.calcDelete);
        draft.items.splice(index, 1);
        if (editing === index) clearEditor();
        else if (editing > index) editing--;
        renderItems();
      }
    });
    $("#calc-variables").addEventListener("input", (ev) => {
      const key = ev.target.dataset.constant;
      if (!key) return;
      const text = ev.target.value.trim().replace(",", ".");
      variables[key].value = text === "" ? null : Number(text);
      preview();
    });
    $(".calc-tree").addEventListener("dragstart", (ev) => {
      const row = ev.target.closest("[data-account-drag]");
      if (!row) return;
      ev.dataTransfer.setData(
        "application/x-sbs-account",
        row.dataset.accountDrag,
      );
      ev.dataTransfer.effectAllowed = "copy";
    });
    $("#calc-expression").addEventListener("dragover", (ev) => {
      ev.preventDefault();
      ev.dataTransfer.dropEffect = "copy";
    });
    $("#calc-expression").addEventListener("drop", (ev) => {
      ev.preventDefault();
      const id = ev.dataTransfer.getData("application/x-sbs-account");
      if (id) addAccount(id);
    });
    $("#calc-add").onclick = () => {
      try {
        const item = captureCalculation({
          name: $("#calc-name").value,
          expression: $("#calc-expression").value,
          variables,
          unit: $("#calc-unit").value,
          note: $("#calc-note").value,
        });
        if (editing < 0) {
          if (draft.items.length >= 60)
            throw Error("La revisión admite hasta 60 cálculos.");
          draft.items.push(item);
        } else draft.items[editing] = item;
        clearEditor();
        renderItems();
        $("#calc-export-status").textContent =
          "Cálculo agregado. Puedes continuar o exportar.";
      } catch (error) {
        $("#calc-message").textContent = error.message;
      }
    };
    $("#calc-excel").onclick = () => exportReview("xlsx");
    $("#calc-pdf").onclick = () => exportReview("pdf");
  }
  function clearEditor() {
    variables = {};
    nextVariable = 0;
    editing = -1;
    for (const id of ["#calc-name", "#calc-expression", "#calc-note"])
      $(id).value = "";
    $("#calc-add").textContent = "Agregar al informe";
    renderVariables();
    preview();
  }
  function insert(text) {
    const field = $("#calc-expression"),
      start = field.selectionStart ?? field.value.length,
      end = field.selectionEnd ?? start;
    field.setRangeText(text, start, end, "end");
    field.focus({ preventScroll: true });
    preview();
  }
  function renderTree() {
    const catalog = ctx.financial.catalog.filter(
      (r) => r.statement === statement && r.group !== "Control",
    );
    const rows = filterTree(treeOrder(catalog), query, collapsed),
      values =
        ctx.financial.periods.find((p) => p.date === period)?.values || {};
    $(".calc-tree").innerHTML = rows.length
      ? rows
          .map((r) => {
            const children = catalog.some((c) => c.parent === r.id),
              value = values[r.id]?.[Number(currency)];
            return `<div class="calc-account" draggable="${finite(value)}" data-account-drag="${e(r.id)}" style="--depth:${r.depth}"><button type="button" class="calc-expand" ${children ? `data-calc-toggle="${r.id}" aria-expanded="${!collapsed.has(r.id)}" aria-label="${collapsed.has(r.id) ? "Expandir" : "Plegar"} ${e(r.label)}"` : 'disabled aria-hidden="true"'}>${children ? (collapsed.has(r.id) ? "›" : "⌄") : ""}</button><div><strong>${e(r.label)}</strong><small>${num(value)} · ${r.kind === "ytd" ? "YTD" : "Cierre"}</small></div><button type="button" data-calc-account="${r.id}" ${finite(value) ? "" : "disabled"} aria-label="Agregar ${e(r.label)}">+</button></div>`;
          })
          .join("")
      : '<p class="empty">No hay cuentas que coincidan.</p>';
  }
  function addAccount(id) {
    const r = ctx.financial.catalog.find((r) => r.id === id),
      p = ctx.financial.periods.find((p) => p.date === period),
      value = p?.values[id]?.[Number(currency)];
    if (!r || !finite(value)) return;
    const match = Object.entries(variables).find(
      ([, v]) =>
        v.id === id &&
        v.date === period &&
        v.currency === currency &&
        v.entity === ctx.entity,
    );
    let key = match?.[0];
    if (!key) {
      if (Object.keys(variables).length >= 80) {
        $("#calc-message").textContent = "Máximo 80 variables por cálculo.";
        return;
      }
      while (variables[variableName(nextVariable)]) nextVariable++;
      key = variableName(nextVariable++);
      variables[key] = {
        id,
        reference: r.reference,
        label: r.label,
        path: r.path,
        kind: r.kind,
        date: period,
        currency,
        entity: ctx.entity,
        entityName: ctx.entityName,
        source: p.source_url,
        value,
      };
    }
    renderVariables();
    insert(key);
    if (window.innerWidth <= 760)
      $("#calc-expression").scrollIntoView({ block: "center" });
  }
  function renderVariables() {
    $("#calc-variables").innerHTML = Object.entries(variables)
      .map(
        ([key, v]) =>
          `<div class="calc-variable"><button type="button" data-calc-insert="${key}" aria-label="Insertar variable ${key}">${key}</button><div><strong>${e(v.label)}</strong><small>${v.kind === "constant" ? "Valor definido por ti" : `${month(v.date)} · ${["MN", "ME", "Total"][Number(v.currency)]} · S/ miles · ${v.kind === "ytd" ? "Acumulado YTD" : "Saldo de cierre"} · ${e(v.entityName)}`}</small></div>${v.kind === "constant" ? `<input inputmode="decimal" data-constant="${key}" value="${v.value ?? ""}" aria-label="Valor de ${key}">` : `<b>${num(v.value)}</b>`}<button type="button" data-calc-remove="${key}" aria-label="Quitar variable ${key}">×</button></div>`,
      )
      .join("");
  }
  function preview() {
    try {
      const ast = parseFormula($("#calc-expression").value),
        value = evaluateFormula(ast, variables);
      $("#calc-result").textContent = formatResult(
        value,
        $("#calc-unit").value,
      );
      const dates = new Set(
        Object.values(variables)
          .filter((v) => v.date)
          .map((v) => v.date),
      );
      $("#calc-message").textContent =
        dates.size > 1
          ? "Combinas fechas distintas: sus fechas quedarán identificadas en el informe."
          : "Entradas en S/ miles. Para porcentajes, usa a/b y formato Porcentaje, o a/b*100 con formato Número.";
    } catch (error) {
      $("#calc-result").textContent = "—";
      $("#calc-message").textContent = $("#calc-expression").value.trim()
        ? error.message
        : "";
    }
  }
  function renderItems() {
    $("#calc-items").innerHTML = draft.items.length
      ? draft.items
          .map(
            (r, i) =>
              `<article class="calc-saved"><div><strong>${i + 1}. ${e(r.name)}</strong><small>${e(r.expression)}</small></div><b>${formatResult(r.value, r.unit)}</b><button type="button" data-calc-edit="${i}" aria-label="Editar ${e(r.name)}">Editar</button><button type="button" data-calc-delete="${i}" aria-label="Eliminar ${e(r.name)}">×</button></article>`,
          )
          .join("")
      : '<p class="empty">Todavía no hay cálculos en la revisión.</p>';
    for (const id of ["#calc-excel", "#calc-pdf"])
      $(id).disabled = !draft.items.length || busy;
  }
  async function exportReview(type) {
    if (busy) return;
    if (!draft.items.length) return;
    if (!draft.title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(draft.reviewDate)) {
      $("#calc-export-status").textContent =
        "Completa el nombre y la fecha de revisión.";
      return;
    }
    busy = true;
    renderItems();
    $("#calc-export-status").textContent = "Preparando archivo…";
    try {
      const { downloadReview } = await import("./calculator-export.js");
      await downloadReview(structuredClone(draft), type);
      $("#calc-export-status").textContent =
        "Archivo listo. Incluye los cálculos agregados al informe.";
    } catch (error) {
      $("#calc-export-status").textContent =
        "No se pudo exportar: " + error.message;
    } finally {
      busy = false;
      renderItems();
    }
  }
  document.getElementById("calculator-open").onclick = () => {
    ctx = getContext();
    if (!ctx.financial) return;
    if (!dialog) create();
    period = ctx.date;
    collapsed = new Set(
      ctx.financial.catalog
        .filter((r) => ctx.financial.catalog.some((c) => c.parent === r.id))
        .map((r) => r.id),
    );
    $("#calc-context").textContent =
      `${ctx.entityName} · B-2201 · cuentas en S/ miles`;
    $("#calc-period").innerHTML = ctx.financial.periods
      .slice()
      .reverse()
      .map(
        (p) =>
          `<option value="${p.date}" ${p.date === period ? "selected" : ""}>${month(p.date)}</option>`,
      )
      .join("");
    $("#calc-title").value = draft.title;
    $("#calc-review-date").value = draft.reviewDate;
    $("#calc-conclusion").value = draft.conclusion;
    renderTree();
    renderVariables();
    renderItems();
    preview();
    release = lockPageScroll();
    dialog.showModal();
    $("#calc-name").focus();
  };
}
