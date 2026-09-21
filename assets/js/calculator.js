import {sourceReference, sourceColumn} from './report-reference.js';
import { REPORT_PRESETS, buildPreset } from "./report-presets.js";
import { contentPages } from "./report-layout.js";
import { savedCharts, captureVisibleTables } from "./report-assets.js";
import { escape as e, month, num } from "./format.js";
import { finite, filterTree, treeOrder } from "./analytics.js";
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
      attachments: [],
      subtitle: "Análisis financiero",
      author: "",
      pdfStyle: "corporate",
      layout: "manual",
      tableNote: "",
      annexes: true,
    },
    variables = {},
    nextVariable = 0,
    editing = -1,
    collapsed = new Set(),
    statement = "balance",
    period = "",
    currency = "2",
    query = "",
    busy = false,
    renderingAttachments = false,
    availableTables = [];
  const $ = (s) => dialog.querySelector(s);
  function create() {
    dialog = document.createElement("dialog");
    dialog.className = "calculator-dialog";
    dialog.setAttribute("aria-labelledby", "calculator-title");
    dialog.innerHTML = `<header class="calc-header"><div><h2 id="calculator-title">Preparar Informe</h2><p id="calc-context"></p></div><button type="button" data-calc-close aria-label="Cerrar informe">✕</button></header>
  <nav class="calc-workflow" aria-label="Preparar informe"><button type="button" data-report-tab="calculate" aria-pressed="true">1 · Cálculos</button><button type="button" data-report-tab="review" aria-pressed="false">2 · Contenido y revisión <span id="report-count">0</span></button><span>Diseño automático · borrador de sesión</span></nav><nav class="calc-mobile-nav" aria-label="Pasos de la calculadora"><button type="button" data-calc-step=".calc-source">Cuentas</button><button type="button" data-calc-step=".calc-composer">Cálculo</button><button type="button" data-calc-step=".calc-review">Informe</button></nav><div class="calc-body"><aside class="calc-source"><h3>Elige tus cuentas</h3><p>Arrastra una cuenta a la fórmula o toca + para insertarla.</p><div class="calc-source-controls"><select id="calc-statement" aria-label="Estado financiero"><option value="balance">Balance</option><option value="income">Resultados</option></select><select id="calc-period" aria-label="Periodo de la cuenta"></select><select id="calc-currency" aria-label="Columna monetaria"><option value="2">Total · S/ miles</option><option value="0">MN · S/ miles</option><option value="1">ME · S/ miles</option></select></div><details class="calc-presets" open><summary>Cálculos predeterminados</summary><label>Indicador<select id="calc-preset"><option value="">Elige un cálculo…</option>${[...new Set(REPORT_PRESETS.map(p=>p.group))].map(group=>`<optgroup label="${group}">${REPORT_PRESETS.filter(p=>p.group===group).map(p=>`<option value="${p.id}">${e(p.name)}</option>`).join('')}</optgroup>`).join('')}</select></label><button type="button" data-load-preset>Cargar fórmula y cuentas</button><p>Usa la entidad, fecha y columna elegidas. Revisa el cálculo antes de agregarlo.</p><p id="calc-preset-status" role="status"></p></details><input id="calc-search" type="search" placeholder="Buscar cuenta, rubro o fila…" aria-label="Buscar cuenta"><div class="calc-tree" role="region" aria-label="Jerarquía de cuentas SBS"></div></aside>
  <main class="calc-editor"><section class="calc-composer"><h3>Construye el cálculo</h3><p>Elige cuentas a la izquierda, escribe una fórmula y agrega el resultado al informe.</p><label>Nombre del cálculo<input id="calc-name" maxlength="160" placeholder="Ej.: Cobertura de cartera atrasada"></label><div class="calc-formula-head"><label for="calc-expression">Fórmula</label><button type="button" data-calc-clear>Nuevo cálculo</button></div><textarea id="calc-expression" rows="3" spellcheck="false" placeholder="Ej.: (A+B)/C^(1/360)" aria-describedby="calc-formula-help"></textarea><p id="calc-formula-help">Las letras representan las cuentas elegidas. Escribe constantes y operadores; usa punto o coma decimal, sin separador de miles.</p><div class="calc-operators">${["+", "-", "*", "/", "^", "(", ")"].map((op) => `<button type="button" data-operator="${op}">${op}</button>`).join("")}<button type="button" data-calc-constant>+ Constante</button></div><div id="calc-variables"></div><div class="calc-result-row"><div><span>Resultado</span><output id="calc-result" aria-live="polite">—</output></div><label>Formato<select id="calc-unit"><option value="number">Número</option><option value="percent">Porcentaje · 0,12 → 12%</option><option value="times">Veces</option><option value="money">S/ miles</option></select></label></div><p id="calc-message" role="status"></p><label>Detalle <span class="muted">(opcional)</span><textarea id="calc-note" rows="2" maxlength="3000" placeholder="Lectura o conclusión de este cálculo"></textarea></label><button type="button" id="calc-add" class="primary">Agregar al informe</button></section>
  <section class="calc-review" hidden><h3>Contenido del informe</h3><p class="report-intro">La carátula, el resumen y los anexos se organizan automáticamente. Revisa el contenido y descarga.</p><div class="calc-review-fields"><label>Nombre de la revisión<input id="calc-title" maxlength="180"></label><label>Fecha de revisión<input type="date" id="calc-review-date"></label></div><div class="calc-review-fields"><label>Subtítulo de la carátula<input id="calc-subtitle" maxlength="220" placeholder="Análisis financiero"></label><label>Preparado por (opcional)<input id="calc-author" maxlength="120"></label></div><div class="report-design"><label>Estilo PDF<select id="report-pdf-style"><option value="corporate">Corporativo · azul noche</option><option value="editorial">Editorial · marfil y verde</option><option value="paper">Paper · blanco y negro</option></select></label><label class="report-annex-toggle"><input type="checkbox" id="report-annexes" checked> Incluir anexos de cálculos y fuentes</label></div><h4>Resultados</h4><div id="calc-items"></div><label>Nota general de la tabla (opcional)<textarea id="report-table-note" rows="2" maxlength="3000" placeholder="Una aclaración que aplica a todos los resultados"></textarea></label><h4>Gráficos y tablas</h4><div class="report-add-content"><label>Gráficos guardados<select id="report-chart-picker" aria-label="Gráficos guardados"></select></label><button type="button" data-report-add-chart>Agregar gráfico</button><label>Tablas de la vista actual<select id="report-table-picker" aria-label="Tablas disponibles"></select></label><button type="button" data-report-add-table>Agregar tabla</button></div><p class="footnote">Guarda imágenes desde Preparar imagen → Guardar gráfico. Las tablas incluyen las filas visibles: puedes cerrar el informe, cambiar de vista y volver para añadir otra.</p><p class="report-page-help">Asigna una página a cada elemento y usa ↑ ↓ para ordenar. Hasta cuatro elementos por página; el tamaño se ajusta automáticamente.</p><div id="report-attachments"></div><label>Conclusión general <span class="muted">(opcional)</span><textarea id="calc-conclusion" rows="2" maxlength="5000"></textarea></label><p class="footnote">PDF: carátula → índice enlazado → resultados → contenido → anexos. Gráficos vectoriales con texto seleccionable. Excel: resultados con fórmulas, datos y contenido adjunto. Los resultados se muestran con 2 decimales; el cálculo conserva su precisión. Todo el borrador se elimina al recargar.</p></section></main></div>
  <section class="report-pdf-preview" hidden><header><strong>Vista previa del PDF</strong><button type="button" data-close-pdf>Volver al informe</button></header><iframe title="Vista previa del informe PDF"></iframe></section><footer class="calc-footer"><span id="calc-export-status" role="status">Agrega un cálculo o elige gráficos y tablas en Contenido.</span><div><button type="button" id="calc-preview">Vista previa PDF</button><button type="button" id="calc-excel">Descargar Excel</button><button type="button" id="calc-pdf">Descargar PDF</button></div></footer>`;
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
    for (const key of ['subtitle','author']) $('#calc-'+key).oninput = ev => { draft[key] = ev.target.value; };
    $('#report-pdf-style').onchange = ev => {draft.pdfStyle=ev.target.value;};
    $('#report-annexes').onchange = ev => {draft.annexes=ev.target.checked;};
    $('#report-table-note').oninput = ev => {draft.tableNote=ev.target.value;};
    $('#report-attachments').addEventListener('change',ev=>{
      if(!renderingAttachments&&ev.target.dataset.attachmentPage!==undefined){draft.attachments[Number(ev.target.dataset.attachmentPage)].page=Number(ev.target.value); renderAttachments();}
    });
    $('[data-load-preset]').onclick = async () => {
      const button=$('[data-load-preset]'),id=$('#calc-preset').value,selectedDate=period,selectedCurrency=currency,context=ctx;button.disabled=true;
      try {
        if(id.startsWith('capital_')){const capital=await context.loadCapital(context.entity);if(!dialog.open||ctx!==context||period!==selectedDate||currency!==selectedCurrency)return;context.capital=capital;}
        const item=buildPreset(id,context,selectedDate,selectedCurrency);
        variables=item.variables;editing=-1;nextVariable=Object.keys(variables).length;
        statement=Object.values(variables)[0]?.id?.startsWith('income:')?'income':'balance';$('#calc-statement').value=statement;
        for(const v of Object.values(variables)){let row=ctx.financial.catalog.find(r=>r.id===v.id);while(row?.parent){collapsed.delete(row.parent);row=ctx.financial.catalog.find(r=>r.id===row.parent);}}
        $('#calc-name').value=item.name;$('#calc-expression').value=item.expression;$('#calc-note').value=item.note;$('#calc-unit').value=item.unit;$('#calc-add').textContent='Agregar al informe';
        renderVariables();preview();$('#calc-preset-status').textContent='Fórmula cargada. Revisa las cuentas y agrega el cálculo.';
      }catch(error){$('#calc-preset-status').textContent=error.message;}finally{button.disabled=false;}
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
      if (b.dataset.reportTab) setTab(b.dataset.reportTab);
      if (b.hasAttribute('data-report-add-chart')) {
        const chart = savedCharts().find(c => c.id === $('#report-chart-picker').value);
        if (chart) addAttachment({...chart, url:undefined});
      }
      if (b.hasAttribute('data-report-add-table')) {
        const table = availableTables.find(t => t.id === $('#report-table-picker').value);
        if (table) addAttachment(structuredClone(table));
      }
      if (b.dataset.attachmentRemove !== undefined) { const [removed] = draft.attachments.splice(Number(b.dataset.attachmentRemove),1); if (removed?.kind === 'chart') URL.revokeObjectURL(removed.url); renderItems(); }
      if (b.dataset.attachmentMove !== undefined) {
        const i = Number(b.dataset.attachmentMove), peers=draft.attachments.map((a,j)=>a.page===draft.attachments[i].page?j:-1).filter(j=>j>=0), j=peers[peers.indexOf(i)+Number(b.dataset.direction)];
        if (j >= 0 && j < draft.attachments.length) [draft.attachments[i],draft.attachments[j]] = [draft.attachments[j],draft.attachments[i]];
        renderItems();
      }
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
        if (Object.keys(variables).length >= 80) { $("#calc-message").textContent = "Máximo 80 variables por cálculo."; return; }
        while (variables[variableName(nextVariable)]) nextVariable++;
        const key = variableName(nextVariable++);
        variables[key] = { value: 1, label: "CONSTANTE", kind: "constant" };
        renderVariables();
        insert(key);
      }
      if (b.dataset.calcEdit !== undefined) {
        setTab("calculate");
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
    $("[data-close-pdf]").onclick = () => { $(".report-pdf-preview").hidden = true; };
    $("#calc-excel").onclick = () => exportReview("xlsx");
    $("#calc-pdf").onclick = () => exportReview("pdf");
    $("#calc-preview").onclick = () => exportReview("preview");
    $("#report-attachments").addEventListener("input", ev => { if (ev.target.dataset.attachmentTitle !== undefined) draft.attachments[Number(ev.target.dataset.attachmentTitle)].title = ev.target.value; });
  }
  function clearEditor() {
    $("#calc-preset-status").textContent="";
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
    field.setRangeText(text.toUpperCase(), start, end, "end");
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
              value = values[r.id]?.[Number(currency)],
              keys = Object.entries(variables).filter(([,v]) => v.id === r.id && v.date === period && v.currency === currency && v.entity === ctx.entity).map(([k])=>k.toUpperCase());
            return `<div class="calc-account ${keys.length ? 'is-used' : ''}" draggable="${finite(value)}" data-account-drag="${e(r.id)}" style="--depth:${r.depth}"><button type="button" class="calc-expand" ${children ? `data-calc-toggle="${r.id}" aria-expanded="${!collapsed.has(r.id)}" aria-label="${collapsed.has(r.id) ? "Expandir" : "Plegar"} ${e(r.label)}"` : 'disabled aria-hidden="true"'}>${children ? (collapsed.has(r.id) ? "›" : "⌄") : ""}</button><div><strong>${e(r.label)}</strong><small>${num(value)} · ${r.kind === "ytd" ? "YTD" : "Cierre"}</small></div>${keys.length ? `<span class="calc-account-keys" aria-label="Variable ${keys.join(', ')}">${keys.join(', ')}</span>` : ''}<button type="button" data-calc-account="${r.id}" ${finite(value) ? "" : "disabled"} aria-label="Agregar ${e(r.label)}">+</button></div>`;
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
        reference: sourceReference(r),
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
    renderTree();
    $("#calc-variables").innerHTML = Object.entries(variables)
      .map(
        ([key, v]) =>
          `<div class="calc-variable"><button type="button" data-calc-insert="${key}" aria-label="Insertar variable ${key}">${key.toUpperCase()}</button><div><strong>${e(v.kind === "constant" ? v.label.toUpperCase() : v.label)}</strong><small>${v.kind === "constant" ? "Valor definido por ti" : `${month(v.date)} · ${sourceColumn(v)} · ${v.kind === "ytd" ? "Acumulado YTD" : v.kind === "ratio" ? "Ratio al cierre" : "Saldo de cierre"} · ${e(v.entityName)}`}</small></div>${v.kind === "constant" ? `<input inputmode="decimal" data-constant="${key}" value="${v.value ?? ""}" aria-label="Valor de ${key}">` : `<b>${num(v.value)}${v.unit==='PERCENT'?'%':''}</b>`}<button type="button" data-calc-remove="${key}" aria-label="Quitar variable ${key}">×</button></div>`,
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
    $("#calc-items").innerHTML = draft.items.length ? `<div class="report-result-table"><table><thead><tr><th>Cálculo</th><th>Detalle</th><th>Resultado</th><th></th></tr></thead><tbody>${draft.items.map((r,i)=>`<tr class="calc-saved"><td><strong>${i+1}. ${e(r.name)}</strong><small>${e(r.expression)}</small></td><td>${e(r.note)}</td><td><b>${formatResult(r.value,r.unit)}</b></td><td><button type="button" data-calc-edit="${i}" aria-label="Editar ${e(r.name)}">Editar</button><button type="button" data-calc-delete="${i}" aria-label="Eliminar ${e(r.name)}">×</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="empty">Todavía no hay cálculos en la revisión.</p>';
    renderAttachments();
    $('#report-count').textContent = draft.items.length + draft.attachments.length;
    for (const id of ["#calc-excel", "#calc-pdf", "#calc-preview"])
      $(id).disabled = !(draft.items.length + draft.attachments.length) || busy;
  }
  function setTab(tab) {
    dialog.dataset.reportTab = tab;
    $('.calc-composer').hidden = tab !== 'calculate';
    $('.calc-source').hidden = tab !== 'calculate';
    $('.calc-review').hidden = tab !== 'review';
    dialog.querySelectorAll('[data-report-tab]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.reportTab === tab)));
    $('.calc-editor').scrollTop = 0;
    if (tab === 'review') renderItems();
  }
  function addAttachment(item) {
    if (draft.attachments.some(a => a.id === item.id)) { $('#calc-export-status').textContent = 'Este contenido ya está en el informe.'; return; }
    if (draft.attachments.length >= 30) { $('#calc-export-status').textContent = 'Máximo 30 gráficos o tablas por informe.'; return; }
    if (item.kind === 'table' && item.rows.length > 1000) { $('#calc-export-status').textContent = 'Filtra la tabla a 1000 filas o menos antes de agregarla.'; return; }
    if (item.kind === 'chart') {
      if (draft.attachments.reduce((n,a)=>n+(a.png?.size||0),0)+item.png.size > 25*1024*1024) { $('#calc-export-status').textContent='El informe admite hasta 25 MB de gráficos. Quita alguno para continuar.'; return; }
      item.url = URL.createObjectURL(item.png);
    }
    const last=Math.max(1,...draft.attachments.map(a=>a.page||1));item.page ||= draft.attachments.filter(a=>a.page===last).length<4?last:last+1;
    draft.attachments.push(item); renderItems();
    $('#calc-export-status').textContent = 'Contenido agregado. Puedes cambiar su título y orden.';
  }
  function renderAttachments() {
    if(renderingAttachments)return;renderingAttachments=true;
    try {
    const charts = savedCharts();
    $('#report-chart-picker').innerHTML = charts.length ? charts.map(c => `<option value="${c.id}">${e(c.title)}</option>`).join('') : '<option>No hay gráficos guardados</option>';
    $('[data-report-add-chart]').disabled = !charts.length;
    $('#report-table-picker').innerHTML = availableTables.length ? availableTables.map(t => `<option value="${t.id}">${e(t.title)} · ${t.rows.length} filas</option>`).join('') : '<option>Sin tablas en esta vista</option>';
    $('[data-report-add-table]').disabled = !availableTables.length;
    const pageNumbers=[...new Set(draft.attachments.map(a=>a.page||1))].sort((a,b)=>a-b);
    $('#report-attachments').innerHTML = draft.attachments.length ? pageNumbers.map(pageNumber=>{const indices=draft.attachments.map((a,i)=>a.page===pageNumber?i:-1).filter(i=>i>=0);return `<section class="report-page-group"><h5>Página ${pageNumber} <span>${indices.length} / 4 elementos</span></h5>${indices.map((i,position)=>{const a=draft.attachments[i];return `<article class="report-attachment">${a.kind === 'chart' ? `<img src="${a.url}" alt="${e(a.title)}">` : '<span class="report-table-icon" aria-hidden="true">▦</span>'}<div><small>${a.kind === 'chart' ? 'GRÁFICO' : `TABLA · ${a.rows.length} filas`}</small><input data-attachment-title="${i}" value="${e(a.title)}" maxlength="160" aria-label="Título del contenido ${i+1}"><small>${e(a.context || a.subtitle || '')}</small>${`<label>Página<input type="number" min="1" max="30" data-attachment-page="${i}" value="${a.page||1}" aria-label="Página del contenido ${i+1}"></label>`}</div><button type="button" data-attachment-move="${i}" data-direction="-1" ${position === 0 ? 'disabled' : ''} aria-label="Subir contenido">↑</button><button type="button" data-attachment-move="${i}" data-direction="1" ${position === indices.length-1 ? 'disabled' : ''} aria-label="Bajar contenido">↓</button><button type="button" data-attachment-remove="${i}" aria-label="Quitar contenido">×</button></article>`;}).join('')}</section>`;}).join('') : '<p class="empty">Puedes añadir gráficos y tablas aunque el informe no tenga cálculos.</p>';
    }finally{renderingAttachments=false;}
  }
  async function exportReview(type) {
    if (busy) return;
    if (!(draft.items.length + draft.attachments.length)) return;
    if (!draft.title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(draft.reviewDate)) {
      $("#calc-export-status").textContent =
        "Completa el nombre y la fecha de revisión.";
      return;
    }
    try { contentPages(draft.attachments,draft.layout); } catch(error) { $("#calc-export-status").textContent=error.message; return; }
    busy = true;
    renderItems();
    $("#calc-export-status").textContent = "Preparando archivo…";
    try {
      const { downloadReview } = await import("./calculator-export.js");
      await downloadReview(structuredClone(draft), type);
      $("#calc-export-status").textContent =
        "Informe listo: incluye los resultados y el contenido agregado.";
    } catch (error) {
      $("#calc-export-status").textContent =
        "No se pudo exportar: " + error.message;
    } finally {
      busy = false;
      renderItems();
    }
  }
  window.matchMedia("(max-width:760px)").addEventListener?.("change", ev => { if (ev.matches && dialog?.open) dialog.close(); });
  document.getElementById("calculator-open").onclick = () => {
    if (window.matchMedia("(max-width:760px)").matches) return;
    ctx = getContext();
    availableTables = captureVisibleTables(document.getElementById("content"), `${ctx.entityName} · ${month(ctx.date)}`);
    if (!ctx.financial) return;
    if (!dialog) create();
    period = ctx.date;
    collapsed = new Set(
      ctx.financial.catalog
        .filter((r) => ctx.financial.catalog.some((c) => c.parent === r.id))
        .map((r) => r.id),
    );
    $("#calc-context").textContent =
      `${ctx.entityName} · cuentas B-2201 y capital B-2402`;
    $("#calc-period").innerHTML = ctx.financial.periods
      .slice()
      .reverse()
      .map(
        (p) =>
          `<option value="${p.date}" ${p.date === period ? "selected" : ""}>${month(p.date)}</option>`,
      )
      .join("");
    for (const key of ["subtitle","author"]) $("#calc-"+key).value = draft[key];
    $('#report-pdf-style').value=draft.pdfStyle;$('#report-annexes').checked=draft.annexes;$('#report-table-note').value=draft.tableNote;
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
