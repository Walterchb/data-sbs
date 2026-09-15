import { escape } from "./format.js";

// Public ECharts coordinate conversion keeps labels tied to the exported data.
export function collectExportLabels(
  chart,
  option,
  settings,
  layouts = new Map(),
) {
  const labels = [];
  const ctx =
    typeof window.CanvasRenderingContext2D === "function"
      ? document.createElement("canvas").getContext("2d")
      : null;
  function add(id, text, anchor, style, right = false) {
    if (
      !text ||
      !anchor?.every(Number.isFinite) ||
      !chart.containPixel(
        { gridIndex: 0 },
        anchor.map(
          (v, i) =>
            v +
            Math.sign((i ? settings.height : settings.width) / 2 - v) * 0.01,
        ),
      )
    )
      return;
    const fontSize = style.fontSize || settings.fontSize;
    const lines = String(text).split("\n");
    if (ctx)
      ctx.font = `${fontSize}px ${style.fontFamily || option.textStyle?.fontFamily || "Segoe UI, Arial, sans-serif"}`;
    const width = Math.ceil(
      Math.max(
        ...lines.map(
          (line) =>
            ctx?.measureText(line).width || line.length * fontSize * 0.58,
        ),
      ) + 12,
    );
    const height = Math.ceil(
      lines.length * (style.lineHeight || fontSize * 1.25) + 8,
    );
    let x = right ? anchor[0] + 10 : anchor[0] - width / 2;
    let y = right ? anchor[1] - height / 2 : anchor[1] - height - 14;
    x = Math.max(0, Math.min(settings.width - width, x));
    y = Math.max(0, Math.min(settings.height - height, y));
    const topLimit = Number(option.grid?.top) + 8 || 0;
    const bottomLimit = Math.max(
      topLimit,
      settings.height -
        Number(option.grid?.bottom || 0) -
        Number(option.xAxis?.axisLabel?.margin || 0) -
        settings.fontSize * 1.1 -
        height,
    );
    y = Math.max(topLimit, Math.min(bottomLimit, y));
    const overlaps = (x, y) =>
      labels.some(
        (l) =>
          x < l.x + l.width + 6 &&
          x + width + 6 > l.x &&
          y < l.y + l.height + 6 &&
          y + height + 6 > l.y,
      );
    // Find a nearby free position instead of alternating between two occupied rows.
    // Manual positions are restored by the editor after the initial layout.
    if (overlaps(x, y)) {
      const candidates = [];
      for (let col = -2; col <= 2; col++)
        for (let row = -12; row <= 12; row++) {
          const cx = x + col * (width + 12),
            cy = y + row * (height + 8);
          if (
            cx >= 0 &&
            cx + width <= settings.width &&
            cy >= topLimit &&
            cy <= bottomLimit
          )
            candidates.push({
              x: cx,
              y: cy,
              distance: Math.hypot(cx - x, cy - y),
            });
        }
      const free = candidates
        .sort((a, b) => a.distance - b.distance)
        .find((p) => !overlaps(p.x, p.y));
      if (free) {
        x = free.x;
        y = free.y;
      }
    }
    labels.push({
      id,
      type: "label",
      text: String(text),
      x: Math.round(x),
      y: Math.round(y),
      width,
      height,
      anchorX: anchor[0],
      anchorY: anchor[1],
      fontSize,
      fontFamily:
        style.fontFamily ||
        option.textStyle?.fontFamily ||
        "Segoe UI, Arial, sans-serif",
      lineHeight: style.lineHeight || fontSize * 1.25,
      stroke: style.color || "#102033",
      background: style.backgroundColor || "transparent",
      connector: settings.labelConnectors !== false,
      layer: "front",
    });
  }
  option.series.forEach((series, si) => {
    const category =
      option.xAxis.type === "category" ? option.xAxis.data : option.yAxis.data;
    if (series.label?.show) {
      series.data.forEach((v, i) => {
        if (typeof v !== "number" || !Number.isFinite(v)) return;
        const bar = series.type === "bar";
        const point = chart.convertToPixel(
          { seriesIndex: si },
          bar ? [v, i] : [i, v],
        );
        if (bar && point) {
          const rect = layouts.get(`${si}:${i}`)?.rect;
          if (rect) point[1] = rect.y + rect.height / 2;
        }
        add(
          `value:${si}:${category?.[i] ?? i}`,
          series.label.formatter({ value: v }),
          point,
          series.label,
          bar,
        );
      });
    }
    for (const p of series.markPoint?.data || []) {
      if (p.label?.show)
        add(
          `date:${si}:${category?.[p.coord[0]] ?? p.coord[0]}`,
          p.label.formatter,
          chart.convertToPixel({ seriesIndex: si }, p.coord),
          p.label,
        );
    }
    for (const [i, line] of (series.markLine?.data || []).entries()) {
      if (!Array.isArray(line) || !line[0].label?.show) continue;
      const a = chart.convertToPixel({ seriesIndex: si }, line[0].coord),
        b = chart.convertToPixel({ seriesIndex: si }, line[1].coord);
      add(
        `growth:${si}:${line[0].exportComparisonId ?? i}`,
        line[0].label.formatter,
        [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
        line[0].label,
      );
    }
  });
  return labels;
}

export function labelMarkup(item) {
  const { x, y, width: w, height: h } = item;
  const endX = Math.max(x, Math.min(x + w, item.anchorX)),
    endY = Math.max(y, Math.min(y + h, item.anchorY));
  const connector = item.connector
    ? `<line data-label-connector="true" x1="${item.anchorX}" y1="${item.anchorY}" x2="${endX}" y2="${endY}" stroke="${escape(item.stroke)}" stroke-width="1.2" opacity=".65"/>`
    : "";
  const background =
    item.background !== "transparent"
      ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${escape(item.background)}"/>`
      : "";
  return (
    connector +
    background +
    item.text
      .split("\n")
      .map(
        (line, i) =>
          `<text x="${x + w / 2}" y="${y + 4 + item.fontSize + i * item.lineHeight}" text-anchor="middle" fill="${escape(item.stroke)}" font-size="${item.fontSize}" font-family="${escape(item.fontFamily || "Segoe UI, Arial, sans-serif")}">${escape(line)}</text>`,
      )
      .join("")
  );
}
