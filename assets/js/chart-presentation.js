const color = (v, fallback) => (/^#[0-9a-f]{6}$/i.test(v || "") ? v : fallback);
const bounded = (v, lo, hi, fallback) =>
  Number.isFinite(Number(v)) ? Math.max(lo, Math.min(hi, Number(v))) : fallback;
export const PRESENTATION_PRESETS = {
  blue: { name: "Azul", start: "#dceeff", end: "#9dc8f2" },
  lavender: { name: "Lavanda", start: "#ede6ff", end: "#c1b9f2" },
  sand: { name: "Arena", start: "#fff3df", end: "#e9cfa8" },
  mint: { name: "Menta", start: "#dcf5ed", end: "#9bcdc5" },
  night: { name: "Noche", start: "#233d60", end: "#0b1729" },
};
export function presentationGeometry(width, height, s = {}) {
  const margin = bounded(s.frameMargin, 0, Math.min(width, height) * 0.25, 48);
  const scale = Math.min(
    (width - 2 * margin) / width,
    (height - 2 * margin) / height,
  );
  return {
    scale,
    x: (width - width * scale) / 2,
    y: (height - height * scale) / 2,
    w: width * scale,
    h: height * scale,
    radius: bounded(s.frameRadius, 0, 80, 18),
    shadow: bounded(s.frameShadow, 0, 100, 25),
  };
}
// Keep the exported canvas size fixed and place the complete, editable chart inside it.
export function frameChartSvg(svg, width, height, s = {}) {
  if (!["solid", "gradient", "radial"].includes(s.frameType)) return svg;
  const g = presentationGeometry(width, height, s);
  const start = color(s.frameStart, "#dceeff"),
    end = color(s.frameEnd, "#9dc8f2");
  const radians = (bounded(s.frameAngle, 0, 360, 135) * Math.PI) / 180;
  const dx = Math.cos(radians) * 50,
    dy = Math.sin(radians) * 50;
  const gradient =
    s.frameType === "radial"
      ? `<radialGradient id="export-frame-gradient" cx="25%" cy="15%" r="100%"><stop stop-color="${start}"/><stop offset="1" stop-color="${end}"/></radialGradient>`
      : `<linearGradient id="export-frame-gradient" x1="${50 - dx}%" y1="${50 - dy}%" x2="${50 + dx}%" y2="${50 + dy}%"><stop stop-color="${start}"/><stop offset="1" stop-color="${end}"/></linearGradient>`;
  const defs = `<defs>${gradient}<clipPath id="export-frame-clip"><rect width="${width}" height="${height}" rx="${g.radius / g.scale}"/></clipPath><filter id="export-frame-shadow" x="-50%" y="-50%" width="200%" height="220%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="${g.shadow * 0.3}" stdDeviation="${g.shadow * 0.35}" flood-color="#071728" flood-opacity="${g.shadow / 180}"/></filter></defs>`;
  const background = `<rect data-presentation-background="true" width="${width}" height="${height}" fill="${s.frameType === "solid" ? start : "url(#export-frame-gradient)"}"/>`;
  const shadow =
    g.shadow && s.background !== "transparent"
      ? `<rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="${g.radius}" fill="${s.background === "dark" ? "#0d1b2a" : "#ffffff"}" filter="url(#export-frame-shadow)"/>`
      : "";
  return svg
    .replace(
      /(<svg\b[^>]*>)/,
      `$1${defs}${background}${shadow}<g data-editor-artboard="true" transform="translate(${g.x} ${g.y}) scale(${g.scale})" clip-path="url(#export-frame-clip)">`,
    )
    .replace(/<\/svg>\s*$/, "</g></svg>");
}
