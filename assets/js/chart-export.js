import { escape, month, units } from "./format.js";
import { finite } from "./analytics.js";

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

// Always build a separate chart, preserving the dashboard's zoom, palette and series.
export function buildExportOptions(payload, settings) {
  const { spec, zoom } = payload;
  const palette = palettes[settings.background === "dark" ? "dark" : "light"];
  const option = payload.makeOptions(palette);
  const font = settings.fontSize;
  const title = wrap(settings.title, settings.width - 64, font * 1.65);
  const subtitle = wrap(settings.subtitle, settings.width - 64, font);
  const titleHeight = title ? title.split("\n").length * font * 2 : 0;
  const subtitleHeight = subtitle
    ? subtitle.split("\n").length * font * 1.5
    : 0;
  const headingBottom = 26 + titleHeight + subtitleHeight;
  option.animation = false;
  option.backgroundColor =
    settings.background === "transparent" ? "transparent" : palette.panel;
  // Use a font without the (c) symbol ligature in the exported canvas/SVG too.
  option.textStyle = {
    fontFamily: "Segoe UI, Arial, sans-serif",
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
        color: palette.ink,
        fontSize: font * 1.65,
        fontWeight: 650,
        lineHeight: font * 2,
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
            font: `${font * 0.8}px Segoe UI, Arial, sans-serif`,
            lineHeight: font * 1.2,
          },
        },
      ]
    : [];
  option.grid = {
    left: 32,
    right:
      spec.kind === "bar" && settings.labels === "all"
        ? font * 8
        : settings.labels === "selected" && spec.kind !== "bar"
          ? 110
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
    axis.axisLabel = { ...axis.axisLabel, fontSize: font * 0.85 };
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
  option.series.forEach((series, index) => {
    const points = spec.comparison ? spec.series[index].points : spec.points;
    const valueLabel = (v) =>
      number(
        !spec.comparison && spec.unit.endsWith("THOUSAND") ? v / 1000 : v,
      ) + (spec.unit === "PERCENT" ? "%" : "");
    series.animation = false;
    series.label = {
      show: settings.labels === "all",
      position: spec.kind === "bar" ? "right" : "top",
      color: palette.ink,
      fontSize: font * 0.8,
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
          series.areaStyle = { color: settings.color, opacity: 0.12 };
      }
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
    // Label the exact chosen date, never a previous non-null observation.
    const selectedIndex = points.findIndex(
      (p) => p.date === settings.selectedDate,
    );
    const selected = points[selectedIndex];
    if (
      settings.labels === "selected" &&
      selected &&
      finite(selected.value) &&
      spec.kind !== "bar"
    ) {
      const value = series.data[selectedIndex];
      series.markPoint = {
        symbol: "circle",
        symbolSize: 8,
        itemStyle: {
          color: series.lineStyle.color || palette.ink,
          borderColor: palette.panel,
          borderWidth: 2,
        },
        data: [
          {
            coord: [selectedIndex, value],
            value,
            label: {
              show: true,
              position: "top",
              distance: 12,
              color: palette.ink,
              fontSize: font * 0.85,
              lineHeight: font * 1.25,
              backgroundColor:
                settings.background === "transparent"
                  ? "transparent"
                  : palette.panel,
              padding: [4, 6],
              borderRadius: 2,
              formatter: month(selected.date) + "\n" + valueLabel(value),
            },
          },
        ],
      };
    } else series.markPoint = { data: [] };
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
  dialog.innerHTML = `<header class="chart-export-head"><div><h2 id="chart-export-heading">Preparar imagen</h2><p>Personaliza el gráfico y revisa cómo quedará.</p></div><button type="button" data-close aria-label="Cerrar">✕</button></header>
    <div class="chart-export-layout"><form class="chart-export-controls">
      <label>Título<input name="title" maxlength="160" value="${escape(spec.label)}"></label>
      <label>Subtítulo<input name="subtitle" maxlength="220" value="${escape(description)}"></label>
      <div class="export-field-row"><label>Formato<select name="format"><option value="png">PNG</option><option value="jpeg">JPG</option><option value="svg">SVG · vectorial</option></select></label><label>Fondo<select name="background"><option value="light">Claro</option><option value="dark">Oscuro</option><option value="transparent">Transparente</option></select></label></div>
      <label>Tamaño<select name="preset"><option value="1600x900">Presentación · 1600 × 900</option><option value="1920x1080">Full HD · 1920 × 1080</option><option value="1200x800">Informe · 1200 × 800</option><option value="1200x1200">Cuadrado · 1200 × 1200</option><option value="custom">Personalizado</option></select></label>
      <div class="export-field-row"><label>Ancho · px<input name="width" type="number" min="640" max="3840" step="1" value="1600" required></label><label>Alto · px<input name="height" type="number" min="360" max="2160" step="1" value="900" required></label></div>
      <div class="export-field-row"><label>Etiquetas<select name="labels"><option value="selected" ${isBar ? "hidden" : ""}>Fecha elegida</option><option value="all" ${isBar ? "selected" : ""}>Todos los valores</option><option value="none">Sin etiquetas</option></select></label><label>Decimales<select name="decimals"><option>0</option><option>1</option><option selected>2</option><option>3</option><option>4</option></select></label></div>
      ${isBar ? "" : `<label>Fecha de la etiqueta<select name="selectedDate">${dates.map((d) => `<option value="${escape(d)}" ${d === date ? "selected" : ""}>${escape(month(d))}</option>`).join("")}</select></label>`}
      <details><summary>Más opciones</summary>
        <div class="export-field-row"><label>Tamaño de texto<input name="fontSize" type="number" min="12" max="28" value="18" required></label><label>Fechas<select name="dateFormat" ${isBar ? "disabled" : ""}><option value="month">Jul 2026</option><option value="year-month">2026-07</option></select></label></div>
        ${isBar ? "" : `<div class="export-field-row"><label>Grosor de línea<input name="lineWidth" type="number" min="1" max="6" step="0.5" value="2.5"></label>${spec.comparison ? "" : '<label>Color de línea<input name="color" type="color" value="#1c7ff2"></label>'}</div>`}
        <label class="export-check"><input name="grid" type="checkbox" checked> Mostrar cuadrícula</label>
        ${spec.comparison ? '<label class="export-check"><input name="legend" type="checkbox" checked> Mostrar leyenda</label>' : '<label class="export-check"><input name="references" type="checkbox" checked> Promedio, máximo y mínimo</label>'}
        <label>Fuente o nota<input name="source" maxlength="300" value="${escape("Fuente: SBS · " + description)}"></label>
      </details>
    </form><section class="chart-export-preview" aria-label="Vista previa"><div class="export-preview-surface"><img alt="Vista previa del gráfico personalizado"></div><p class="export-preview-size"></p><p class="export-preview-status" role="status" aria-live="polite"></p></section></div>
    <footer class="chart-export-footer"><span>La imagen incluye el rango visible del gráfico.</span><button type="button" data-download>Descargar imagen</button></footer>`;
  const trigger = document.activeElement;
  document.body.append(dialog);
  const form = dialog.querySelector("form");
  const field = (name) => form.elements.namedItem(name);
  const status = dialog.querySelector(".export-preview-status");
  const download = dialog.querySelector("[data-download]");
  let svg = "",
    previewUrl,
    timer,
    busy = false;
  const settings = () => ({
    title: field("title").value.trim(),
    subtitle: field("subtitle").value.trim(),
    source: field("source").value.trim(),
    width: Number(field("width").value),
    height: Number(field("height").value),
    fontSize: Number(field("fontSize").value),
    background: field("background").value,
    labels: field("labels").value,
    selectedDate: field("selectedDate")?.value,
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
    transparent.disabled = field("format").value === "jpeg";
    if (transparent.disabled && field("background").value === "transparent")
      field("background").value = "light";
    if (field("selectedDate"))
      field("selectedDate").disabled = field("labels").value !== "selected";
    if (!form.checkValidity()) {
      status.textContent =
        "Revisa las dimensiones y el tamaño de texto indicados.";
      download.disabled = true;
      return;
    }
    const s = settings();
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
        download.disabled = true;
        return;
      }
      chart.setOption(option, true);
      svg = chart.renderToSVGString();
      const next = URL.createObjectURL(
        new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
      );
      dialog.querySelector("img").src = next;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = next;
      dialog.querySelector(".export-preview-size").textContent =
        `${s.width} × ${s.height} px · ${s.format.toUpperCase()}`;
      const selectedSeries = spec.comparison
        ? spec.series
        : [{ points: spec.points }];
      const missing =
        s.labels === "selected" &&
        selectedSeries.some(
          (series) =>
            !finite(
              series.points.find((p) => p.date === s.selectedDate)?.value,
            ),
        );
      status.textContent = missing
        ? "Las series sin dato en esa fecha no muestran etiqueta."
        : "Vista previa lista.";
      download.disabled = busy;
    } catch (error) {
      status.textContent =
        "No se pudo preparar la imagen. Ajusta las opciones e inténtalo nuevamente.";
      download.disabled = true;
    } finally {
      chart?.dispose();
    }
  }
  form.addEventListener("submit", (event) => event.preventDefault());
  form.addEventListener("input", (event) => {
    if (["width", "height"].includes(event.target.name))
      field("preset").value = "custom";
    download.disabled = true;
    clearTimeout(timer);
    timer = setTimeout(renderPreview, 160);
  });
  form.addEventListener("change", (event) => {
    if (event.target.name === "preset" && event.target.value !== "custom") {
      const [width, height] = event.target.value.split("x");
      field("width").value = width;
      field("height").value = height;
    }
    renderPreview();
  });
  download.addEventListener("click", async () => {
    if (busy) return;
    renderPreview();
    if (download.disabled) return;
    busy = true;
    download.disabled = true;
    download.textContent = "Preparando…";
    const s = settings();
    let rasterUrl;
    try {
      let blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      if (s.format !== "svg") {
        rasterUrl = URL.createObjectURL(blob);
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = rasterUrl;
        });
        const canvas = document.createElement("canvas");
        canvas.width = s.width;
        canvas.height = s.height;
        const ctx = canvas.getContext("2d");
        if (s.format === "jpeg") {
          ctx.fillStyle =
            s.background === "dark" ? palettes.dark.panel : "#fff";
          ctx.fillRect(0, 0, s.width, s.height);
        }
        ctx.drawImage(img, 0, 0);
        blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, `image/${s.format}`, 0.95),
        );
        if (!blob) throw new Error("No image");
      }
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
      if (rasterUrl) URL.revokeObjectURL(rasterUrl);
      busy = false;
      download.disabled = false;
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
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      dialog.remove();
      if (activeDialog === dialog) activeDialog = null;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    },
    { once: true },
  );
  dialog.showModal();
  renderPreview();
}
