import {
  EXPORT_FONTS,
  QUICK_STYLES,
  quickStyleFields,
} from "./chart-styles.js";
import {
  PRESENTATION_PRESETS,
  PRESENTATION_PATTERNS,
  presentationSize,
  rasterSize,
} from "./chart-presentation.js";
import { initPreviewResize } from "./preview-resize.js";
import { escape, month, units } from "./format.js";
import { finite } from "./analytics.js";
import { exportComparisons } from "./chart-annotations.js";
import { collectExportLabels } from "./chart-labels.js";
import { lockPageScroll } from "./modal-scroll.js";
import { createDrawingEditor, drawingColor } from "./chart-drawing.js";

export const exportFilename = (title) =>
  "SBS_" +
  (title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "") || "Grafico");

const palettes = {
  light: {
    ink: "#102033",
    muted: "#5f7283",
    line: "#d9e3ec",
    grid: "#e8eef4",
    panel: "#ffffff",
    soft: "#f6f9fc",
    navy: "#0b3654",
    green: "#13966b",
    amber: "#c17a18",
    avg: "#635bff",
  },
  dark: {
    ink: "#e8f1f8",
    muted: "#a9bdcc",
    line: "#2b4a61",
    grid: "#20384b",
    panel: "#0d1b2a",
    soft: "#102236",
    navy: "#13415e",
    green: "#2dc48a",
    amber: "#d99a30",
    avg: "#8e7cff",
  },
};
const wrap = (text, width, size) => {
  const limit = Math.max(18, Math.floor(width / (size * 0.58)));
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (line && line.length + word.length + 1 > limit) {
      lines.push(line);
      line = "";
    }
    line += (line ? " " : "") + word;
  }
  if (line) lines.push(line);
  return lines.join("\n");
};

export async function exportImageBlob(svg, s) {
  let rasterUrl;
  try {
    let blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    if (s.format === "svg") return blob;
    const size = presentationSize(s.width, s.height, s);
    const pixels = rasterSize(size.width, size.height, s.exportScale);
    if (!pixels.valid)
      throw new Error(
        "La imagen supera 48 megapíxeles. Reduce la resolución o el tamaño.",
      );
    rasterUrl = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = rasterUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    const ctx = canvas.getContext("2d");
    if (s.format === "jpeg") {
      ctx.fillStyle =
        s.frameType === "shadow"
          ? "#fff"
          : s.background === "dark"
            ? palettes.dark.panel
            : "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, `image/${s.format}`, 1),
    );
    if (!blob) throw new Error("No se pudo generar la imagen.");
    return blob;
  } finally {
    if (rasterUrl) URL.revokeObjectURL(rasterUrl);
  }
}

// Always build a separate chart, preserving the dashboard's zoom, palette and series.
export function buildExportOptions(payload, settings) {
  const { spec, zoom } = payload;
  const style = QUICK_STYLES[settings.quickStyle];
  const terminal = settings.quickStyle === "bloomberg";
  const palette = {
    ...palettes[settings.background === "dark" ? "dark" : "light"],
  };
  if (style && settings.background === (style.background || "light"))
    Object.assign(palette, {
      ink: style.ink,
      panel: style.panel,
      grid: style.grid,
      muted: style.muted,
    });
  const fontFamily = EXPORT_FONTS[settings.fontFamily] || EXPORT_FONTS.humanist;
  const titleFont = EXPORT_FONTS[settings.titleFont] || fontFamily;
  const labelTextColor = drawingColor(settings.labelTextColor, palette.ink);
  const option = payload.makeOptions(palette);
  const font = settings.fontSize;
  const labelColor = drawingColor(settings.labelBackgroundColor, palette.panel);
  const channels = [1, 3, 5].map((i) =>
    parseInt(labelColor.slice(i, i + 2), 16),
  );
  const labelBackground =
    settings.labelBackground === false
      ? "transparent"
      : `rgba(${channels.join(",")},0.82)`;
  const titleSize = Math.min(72, font * (terminal ? 1.15 : 1.65));
  const title = wrap(settings.title, settings.width - 64, titleSize);
  const subtitle = wrap(settings.subtitle, settings.width - 64, font);
  const titleHeight = title ? title.split("\n").length * titleSize * 1.22 : 0;
  const subtitleHeight = subtitle
    ? subtitle.split("\n").length * font * 1.5
    : 0;
  const headingBottom = 26 + titleHeight + subtitleHeight;
  option.animation = false;
  option.backgroundColor =
    settings.background === "transparent" ? "transparent" : palette.panel;
  // Use a font without the (c) symbol ligature in the exported canvas/SVG too.
  option.textStyle = {
    fontFamily,
    fontSize: font,
    color: palette.ink,
  };
  option.toolbox = { show: false };
  option.tooltip = { show: false };
  option.title = [
    {
      text: title,
      left: 27,
      top: 20,
      textStyle: {
        color: terminal ? "#ffb433" : palette.ink,
        fontSize: titleSize,
        fontWeight: style?.weight || 650,
        fontFamily: titleFont,
        lineHeight: titleSize * 1.22,
      },
    },
    {
      text: subtitle,
      left: 27,
      top: 20 + titleHeight,
      textStyle: {
        color: palette.muted,
        fontSize: font,
        fontWeight: 400,
        lineHeight: font * 1.5,
      },
    },
  ];
  const footer = wrap(settings.source, settings.width - 64, font * 0.8);
  const footerHeight = footer ? footer.split("\n").length * font * 1.2 + 14 : 0;
  option.graphic = footer
    ? [
        {
          type: "text",
          left: 32,
          bottom: 16,
          style: {
            text: footer,
            fill: palette.muted,
            font: `${font * 0.8}px ${fontFamily}`,
            lineHeight: font * 1.2,
          },
        },
      ]
    : [];
  if (style && !terminal)
    option.graphic.push({
      type: "rect",
      left: 32,
      top: 6,
      shape: {
        width: style === QUICK_STYLES.economist ? 76 : settings.width - 64,
        height: style === QUICK_STYLES.economist ? 10 : 4,
      },
      style: { fill: style.rule },
      silent: true,
    });
  option.grid = {
    left: 32,
    right:
      spec.kind === "bar" && settings.labels === "all"
        ? font * 8
        : settings.labels === "selected" && spec.kind !== "bar"
          ? Math.max(110, font * 5.5)
          : 38,
    top: headingBottom + (spec.comparison && settings.legend ? font * 2.5 : 15),
    bottom: footerHeight + 40,
    containLabel: true,
  };
  if (spec.kind !== "bar") {
    option.dataZoom = [
      {
        type: "inside",
        disabled: true,
        start: zoom?.[0]?.start ?? 0,
        end: zoom?.[0]?.end ?? 100,
        ...(zoom?.[0]?.startValue != null
          ? { startValue: zoom[0].startValue, endValue: zoom[0].endValue }
          : {}),
      },
    ];
  }
  if (option.legend)
    Object.assign(option.legend, {
      show: settings.legend,
      type: "plain",
      top: headingBottom,
      left: 32,
      right: 32,
      textStyle: { color: palette.ink, fontSize: font * 0.85 },
    });
  const decimal = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: settings.decimals,
    maximumFractionDigits: settings.decimals,
  });
  const number = (v) => decimal.format(v);
  for (const axis of [option.xAxis, option.yAxis]) {
    axis.axisLabel = { ...axis.axisLabel, fontSize: font * 0.85, fontFamily };
    if (axis.type === "value") {
      axis.axisLabel.formatter = (v) =>
        number(
          !spec.comparison && spec.unit.endsWith("THOUSAND") ? v / 1000 : v,
        );
      axis.splitLine = {
        show: settings.grid,
        lineStyle: { color: palette.grid },
      };
    }
  }
  if (spec.kind !== "bar") {
    option.yAxis.position = "left";
    option.xAxis.axisLabel.formatter = (v) =>
      settings.dateFormat === "year-month" ? v : month(v);
  }
  if (terminal) {
    Object.assign(option.grid, {
      show: true,
      borderWidth: 1,
      borderColor: "#66747a",
      backgroundColor: {
        type: "linear",
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          { offset: 0, color: "#26373d" },
          { offset: 1, color: "#050b0f" },
        ],
      },
    });
    for (const axis of [option.xAxis, option.yAxis]) {
      axis.axisLabel.color = "#f3f3f3";
      axis.axisLine = { show: true, lineStyle: { color: "#c5ced1", width: 1 } };
      axis.axisTick = { show: true, lineStyle: { color: "#c5ced1" } };
      axis.splitLine = {
        show: settings.grid,
        lineStyle: { color: "#77868c", type: "dotted", width: 1, opacity: 0.8 },
      };
    }
    if (spec.kind !== "bar") {
      option.yAxis.position = "right";
      option.xAxis.axisLabel.showMinLabel = false;
    }
  }
  const comparisons = exportComparisons(spec, settings.comparisons);
  option.series.forEach((series, index) => {
    const points = spec.comparison ? spec.series[index].points : spec.points;
    const valueLabel = (v) =>
      number(
        !spec.comparison && spec.unit.endsWith("THOUSAND") ? v / 1000 : v,
      ) + (spec.unit === "PERCENT" ? "%" : "");
    series.animation = false;
    if (style) {
      const color = spec.comparison
        ? style.colors[index % style.colors.length]
        : settings.color;
      series.itemStyle = { ...series.itemStyle, color };
      series.lineStyle = { ...series.lineStyle, color };
      if (series.areaStyle) series.areaStyle = { opacity: 0 };
    }
    series.label = {
      show: settings.labels === "all",
      position: spec.kind === "bar" ? "right" : "top",
      color: labelTextColor,
      fontFamily,
      fontSize: font * 0.8,
      backgroundColor: labelBackground,
      borderRadius: 3,
      padding: [3, 5],
      formatter: (p) => (finite(p.value) ? valueLabel(p.value) : ""),
    };
    series.labelLayout = { hideOverlap: true };
    if (spec.kind !== "bar") {
      series.lineStyle = { ...series.lineStyle, width: settings.lineWidth };
      series.showSymbol = settings.labels === "all";
      series.symbolSize = 5;
      if (!spec.comparison) {
        series.lineStyle.color = settings.color;
        series.itemStyle = { color: settings.color };
        if (series.areaStyle)
          series.areaStyle = {
            color: settings.color,
            opacity: style ? 0 : 0.12,
          };
      }
    }
    if (terminal && spec.kind !== "bar") {
      series.smooth = false;
      series.areaStyle = {
        origin: "start",
        opacity: spec.comparison ? 0.32 : 0.85,
        color: {
          type: "linear",
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: "#148698" },
            { offset: 0.55, color: "#064763" },
            { offset: 1, color: "#020728" },
          ],
        },
      };
    }
    if (series.markLine) {
      series.markLine.data = settings.references
        ? series.markLine.data.filter((ref) => ref.name !== "Selección")
        : [];
      series.markLine.label = {
        show: true,
        position: "insideEndBottom",
        formatter: (p) => p.name,
        color: palette.muted,
        fontSize: font * 0.75,
        lineHeight: font,
      };
    }
    const ownComparisons = comparisons.filter(
      (c) => c.valid && c.seriesIndex === index,
    );
    const dates = new Set(settings.selectedDates || [settings.selectedDate]);
    for (const c of ownComparisons) {
      dates.add(c.from);
      dates.add(c.to);
    }
    const selectedPoints = points
      .map((p, i) => ({ ...p, index: i }))
      .filter((p) => dates.has(p.date) && finite(p.value));
    series.markPoint = {
      symbol: "circle",
      symbolSize: 8,
      itemStyle: {
        color: series.lineStyle?.color || palette.ink,
        borderColor: palette.panel,
        borderWidth: 2,
      },
      data:
        settings.labels === "selected" && spec.kind !== "bar"
          ? selectedPoints.map((p) => ({
              coord: [p.index, series.data[p.index]],
              value: series.data[p.index],
              label: {
                show: true,
                position: "top",
                distance: 12,
                color: labelTextColor,
                fontFamily,
                fontSize: font * 0.85,
                lineHeight: font * 1.25,
                backgroundColor: labelBackground,
                padding: [4, 6],
                borderRadius: 2,
                formatter:
                  month(p.date) + "\n" + valueLabel(series.data[p.index]),
              },
            }))
          : [],
    };
    if (ownComparisons.length) {
      series.markLine ||= { silent: true, symbol: "none", data: [] };
      series.markLine.data ||= [];
      for (const comparison of ownComparisons) {
        const text = `Var. ${comparison.percent > 0 ? "+" : ""}${number(comparison.percent)}%`;
        const color = drawingColor(
          comparison.color,
          series.lineStyle?.color || series.itemStyle?.color || palette.ink,
        );
        series.markLine.data.push([
          {
            coord: [comparison.fromIndex, series.data[comparison.fromIndex]],
            symbol: "none",
            name: text,
            exportComparisonId: comparison.id,
            lineStyle: {
              color,
              width: Math.max(1.5, settings.lineWidth),
              type: comparison.style === "line" ? "dashed" : "solid",
              opacity: 0.9,
            },
            label: {
              show: true,
              formatter: text,
              position: "middle",
              rotate: 0,
              color: labelTextColor,
              fontFamily,
              fontSize: font * 0.9,
              lineHeight: font * 1.2,
              backgroundColor: labelBackground,
              padding: [5, 8],
              borderRadius: 2,
            },
          },
          {
            coord: [comparison.toIndex, series.data[comparison.toIndex]],
            symbol: comparison.style === "line" ? "none" : "arrow",
            itemStyle: { color },
            symbolSize: Math.max(8, font * 0.6),
          },
        ]);
      }
    }
  });
  return option;
}

let activeDialog;
export function openChartExport(payload) {
  activeDialog?.close();
  const { spec, context } = payload;
  const points = spec.comparison ? spec.series[0].points : spec.points;
  const isBar = spec.kind === "bar";
  const first = Math.ceil(
    ((payload.zoom?.[0]?.start ?? 0) * Math.max(0, points.length - 1)) / 100,
  );
  const last = Math.floor(
    ((payload.zoom?.[0]?.end ?? 100) * Math.max(0, points.length - 1)) / 100,
  );
  const dates = isBar ? [] : points.slice(first, last + 1).map((p) => p.date);
  const date = dates.includes(context.date) ? context.date : dates.at(-1);
  const description = [
    context.entity,
    context.date ? `Corte: ${month(context.date)}` : "",
    units[spec.unit] || spec.unit,
  ]
    .filter(Boolean)
    .join(" · ");
  const dialog = document.createElement("dialog");
  activeDialog = dialog;
  dialog.className = "chart-export-dialog";
  dialog.setAttribute("aria-labelledby", "chart-export-heading");
  dialog.innerHTML = `<header class="chart-export-head"><div><h2 id="chart-export-heading">Preparar imagen</h2><p>Configura la imagen y añade anotaciones en la vista previa.</p></div><button type="button" data-close aria-label="Cerrar">✕</button></header>
    <div class="chart-export-layout"><form class="chart-export-controls">
      <details class="export-section" open><summary>Ajustes rápidos</summary><div class="export-section-body">
      <label>Estilo<select name="quickStyle"><option value="none">Ninguno · personalizado</option>${Object.entries(
        QUICK_STYLES,
      )
        .map(([id, p]) => `<option value="${id}">${p.name}</option>`)
        .join("")}</select></label>
      <p class="export-control-note" data-style-note>Elige una base visual y personalízala en las secciones siguientes. Ninguno recupera tus ajustes anteriores.</p>
      <p class="export-control-note">Estilos inspirados en las referencias, con tipografías compatibles.</p>
      </div></details>
      <details class="export-section"><summary>1 · Título y fuente</summary><div class="export-section-body"><label>Título<input name="title" maxlength="160" value="${escape(spec.label)}"></label>
      <label>Subtítulo<input name="subtitle" maxlength="220" value="${escape(description)}"></label>
      <label>Fuente o nota<input name="source" maxlength="300" value="${escape("Fuente: SBS · " + description)}"></label></div></details>
      <details class="export-section"><summary>2 · Formato y tamaño</summary><div class="export-section-body"><div class="export-field-row"><label>Formato<select name="format"><option value="png">PNG</option><option value="jpeg">JPG</option><option value="svg">SVG · vectorial</option></select></label><label>Fondo<select name="background"><option value="light">Claro</option><option value="dark">Oscuro</option><option value="transparent">Transparente</option></select></label></div>
      <label>Resolución de descarga<select name="exportScale"><option value="1">1× · Original</option><option value="2" selected>2× · Alta resolución</option><option value="3">3× · Máxima resolución</option></select></label>
      <p class="export-control-note">PNG conserva la imagen sin compresión con pérdida. SVG es vectorial. JPG usa compresión con pérdida, incluso con calidad máxima.</p>
      <label>Tamaño del gráfico<select name="preset"><option value="1600x900">Presentación · 1600 × 900</option><option value="1920x1080">Full HD · 1920 × 1080</option><option value="1200x800">Informe · 1200 × 800</option><option value="1200x1200">Cuadrado · 1200 × 1200</option><option value="custom">Personalizado</option></select></label>
      <div class="export-field-row"><label>Ancho · px<input name="width" type="number" min="640" max="3840" step="1" value="1600" required></label><label>Alto · px<input name="height" type="number" min="360" max="2160" step="1" value="900" required></label></div>
      </div></details><details class="export-section"><summary>3 · Etiquetas y comparaciones</summary><div class="export-section-body"><div class="export-field-row"><label>Etiquetas<select name="labels"><option value="selected" ${isBar ? "hidden" : ""}>Fechas elegidas</option><option value="all" ${isBar ? "selected" : ""}>Todos los valores</option><option value="none">Sin etiquetas</option></select></label><label>Decimales<select name="decimals"><option>0</option><option>1</option><option selected>2</option><option>3</option><option>4</option></select></label></div>
      <label class="export-check"><input type="checkbox" name="labelBackground" checked> Fondo sutil en las etiquetas</label>
      <label>Color del texto de etiquetas<input name="labelTextColor" type="color" value="#102033"></label>
      <label>Color del fondo de etiquetas<input name="labelBackgroundColor" type="color" value="#ffffff"></label>
      <label class="export-check"><input name="labelConnectors" type="checkbox"> Líneas de unión en las etiquetas</label>
      <p class="export-control-note">Toca una etiqueta en la vista previa para moverla o ajustar su línea de unión.</p>
      ${
        isBar
          ? ""
          : `<fieldset class="export-label-dates"><legend>Fechas de etiqueta</legend><div class="export-date-chips"></div><div class="export-date-add"><select name="labelDate" aria-label="Fecha para agregar una etiqueta"></select><button type="button" data-add-date>Agregar</button></div></fieldset>
      <fieldset class="export-growth"><legend>Variación entre fechas</legend><div class="export-growth-rows"></div><button type="button" data-add-growth>Agregar comparación</button><p class="export-control-note">Cada comparación también etiqueta sus extremos.</p></fieldset>`
      }
      </div></details><details class="export-section"><summary>4 · Estilo del gráfico</summary><div class="export-section-body">
        <div class="export-field-row"><label>Tamaño de texto<input name="fontSize" type="number" min="12" max="72" value="28" required></label><label>Fechas<select name="dateFormat" ${isBar ? "disabled" : ""}><option value="month">Jul 2026</option><option value="year-month">2026-07</option></select></label></div>
        ${isBar ? "" : `<div class="export-field-row"><label>Grosor de línea<input name="lineWidth" type="number" min="1" max="6" step="0.5" value="2.5"></label>${spec.comparison ? "" : '<label>Color de línea<input name="color" type="color" value="#1c7ff2"></label>'}</div>`}
        <div class="export-field-row"><label>Tipografía<select name="fontFamily"><option value="humanist">Segoe UI</option><option value="sans">Arial</option><option value="serif">Georgia</option><option value="times">Times New Roman</option><option value="mono">Consolas</option></select></label><label>Tipografía del título<select name="titleFont"><option value="humanist">Segoe UI</option><option value="sans">Arial</option><option value="serif">Georgia</option><option value="times">Times New Roman</option><option value="mono">Consolas</option></select></label></div>
        <label class="export-check"><input name="grid" type="checkbox" checked> Mostrar cuadrícula</label>
        ${spec.comparison ? '<label class="export-check"><input name="legend" type="checkbox" checked> Mostrar leyenda</label>' : '<label class="export-check"><input name="references" type="checkbox" checked> Promedio, máximo y mínimo</label>'}
      </div></details>
    <details class="export-section"><summary>5 · Fondo y presentación</summary><div class="export-section-body">
      <label>Fondo exterior<select name="frameType"><option value="none">Sin marco</option><option value="shadow">Solo sombra · exterior transparente</option><option value="solid">Color sólido</option><option value="gradient">Degradado lineal</option><option value="radial">Degradado radial</option></select></label>
      <div class="frame-presets" role="group" aria-label="Fondos predefinidos">${Object.entries(
        PRESENTATION_PRESETS,
      )
        .map(
          ([id, p]) =>
            `<button type="button" data-frame-preset="${id}" style="--frame-start:${p.start};--frame-end:${p.end}" title="${p.name}"><span></span>${p.name}</button>`,
        )
        .join("")}</div>
      <div class="export-field-row"><label>Color inicial<input type="color" name="frameStart" value="#537895"></label><label>Color final<input type="color" name="frameEnd" value="#12334c"></label></div>
      <label>Dirección del degradado<select name="frameAngle"><option value="0">Horizontal</option><option value="90">Vertical</option><option value="45">Diagonal ↘</option><option value="135" selected>Diagonal ↙</option></select></label>
      <div class="export-field-row"><label>Margen exterior · px<input type="number" name="frameMargin" value="48" min="0" max="160" step="1"></label><label>Esquinas · px<input type="number" name="frameRadius" value="18" min="0" max="80" step="1"></label></div>
      <label class="export-check"><input type="checkbox" name="framePreserveSize" checked> Conservar el tamaño del gráfico</label>
      <p class="export-control-note">El margen se añade alrededor del gráfico. Desactívalo para ajustar todo al tamaño de lienzo elegido.</p>
      <label>Patrón<select name="framePattern">${Object.entries(
        PRESENTATION_PATTERNS,
      )
        .map(([id, name]) => `<option value="${id}">${name}</option>`)
        .join("")}</select></label>
      <div class="export-field-row"><label>Color del patrón<input type="color" name="patternColor" value="#64748b"></label><label>Separación · px<input type="number" name="patternSize" min="10" max="160" value="32"></label></div>
      <div class="export-field-row"><label>Opacidad · %<input type="number" name="patternOpacity" min="0" max="100" value="15"></label><label>Grosor · px<input type="number" name="patternStroke" min="0.5" max="4" step="0.5" value="1"></label></div>
      <label>Sombra<input type="range" name="frameShadow" min="0" max="100" value="25" aria-label="Intensidad de sombra"></label>
      <p class="export-control-note">Los fondos y patrones son vectoriales. 0 elimina la sombra o el redondeado. Solo sombra conserva la transparencia exterior en PNG y SVG; JPG usa fondo blanco.</p>
    </div></details></form><section class="chart-export-preview" aria-label="Vista previa"><div class="export-preview-surface"><img alt="Vista previa del gráfico personalizado"></div><p class="export-preview-size"></p><p class="export-preview-status" role="status" aria-live="polite"></p></section></div>
    <footer class="chart-export-footer"><span>La imagen incluye el rango visible del gráfico.</span><div class="chart-export-actions"><button type="button" data-copy-chart>Copiar gráfico</button><button type="button" data-download>Descargar imagen</button></div></footer>`;
  const trigger = document.activeElement;
  const unlockScroll = lockPageScroll();
  document.body.append(dialog);
  const form = dialog.querySelector("form");
  const field = (name) => form.elements.namedItem(name);
  const status = dialog.querySelector(".export-preview-status");
  const download = dialog.querySelector("[data-download]");
  const copy = dialog.querySelector("[data-copy-chart]");
  const clipboardAvailable = !!(
    window.isSecureContext &&
    navigator.clipboard?.write &&
    window.ClipboardItem
  );
  copy.title = clipboardAvailable
    ? "Copiar como PNG a la resolución elegida"
    : "Este navegador no permite copiar imágenes. Usa Descargar imagen.";
  const setDisabled = (value) => {
    download.disabled = value;
    copy.disabled = value || !clipboardAvailable;
  };
  let svg = "",
    previewUrl,
    timer,
    busy = false;
  const setPreviewImage = (value) => {
    if (!value) return;
    svg = value;
    const next = URL.createObjectURL(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
    );
    dialog.querySelector(".export-preview-surface img").src = next;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = next;
  };
  const drawingEditor = createDrawingEditor(
    dialog.querySelector(".chart-export-preview"),
    form,
    setPreviewImage,
  );
  const previewResize = initPreviewResize(dialog);
  const sections = [...form.querySelectorAll(".export-section")];
  for (const section of sections) {
    section.setAttribute("name", "chart-export-settings");
    section.addEventListener("toggle", () => {
      if (section.open)
        for (const other of sections) if (other !== section) other.open = false;
    });
  }
  let customStyle = null;
  const readStyleFields = () =>
    Object.fromEntries(
      Object.keys(quickStyleFields("mckinsey")).map((name) => {
        const input = field(name);
        return [
          name,
          input?.type === "checkbox" ? input.checked : input?.value,
        ];
      }),
    );
  const applyStyleFields = (values) => {
    for (const [name, value] of Object.entries(values)) {
      const input = field(name);
      if (!input || value == null) continue;
      if (input.type === "checkbox") input.checked = value;
      else input.value = value;
    }
  };
  const selectedDates = new Set(date ? [date] : []);
  const comparisons = [];
  let nextComparisonId = 0;
  const settings = () => ({
    quickStyle: field("quickStyle").value,
    fontFamily: field("fontFamily").value,
    titleFont: field("titleFont").value,
    labelTextColor: field("labelTextColor").value,
    title: field("title").value.trim(),
    subtitle: field("subtitle").value.trim(),
    source: field("source").value.trim(),
    width: Number(field("width").value),
    height: Number(field("height").value),
    fontSize: Number(field("fontSize").value),
    background: field("background").value,
    exportScale: Number(field("exportScale").value),
    framePreserveSize: field("framePreserveSize").checked,
    framePattern: field("framePattern").value,
    patternColor: field("patternColor").value,
    patternSize: Number(field("patternSize").value),
    patternOpacity: Number(field("patternOpacity").value),
    patternStroke: Number(field("patternStroke").value),
    frameType: field("frameType").value,
    frameStart: field("frameStart").value,
    frameEnd: field("frameEnd").value,
    frameAngle: Number(field("frameAngle").value),
    frameMargin: Number(field("frameMargin").value),
    frameRadius: Number(field("frameRadius").value),
    frameShadow: Number(field("frameShadow").value),
    labels: field("labels").value,
    labelBackground: field("labelBackground").checked,
    labelBackgroundColor: field("labelBackgroundColor").value,
    labelConnectors: field("labelConnectors").checked,
    selectedDates: [...selectedDates],
    comparisons: comparisons.map((item) => ({ ...item })),
    format: field("format").value,
    decimals: Number(field("decimals").value),
    dateFormat: field("dateFormat").value,
    lineWidth: Number(field("lineWidth")?.value || 2.5),
    color: field("color")?.value || "#1c7ff2",
    grid: field("grid").checked,
    legend: field("legend")?.checked ?? false,
    references: field("references")?.checked ?? false,
  });
  function renderPreview() {
    clearTimeout(timer);
    if (!dialog.open) return;
    const transparent = field("background").querySelector(
      '[value="transparent"]',
    );
    transparent.disabled =
      field("format").value === "jpeg" || field("frameType").value === "shadow";
    if (transparent.disabled && field("background").value === "transparent")
      field("background").value = "light";
    if (dialog.querySelector(".export-label-dates"))
      dialog.querySelector(".export-label-dates").disabled =
        field("labels").value !== "selected";
    const frameType = field("frameType").value;
    for (const name of [
      "frameStart",
      "frameEnd",
      "frameAngle",
      "frameMargin",
      "frameRadius",
      "frameShadow",
    ])
      field(name).disabled =
        frameType === "none" ||
        (frameType === "solid" && ["frameEnd", "frameAngle"].includes(name)) ||
        (frameType === "radial" && name === "frameAngle") ||
        (frameType === "shadow" &&
          ["frameStart", "frameEnd", "frameAngle"].includes(name));
    field("framePreserveSize").disabled = frameType === "none";
    field("framePattern").disabled = ["none", "shadow"].includes(frameType);
    for (const name of [
      "patternColor",
      "patternSize",
      "patternOpacity",
      "patternStroke",
    ])
      field(name).disabled =
        field("framePattern").disabled ||
        field("framePattern").value === "none";
    field("exportScale").disabled = field("format").value === "svg";
    const marginLimit = Math.min(
      160,
      Math.floor(
        Math.min(Number(field("width").value), Number(field("height").value)) *
          0.25,
      ),
    );
    if (Number.isFinite(marginLimit) && marginLimit > 0) {
      field("frameMargin").max = marginLimit;
      if (Number(field("frameMargin").value) > marginLimit)
        field("frameMargin").value = marginLimit;
    }
    if (!form.checkValidity()) {
      status.textContent =
        "Revisa las dimensiones y el tamaño de texto indicados.";
      setDisabled(true);
      return;
    }
    const s = settings();
    const size = presentationSize(s.width, s.height, s);
    const pixels = rasterSize(size.width, size.height, s.exportScale);
    if (s.format !== "svg" && !pixels.valid) {
      status.textContent =
        "La imagen supera 48 megapíxeles. Reduce la resolución, el tamaño o elige SVG.";
      setDisabled(true);
      return;
    }
    const calculated = exportComparisons(spec, s.comparisons);
    for (let i = 0; i < calculated.length; i++) {
      const result = dialog.querySelector(
        `[data-growth-result="${comparisons[i].id}"]`,
      );
      if (result)
        result.textContent = calculated[i].valid
          ? `Var. ${calculated[i].percent > 0 ? "+" : ""}${calculated[i].percent.toFixed(s.decimals)}%`
          : calculated[i].reason;
    }
    const invalid = calculated.find((c) => !c.valid);
    if (invalid) {
      status.textContent = invalid.reason;
      setDisabled(true);
      return;
    }
    const host = document.createElement("div");
    // Detached SVG renderer avoids any effect on the visible chart or page width.
    let chart;
    try {
      chart = window.echarts.init(host, null, {
        renderer: "svg",
        width: s.width,
        height: s.height,
      });
      const option = buildExportOptions(payload, s);
      if (s.height - option.grid.top - option.grid.bottom < 120) {
        status.textContent =
          "Aumenta el alto o reduce el texto para dejar espacio al gráfico.";
        setDisabled(true);
        return;
      }
      const background = option.backgroundColor;
      option.backgroundColor = "transparent";
      // Render data once to resolve exact coordinates; editable labels live in a separate SVG layer.
      const layouts = new Map();
      for (const series of option.series)
        series.labelLayout = (p) => {
          layouts.set(`${p.seriesIndex}:${p.dataIndex}`, p);
          return { hideOverlap: true };
        };
      chart.setOption(option, true);
      const labels = collectExportLabels(chart, option, s, layouts);
      for (const series of option.series) {
        series.label.show = false;
        for (const point of series.markPoint?.data || [])
          point.label.show = false;
        for (const line of series.markLine?.data || [])
          if (Array.isArray(line)) line[0].label.show = false;
      }
      chart.setOption(option, true);
      const base = chart
        .renderToSVGString()
        .replace(
          /(<svg\b[^>]*>)/,
          `$1<rect width="${s.width}" height="${s.height}" fill="${background}"/><g data-chart-content="true">`,
        )
        .replace(/<\/svg>\s*$/, "</g></svg>");
      setPreviewImage(
        drawingEditor.setBase(base, s.width, s.height, labels, s),
      );
      dialog.querySelector(".export-preview-size").textContent =
        s.format === "svg"
          ? `${size.width} × ${size.height} · SVG vectorial`
          : `${pixels.width} × ${pixels.height} px · ${s.format.toUpperCase()} · ${s.exportScale}×`;
      const selectedSeries = spec.comparison
        ? spec.series
        : [{ points: spec.points }];
      const missing =
        s.labels === "selected" &&
        selectedSeries.some((series) =>
          s.selectedDates.some(
            (date) =>
              !finite(series.points.find((p) => p.date === date)?.value),
          ),
        );
      status.textContent = missing
        ? "Las fechas sin dato en una serie no muestran etiqueta."
        : "Vista previa lista.";
      setDisabled(busy);
    } catch (error) {
      status.textContent =
        "No se pudo preparar la imagen. Ajusta las opciones e inténtalo nuevamente.";
      setDisabled(true);
    } finally {
      chart?.dispose();
    }
  }
  const dateOptions = (selected, available = dates) =>
    available
      .map(
        (d) =>
          `<option value="${escape(d)}" ${d === selected ? "selected" : ""}>${escape(month(d))}</option>`,
      )
      .join("");
  function renderDates() {
    if (isBar) return;
    dialog.querySelector(".export-date-chips").innerHTML = [...selectedDates]
      .sort()
      .map(
        (d) =>
          `<button type="button" data-remove-date="${escape(d)}" aria-label="Quitar etiqueta ${escape(month(d))}">${escape(month(d))} ×</button>`,
      )
      .join("");
    const available = dates.filter((d) => !selectedDates.has(d));
    field("labelDate").innerHTML = dateOptions(available.at(-1), available);
    dialog.querySelector("[data-add-date]").disabled = !available.length;
  }
  function renderComparisons() {
    const allSeries = spec.comparison ? spec.series : [{ name: spec.label }];
    dialog.querySelector(".export-growth-rows").innerHTML = comparisons
      .map(
        (item) =>
          `<div class="export-growth-row" data-growth-row="${item.id}">
        ${spec.comparison ? `<label>Serie<select data-growth-field="seriesIndex">${allSeries.map((series, i) => `<option value="${i}" ${i === Number(item.seriesIndex) ? "selected" : ""}>${escape(series.name)}</option>`).join("")}</select></label>` : ""}
        <div class="export-field-row"><label>Desde<select data-growth-field="from">${dateOptions(item.from)}</select></label><label>Hasta<select data-growth-field="to">${dateOptions(item.to)}</select></label></div>
        <label>Trazo<select data-growth-field="style"><option value="arrow" ${item.style === "arrow" ? "selected" : ""}>Flecha</option><option value="line" ${item.style === "line" ? "selected" : ""}>Línea</option></select></label>
        <label>Color del trazo<input type="color" data-growth-field="color" value="${drawingColor(item.color)}"></label>
        <div class="export-growth-result"><span data-growth-result="${item.id}"></span><button type="button" data-remove-growth="${item.id}">Quitar</button></div>
      </div>`,
      )
      .join("");
  }
  form.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.framePreset) {
      const preset = PRESENTATION_PRESETS[button.dataset.framePreset];
      if (!preset) return;
      field("frameType").value = preset.type || "gradient";
      field("frameStart").value = preset.start;
      field("frameEnd").value = preset.end;
      field("patternColor").value = ["night", "blue", "mint"].includes(
        button.dataset.framePreset,
      )
        ? "#ffffff"
        : "#64748b";
    } else if (button.hasAttribute("data-add-date")) {
      selectedDates.add(field("labelDate").value);
      renderDates();
    } else if (button.dataset.removeDate) {
      selectedDates.delete(button.dataset.removeDate);
      renderDates();
    } else if (button.hasAttribute("data-add-growth")) {
      const chosen = [...selectedDates].sort();
      const to = chosen.at(-1) || dates.at(-1);
      const priorYear = to ? `${Number(to.slice(0, 4)) - 1}${to.slice(4)}` : "";
      const from =
        chosen.length > 1
          ? chosen[0]
          : dates.includes(priorYear)
            ? priorYear
            : dates[0];
      comparisons.push({
        id: ++nextComparisonId,
        seriesIndex: 0,
        from,
        to,
        style: "arrow",
        color: spec.comparison
          ? drawingColor(spec.series[0]?.color)
          : field("color")?.value || "#1c7ff2",
      });
      renderComparisons();
    } else if (button.dataset.removeGrowth) {
      const index = comparisons.findIndex(
        (c) => c.id === Number(button.dataset.removeGrowth),
      );
      if (index >= 0) comparisons.splice(index, 1);
      renderComparisons();
    } else return;
    renderPreview();
  });
  // Wheel gestures over the fixed preview scroll options instead of the page.
  dialog.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey || form.contains(event.target)) return;
      form.scrollTop += event.deltaY * (event.deltaMode === 1 ? 16 : 1);
      event.preventDefault();
    },
    { passive: false },
  );
  form.addEventListener("submit", (event) => event.preventDefault());
  form.addEventListener("input", (event) => {
    if (["width", "height"].includes(event.target.name))
      field("preset").value = "custom";
    setDisabled(true);
    clearTimeout(timer);
    timer = setTimeout(renderPreview, 160);
  });
  form.addEventListener("change", (event) => {
    if (event.target.name === "quickStyle") {
      const preset = quickStyleFields(event.target.value);
      if (preset) {
        customStyle ||= readStyleFields();
        applyStyleFields(preset);
      } else if (customStyle) {
        applyStyleFields(customStyle);
        customStyle = null;
      }
      dialog.querySelector("[data-style-note]").textContent =
        QUICK_STYLES[event.target.value]?.note ||
        "Tus ajustes personalizados. Puedes partir de un estilo y seguir editándolo.";
    }
    if (event.target.dataset.growthField) {
      const row = event.target.closest("[data-growth-row]");
      const item = comparisons.find(
        (c) => c.id === Number(row.dataset.growthRow),
      );
      if (item) item[event.target.dataset.growthField] = event.target.value;
    }
    if (event.target.name === "labelConnectors")
      drawingEditor.setConnectors(event.target.checked);
    if (
      event.target.name === "background" &&
      !field("labelBackgroundColor").dataset.custom
    ) {
      field("labelBackgroundColor").value =
        event.target.value === "dark"
          ? palettes.dark.panel
          : palettes.light.panel;
    }
    if (
      event.target.name === "background" &&
      !field("labelTextColor").dataset.custom
    )
      field("labelTextColor").value =
        event.target.value === "dark" ? palettes.dark.ink : palettes.light.ink;
    if (event.target.name === "labelTextColor")
      field("labelTextColor").dataset.custom = "true";
    if (event.target.name === "labelBackgroundColor")
      field("labelBackgroundColor").dataset.custom = "true";
    if (event.target.name === "preset" && event.target.value !== "custom") {
      const [width, height] = event.target.value.split("x");
      field("width").value = width;
      field("height").value = height;
    }
    renderPreview();
  });
  copy.addEventListener("click", async () => {
    if (busy || !clipboardAvailable) return;
    renderPreview();
    if (copy.disabled) return;
    const s = { ...settings(), format: "png" };
    const size = presentationSize(s.width, s.height, s);
    if (!rasterSize(size.width, size.height, s.exportScale).valid) {
      status.textContent =
        "La copia supera 48 megapíxeles. Reduce la resolución o el tamaño.";
      return;
    }
    busy = true;
    setDisabled(true);
    copy.textContent = "Copiando…";
    try {
      // Start clipboard.write in the user gesture; Safari accepts the pending PNG promise.
      const png = exportImageBlob(svg, s);
      png.catch(() => {});
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": png }),
      ]);
      if (dialog.open)
        status.textContent = "Gráfico copiado. Pégalo con Ctrl+V o Pegar.";
    } catch {
      if (dialog.open)
        status.textContent =
          "No se pudo copiar. Revisa el permiso del portapapeles o usa Descargar imagen.";
    } finally {
      busy = false;
      copy.textContent = "Copiar gráfico";
      setDisabled(false);
    }
  });
  download.addEventListener("click", async () => {
    if (busy) return;
    renderPreview();
    if (download.disabled) return;
    busy = true;
    setDisabled(true);
    download.textContent = "Preparando…";
    const s = settings();
    try {
      const blob = await exportImageBlob(svg, s);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${exportFilename(s.title || spec.label)}.${s.format === "jpeg" ? "jpg" : s.format}`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (dialog.open) status.textContent = "Imagen descargada.";
    } catch {
      if (dialog.open)
        status.textContent =
          "No se pudo descargar. Inténtalo nuevamente o elige SVG.";
    } finally {
      busy = false;
      setDisabled(false);
      download.textContent = "Descargar imagen";
    }
  });
  dialog
    .querySelector("[data-close]")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      dialog.close();
  });
  dialog.addEventListener(
    "close",
    () => {
      clearTimeout(timer);
      previewResize.destroy();
      drawingEditor.destroy();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      dialog.remove();
      unlockScroll();
      if (activeDialog === dialog) activeDialog = null;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    },
    { once: true },
  );
  renderDates();
  dialog.showModal();
  dialog.tabIndex = -1;
  dialog.focus({ preventScroll: true });
  renderPreview();
}
