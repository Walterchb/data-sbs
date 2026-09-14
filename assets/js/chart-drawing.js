import { frameChartSvg } from "./chart-presentation.js";
import { initPreviewViewport } from "./preview-viewport.js";
import { labelMarkup } from "./chart-labels.js";
import { escape } from "./format.js";

export const DRAWING_TYPES = {
  circle: "Círculo",
  ellipse: "Óvalo",
  rect: "Rectángulo",
  arrow: "Flecha",
  line: "Línea",
  text: "Texto",
  highlight: "Resaltado",
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const drawingColor = (value, fallback = "#1c7ff2") =>
  /^#[0-9a-f]{6}$/i.test(value || "") ? value : fallback;
const number = (v, fallback = 0) =>
  Number.isFinite(Number(v)) ? Number(v) : fallback;
function textLines(item) {
  const count = Math.max(
    1,
    Math.floor((item.width - 16) / (item.fontSize * 0.57)),
  );
  const lines = [];
  for (const paragraph of String(item.text || "").split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if (line && line.length + word.length + 1 > count) {
        lines.push(line);
        line = "";
      }
      let remaining = word;
      while (remaining.length > count) {
        if (line) {
          lines.push(line);
          line = "";
        }
        lines.push(remaining.slice(0, count));
        remaining = remaining.slice(count);
      }
      line += (line ? " " : "") + remaining;
    }
    lines.push(line);
  }
  return lines;
}
export function fitDrawing(item, width, height) {
  if (item.type === "label") {
    item.x = Math.round(
      clamp(number(item.x), 0, Math.max(0, width - item.width)),
    );
    item.y = Math.round(
      clamp(number(item.y), 0, Math.max(0, height - item.height)),
    );
    return item;
  }
  item.fontSize = clamp(number(item.fontSize, 28), 12, 72);
  item.width = Math.round(clamp(number(item.width, 200), 20, width));
  item.height = Math.round(clamp(number(item.height, 100), 8, height));
  if (item.type === "circle")
    item.height = item.width = Math.min(item.width, height);
  if (item.type === "text")
    item.height = Math.min(
      height,
      Math.ceil(textLines(item).length * item.fontSize * 1.3 + 16),
    );
  item.x = Math.round(clamp(number(item.x), 0, width - item.width));
  item.y = Math.round(clamp(number(item.y), 0, height - item.height));
  item.strokeWidth = clamp(number(item.strokeWidth, 3), 0, 20);
  item.fillOpacity = clamp(number(item.fillOpacity, 15), 0, 100);
  return item;
}
export function newDrawing(type, id, width, height) {
  if (!(type in DRAWING_TYPES)) throw new Error("Figura no válida");
  const item = {
    id,
    type,
    width: type === "text" ? 360 : type === "highlight" ? 300 : 240,
    height:
      type === "circle"
        ? 240
        : type === "text"
          ? 60
          : type === "highlight"
            ? 24
            : 120,
    x: width * 0.42,
    y: height * 0.38,
    stroke: "#1c7ff2",
    strokeWidth: type === "highlight" ? 0 : 3,
    fill: type === "highlight" ? "#f3d34a" : "#1c7ff2",
    filled: type === "highlight",
    fillOpacity: type === "highlight" ? 35 : 15,
    text: "Tu texto",
    fontSize: 28,
    underline: false,
    highlightColor: "#f3d34a",
    reverse: false,
    direction: "up",
    layer: type === "highlight" ? "back" : "front",
  };
  if (type === "text") item.stroke = "#102033";
  return fitDrawing(item, width, height);
}
function markup(item) {
  if (item.type === "label") return labelMarkup(item);
  const { x, y, width: w, height: h } = item;
  const stroke = drawingColor(item.stroke),
    fill = drawingColor(item.fill);
  const paint = `stroke="${stroke}" stroke-width="${item.strokeWidth}" fill="${item.filled ? fill : "none"}" fill-opacity="${item.fillOpacity / 100}"`;
  if (item.type === "circle" || item.type === "ellipse")
    return `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${Math.max(1, w / 2 - item.strokeWidth / 2)}" ry="${Math.max(1, h / 2 - item.strokeWidth / 2)}" ${paint}/>`;
  if (item.type === "rect" || item.type === "highlight")
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${item.type === "highlight" ? 4 : 0}" ${paint}/>`;
  if (item.type === "line" || item.type === "arrow") {
    let start = [x, y + h],
      end = [x + w, y];
    if (item.direction === "down") {
      start = [x, y];
      end = [x + w, y + h];
    }
    if (item.direction === "horizontal") {
      start = [x, y + h / 2];
      end = [x + w, y + h / 2];
    }
    if (item.direction === "vertical") {
      start = [x + w / 2, y + h];
      end = [x + w / 2, y];
    }
    if (item.reverse) [start, end] = [end, start];
    const [x1, y1] = start,
      [x2, y2] = end;
    let head = "";
    if (item.type === "arrow") {
      const angle = Math.atan2(y2 - y1, x2 - x1),
        size = Math.max(12, item.strokeWidth * 4);
      const a = [
        x2 - size * Math.cos(angle - 0.42),
        y2 - size * Math.sin(angle - 0.42),
      ];
      const b = [
        x2 - size * Math.cos(angle + 0.42),
        y2 - size * Math.sin(angle + 0.42),
      ];
      head = `<path d="M${a.join(",")} L${x2},${y2} L${b.join(",")}" fill="none" stroke="${stroke}" stroke-width="${item.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${item.strokeWidth}" stroke-linecap="round"/>${head}`;
  }
  const lines = textLines(item);
  const background = item.filled
    ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" fill-opacity="${item.fillOpacity / 100}" rx="4"/>`
    : "";
  const highlights = item.underline
    ? lines
        .map(
          (line, i) =>
            `<rect x="${x + 6}" y="${y + 8 + item.fontSize * (1 + i * 1.3) - item.fontSize * 0.16}" width="${Math.min(w - 12, line.length * item.fontSize * 0.57 + 4)}" height="${item.fontSize * 0.35}" rx="2" fill="${drawingColor(item.highlightColor, "#f3d34a")}" fill-opacity=".45"/>`,
        )
        .join("")
    : "";
  const text = lines
    .map(
      (line, i) =>
        `<text x="${x + 8}" y="${y + 8 + item.fontSize * (1 + i * 1.3)}" fill="${stroke}" font-family="Segoe UI, Arial, sans-serif" font-size="${item.fontSize}" xml:space="preserve">${escape(line)}</text>`,
    )
    .join("");
  return background + highlights + text;
}
export function drawingMarkup(items) {
  // Marker strokes sit behind the manually added text and figures, even if added later.
  return [...items]
    .sort((a, b) => (a.type !== "highlight") - (b.type !== "highlight"))
    .map(
      (item) => `<g data-drawing-id="${escape(item.id)}">${markup(item)}</g>`,
    )
    .join("");
}
export function composeDrawingSvg(baseSvg, items) {
  const behind = `<g data-chart-drawings="back">${drawingMarkup(items.filter((i) => i.layer === "back" && i.type !== "label"))}</g>`;
  const front = `<g data-chart-drawings="front">${drawingMarkup(items.filter((i) => i.layer !== "back" && i.type !== "label"))}</g>`;
  const labels = `<g data-chart-drawings="labels">${drawingMarkup(items.filter((i) => i.type === "label"))}</g>`;
  if (baseSvg.includes('<g data-chart-content="true">'))
    baseSvg = baseSvg.replace(
      '<g data-chart-content="true">',
      behind + '<g data-chart-content="true">',
    );
  else baseSvg = baseSvg.replace(/(<svg\b[^>]*>)/, "$1" + behind);
  return baseSvg.replace(/<\/svg>\s*$/, `${front}${labels}</svg>`);
}

export function createDrawingEditor(preview, form, onChange) {
  const items = [];
  const labelEdits = new Map();
  const parseId = (id) => (String(id).includes(":") ? id : Number(id));
  let selectedId = null,
    nextId = 0,
    width = 1600,
    height = 900,
    baseSvg = "",
    presentation = {},
    drag = null,
    frame = 0;
  const surface = preview.querySelector(".export-preview-surface");
  const canvas = document.createElement("div");
  canvas.className = "drawing-canvas";
  canvas.setAttribute("tabindex", "0");
  canvas.setAttribute("role", "group");
  canvas.setAttribute(
    "aria-label",
    "Anotaciones del gráfico. Usa las flechas para mover la selección; Mayús mueve diez píxeles.",
  );
  surface.append(canvas);
  const toolbar = document.createElement("div");
  toolbar.className = "drawing-toolbar";
  toolbar.setAttribute("role", "toolbar");
  toolbar.setAttribute("aria-label", "Agregar anotación");
  const glyph = {
    circle: '<circle cx="12" cy="12" r="8"/>',
    ellipse: '<ellipse cx="12" cy="12" rx="9" ry="5.5"/>',
    rect: '<rect x="4" y="4" width="16" height="16"/>',
    arrow: '<path d="M5 19L19 5M8 5H19V16"/>',
    line: '<path d="M5 19L19 5"/>',
    text: '<path d="M4 5H20M12 5V20M8 20H16"/>',
    highlight: '<path d="M3 18L7 9H21L17 18Z" fill="currentColor"/>',
  };
  toolbar.innerHTML =
    "<span>Anotar</span>" +
    Object.entries(DRAWING_TYPES)
      .map(
        ([type, label]) =>
          `<button type="button" data-add-drawing="${type}" title="${label}" aria-label="Agregar ${label.toLowerCase()}"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyph[type]}</svg></button>`,
      )
      .join("");
  toolbar.insertAdjacentHTML(
    "beforeend",
    '<button type="button" data-select-label title="Seleccionar etiqueta" aria-label="Seleccionar etiqueta"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 4H14L21 11L11 21L3 13Z"/><circle cx="8" cy="9" r="1.4"/></svg></button>',
  );
  preview.prepend(toolbar);
  const viewport = initPreviewViewport(canvas, surface, toolbar, () => {
    drag = null;
    canvas.classList.remove("is-dragging");
    paint();
  });
  const inspector = document.createElement("fieldset");
  inspector.className = "drawing-inspector";
  inspector.hidden = true;
  inspector.innerHTML = `<legend>Elemento seleccionado</legend>
    <label>Elemento<select data-drawing-list aria-label="Seleccionar anotación"></select></label>
    <label data-for-text>Texto<textarea data-prop="text" maxlength="500" rows="2" aria-label="Texto de la anotación"></textarea></label>
    <div class="export-field-row"><label>X · px<input type="number" data-prop="x" min="0" step="1"></label><label>Y · px<input type="number" data-prop="y" min="0" step="1"></label></div>
    <div class="export-field-row"><label>Ancho · px<input type="number" data-prop="width" min="20" step="1"></label><label>Alto · px<input type="number" data-prop="height" min="8" step="1"></label></div>
    <div class="export-field-row"><label data-color-label>Color<input type="color" data-prop="stroke"></label><label data-for-shape>Borde · px<input type="number" data-prop="strokeWidth" min="0" max="20" step="1"></label><label data-for-text>Letra · px<input type="number" data-prop="fontSize" min="12" max="72" step="1"></label></div>
    <label class="export-check"><input type="checkbox" data-prop="filled"> Fondo de color</label>
    <div class="export-field-row"><label>Fondo<input type="color" data-prop="fill"></label><label>Opacidad · %<input type="number" data-prop="fillOpacity" min="0" max="100" step="5"></label></div>
    <label class="export-check" data-for-text><input type="checkbox" data-prop="underline"> Subrayado resaltado detrás del texto</label>
    <label data-for-text>Color del resaltado<input type="color" data-prop="highlightColor"></label>
    <label data-for-line>Orientación<select data-prop="direction"><option value="up">Ascendente</option><option value="down">Descendente</option><option value="horizontal">Horizontal</option><option value="vertical">Vertical</option></select></label>
    <label class="export-check" data-for-line><input type="checkbox" data-prop="reverse"> Invertir dirección</label>
    <label data-for-manual>Capa<select data-prop="layer"><option value="back">Detrás del gráfico</option><option value="front">Delante del gráfico</option></select></label>
    <label class="export-check" data-for-label><input type="checkbox" data-prop="connector"> Línea de unión con su referencia</label>
    <button type="button" data-reset-label data-for-label>Restablecer posición</button>
    <div class="drawing-nudge"><select data-step aria-label="Paso de movimiento"><option value="1">1 px</option><option value="5">5 px</option><option value="10" selected>10 px</option><option value="25">25 px</option></select><button type="button" data-move="left" aria-label="Mover a la izquierda">←</button><button type="button" data-move="up" aria-label="Mover arriba">↑</button><button type="button" data-move="down" aria-label="Mover abajo">↓</button><button type="button" data-move="right" aria-label="Mover a la derecha">→</button></div>
    <div class="drawing-actions"><button type="button" data-layer="back">Al fondo</button><button type="button" data-layer="front">Al frente</button><button type="button" data-duplicate>Duplicar</button><button type="button" data-delete>Eliminar</button><button type="button" data-done>Listo</button></div>
    <p class="export-control-note">Arrastra para mover; usa la esquina para cambiar el tamaño. La capa «Detrás del gráfico» coloca el elemento debajo del título, curvas y etiquetas.</p>`;
  form.prepend(inspector);
  const selected = () => items.find((item) => item.id === selectedId);
  const composed = () =>
    baseSvg
      ? frameChartSvg(
          composeDrawingSvg(baseSvg, items),
          width,
          height,
          presentation,
        )
      : "";
  function syncInspector() {
    const item = selected();
    inspector.hidden = !item;
    toolbar.querySelector("[data-select-label]").disabled = !items.some(
      (i) => i.type === "label",
    );
    inspector.querySelector("[data-drawing-list]").innerHTML = items
      .map(
        (x) =>
          `<option value="${x.id}" ${x.id === selectedId ? "selected" : ""}>${escape(x.type === "label" ? x.text.replace(/\n/g, " · ") : `${DRAWING_TYPES[x.type]} ${x.id}`)}</option>`,
      )
      .join("");
    if (!item) return;
    inspector.querySelectorAll("[data-prop]").forEach((input) => {
      input.disabled =
        item.type === "label" &&
        !["x", "y", "connector", "text"].includes(input.dataset.prop);
      const value = item[input.dataset.prop];
      if (input.type === "checkbox") input.checked = Boolean(value);
      else input.value = value ?? "";
    });
    inspector
      .querySelectorAll("[data-for-text]")
      .forEach((n) => (n.hidden = !["text", "label"].includes(item.type)));
    inspector
      .querySelectorAll("[data-for-shape]")
      .forEach((n) => (n.hidden = ["text", "label"].includes(item.type)));
    inspector
      .querySelectorAll("[data-for-line]")
      .forEach((n) => (n.hidden = !["arrow", "line"].includes(item.type)));
    inspector
      .querySelectorAll("[data-for-label]")
      .forEach((n) => (n.hidden = item.type !== "label"));
    inspector
      .querySelectorAll(
        "[data-for-manual],[data-layer],[data-delete],[data-duplicate]",
      )
      .forEach((n) => (n.hidden = item.type === "label"));
    for (const prop of [
      "width",
      "height",
      "stroke",
      "fontSize",
      "filled",
      "fill",
      "fillOpacity",
      "underline",
      "highlightColor",
    ]) {
      inspector.querySelector(`[data-prop="${prop}"]`).closest("label").hidden =
        item.type === "label" ||
        (["fontSize", "underline", "highlightColor"].includes(prop) &&
          item.type !== "text");
    }
    inspector.querySelector('[data-prop="text"]').readOnly =
      item.type === "label";
    inspector.querySelector('[data-prop="height"]').disabled = [
      "text",
      "circle",
      "label",
    ].includes(item.type);
    inspector.querySelector('[data-prop="x"]').max = width - item.width;
    inspector.querySelector('[data-prop="y"]').max = height - item.height;
    inspector.querySelector('[data-prop="width"]').max = width;
    inspector.querySelector('[data-prop="height"]').max = height;
  }
  function paint() {
    const svg = canvas.querySelector("svg");
    if (!svg) return;
    const artboard = svg.querySelector("[data-editor-artboard]") || svg;
    for (const layer of ["back", "front", "labels"]) {
      let group = svg.querySelector(`[data-chart-drawings="${layer}"]`);
      if (!group) {
        group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute("data-chart-drawings", layer);
        if (layer === "back")
          artboard.insertBefore(
            group,
            svg.querySelector("[data-chart-content]") || artboard.firstChild,
          );
        else artboard.append(group);
      }
      group.innerHTML = drawingMarkup(
        items.filter((i) =>
          layer === "labels"
            ? i.type === "label"
            : i.type !== "label" &&
              (i.layer === "back" ? "back" : "front") === layer,
        ),
      );
    }
    svg.querySelector("[data-drawing-handles]")?.remove();
    const scale =
        Math.abs(
          artboard.getScreenCTM?.()?.a ||
            svg.getBoundingClientRect().width / width,
        ) || 1,
      h = 14 / scale;
    const controls = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g",
    );
    controls.setAttribute("data-drawing-handles", "true");
    controls.innerHTML = [...items]
      .sort(
        (a, b) =>
          (a.type === "label") - (b.type === "label") ||
          (a.layer !== "back") - (b.layer !== "back"),
      )
      .map(
        (item) =>
          `<rect data-hit="${escape(item.id)}" x="${item.x}" y="${item.y}" width="${item.width}" height="${item.height}" fill="transparent" style="cursor:move"/>`,
      )
      .join("");
    const item = selected();
    if (item)
      controls.innerHTML += `<rect data-selection-frame="true" x="${item.x}" y="${item.y}" width="${item.width}" height="${item.height}" fill="none" stroke="#1c7ff2" stroke-width="1.5" vector-effect="non-scaling-stroke" stroke-dasharray="5 3" pointer-events="none"/>${item.type === "label" ? "" : `<rect data-resize="${escape(item.id)}" x="${item.x + item.width - h / 2}" y="${item.y + item.height - h / 2}" width="${h}" height="${h}" rx="${2 / scale}" fill="#fff" stroke="#1c7ff2" stroke-width="1.5" vector-effect="non-scaling-stroke" style="cursor:nwse-resize"/>`}`;
    artboard.append(controls);
  }
  function changed(sync = true) {
    for (const item of items.filter((i) => i.type === "label"))
      labelEdits.set(item.id, {
        dx: item.x - item.defaultX,
        dy: item.y - item.defaultY,
        connector: item.connector,
      });
    paint();
    if (sync) syncInspector();
    onChange(composed());
  }
  function choose(id) {
    selectedId = id;
    paint();
    syncInspector();
    if (selected()) form.scrollTop = 0;
  }
  toolbar.addEventListener("click", (event) => {
    if (event.target.closest("[data-select-label]")) {
      choose(items.find((i) => i.type === "label")?.id);
      return;
    }
    const type = event.target.closest("[data-add-drawing]")?.dataset.addDrawing;
    if (!type) return;
    const item = newDrawing(type, ++nextId, width, height);
    if (
      type === "text" &&
      form.elements.namedItem("background")?.value === "dark"
    )
      item.stroke = "#e8f1f8";
    items.push(item);
    selectedId = item.id;
    changed();
    form.scrollTop = 0;
  });
  inspector.addEventListener("input", (event) => {
    event.stopPropagation();
    const input = event.target,
      item = selected();
    if (!input.dataset.prop || !item) return;
    if (
      input.type === "number" &&
      (input.value === "" || !input.validity.valid)
    )
      return;
    item[input.dataset.prop] =
      input.type === "checkbox"
        ? input.checked
        : input.type === "number"
          ? Number(input.value)
          : input.value;
    fitDrawing(item, width, height);
    changed(false);
  });
  inspector.addEventListener("change", (event) => {
    event.stopPropagation();
    if (event.target.hasAttribute("data-drawing-list"))
      choose(parseId(event.target.value));
    else syncInspector();
  });
  inspector.addEventListener("click", (event) => {
    const button = event.target.closest("button"),
      item = selected();
    if (!button || !item) return;
    event.stopPropagation();
    if (button.hasAttribute("data-done")) {
      selectedId = null;
      changed();
      return;
    }
    if (button.hasAttribute("data-reset-label")) {
      item.x = item.defaultX;
      item.y = item.defaultY;
    } else if (button.dataset.move) {
      const amount = Number(inspector.querySelector("[data-step]").value);
      item.x +=
        button.dataset.move === "left"
          ? -amount
          : button.dataset.move === "right"
            ? amount
            : 0;
      item.y +=
        button.dataset.move === "up"
          ? -amount
          : button.dataset.move === "down"
            ? amount
            : 0;
    } else if (button.hasAttribute("data-delete")) {
      items.splice(items.indexOf(item), 1);
      selectedId = items.at(-1)?.id ?? null;
    } else if (button.hasAttribute("data-duplicate")) {
      const copy = { ...item, id: ++nextId, x: item.x + 20, y: item.y + 20 };
      items.push(fitDrawing(copy, width, height));
      selectedId = copy.id;
    } else if (button.dataset.layer) {
      item.layer = button.dataset.layer;
      items.splice(items.indexOf(item), 1);
      if (button.dataset.layer === "front") items.push(item);
      else items.unshift(item);
    }
    fitDrawing(item, width, height);
    changed();
  });
  const point = (event) => {
    const svg = canvas.querySelector("svg"),
      matrix = (
        svg?.querySelector("[data-editor-artboard]") || svg
      )?.getScreenCTM?.();
    if (!matrix) return null;
    const p = svg.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    return p.matrixTransform(matrix.inverse());
  };
  canvas.addEventListener("pointerdown", (event) => {
    canvas.classList.add("pointer-interaction");
    const target = event.target.closest("[data-hit],[data-resize]");
    if (!target) {
      choose(null);
      return;
    }
    const p = point(event);
    if (!p) return;
    choose(parseId(target.dataset.hit || target.dataset.resize));
    drag = {
      pointerId: event.pointerId,
      start: p,
      original: { ...selected() },
      resize: target.hasAttribute("data-resize"),
    };
    canvas.classList.add("is-dragging");
    canvas.setPointerCapture(event.pointerId);
    canvas.focus({ preventScroll: true });
    event.preventDefault();
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const p = point(event),
      item = selected();
    if (!p || !item) return;
    const dx = p.x - drag.start.x,
      dy = p.y - drag.start.y;
    if (drag.resize) {
      item.width = drag.original.width + dx;
      item.height = drag.original.height + dy;
    } else {
      item.x = drag.original.x + dx;
      item.y = drag.original.y + dy;
    }
    fitDrawing(item, width, height);
    if (!frame)
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        paint();
      });
    event.preventDefault();
  });
  const endDrag = (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag = null;
    canvas.classList.remove("is-dragging");
    if (canvas.hasPointerCapture(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
    changed();
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("keydown", (event) => {
    canvas.classList.remove("pointer-interaction");
    const item = selected();
    if (!item) return;
    const amount = event.shiftKey ? 10 : 1;
    if (event.key === "Delete" || event.key === "Backspace") {
      if (item.type === "label") return;
      items.splice(items.indexOf(item), 1);
      selectedId = items.at(-1)?.id ?? null;
    } else if (event.key === "ArrowLeft") item.x -= amount;
    else if (event.key === "ArrowRight") item.x += amount;
    else if (event.key === "ArrowUp") item.y -= amount;
    else if (event.key === "ArrowDown") item.y += amount;
    else return;
    event.preventDefault();
    fitDrawing(item, width, height);
    changed();
  });
  const observer = window.ResizeObserver
    ? new window.ResizeObserver(paint)
    : null;
  observer?.observe(surface);
  return {
    setConnectors(value) {
      for (const item of items.filter((i) => i.type === "label"))
        item.connector = value;
      for (const edit of labelEdits.values()) edit.connector = value;
      changed();
    },
    setBase(svg, w, h, labels = [], frameSettings = {}) {
      presentation = frameSettings;
      for (let i = items.length - 1; i >= 0; i--)
        if (items[i].type === "label") items.splice(i, 1);
      if (w !== width || h !== height)
        for (const edit of labelEdits.values()) {
          edit.dx *= w / width;
          edit.dy *= h / height;
        }
      if (w !== width || h !== height) {
        for (const item of items) {
          item.x *= w / width;
          item.y *= h / height;
          item.width *= w / width;
          item.height *= h / height;
          fitDrawing(item, w, h);
        }
        width = w;
        height = h;
      }
      for (const label of labels) {
        const edit = labelEdits.get(label.id);
        label.defaultX = label.x;
        label.defaultY = label.y;
        if (edit) {
          label.x += edit.dx;
          label.y += edit.dy;
          label.connector = edit.connector;
        }
        items.push(fitDrawing(label, w, h));
      }
      baseSvg = svg;
      canvas.innerHTML = frameChartSvg(svg, w, h, presentation);
      const root = canvas.querySelector("svg");
      root.removeAttribute("width");
      root.removeAttribute("height");
      root.setAttribute("viewBox", `0 0 ${width} ${height}`);
      root.setAttribute("preserveAspectRatio", "xMidYMid meet");
      paint();
      syncInspector();
      return composed();
    },
    destroy() {
      viewport.destroy();
      observer?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    },
  };
}
