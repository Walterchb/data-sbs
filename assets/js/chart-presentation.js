const color = (v, fallback) => (/^#[0-9a-f]{6}$/i.test(v || "") ? v : fallback);
const bounded = (v, lo, hi, fallback) =>
  Number.isFinite(Number(v)) ? Math.max(lo, Math.min(hi, Number(v))) : fallback;
export const PRESENTATION_PRESETS = {
  blue: { name: "Océano", start: "#537895", end: "#12334c" },
  white: { name: "Blanco", start: "#ffffff", end: "#ffffff", type: "solid" },
  sand: { name: "Piedra", start: "#e7e4df", end: "#a8a29a" },
  mint: { name: "Bosque", start: "#52796f", end: "#183f38" },
  night: { name: "Noche", start: "#233d60", end: "#0b1729" },
};
export function presentationGeometry(width, height, s = {}) {
  const margin = bounded(s.frameMargin, 0, Math.min(width, height) * 0.25, 48);
  const scale =
    s.framePreserveSize !== false
      ? 1
      : Math.min((width - 2 * margin) / width, (height - 2 * margin) / height);
  return {
    scale,
    outputWidth: s.framePreserveSize !== false ? width + 2 * margin : width,
    outputHeight: s.framePreserveSize !== false ? height + 2 * margin : height,
    x: s.framePreserveSize !== false ? margin : (width - width * scale) / 2,
    y: s.framePreserveSize !== false ? margin : (height - height * scale) / 2,
    w: width * scale,
    h: height * scale,
    radius: bounded(s.frameRadius, 0, 80, 18),
    shadow: bounded(s.frameShadow, 0, 100, 25),
  };
}
export const hasPresentation = (s) =>
  ["shadow", "solid", "gradient", "radial"].includes(s.frameType);
export function presentationSize(width, height, s = {}) {
  if (!hasPresentation(s)) return { width, height };
  const g = presentationGeometry(width, height, s);
  return { width: g.outputWidth, height: g.outputHeight };
}
export function rasterSize(width, height, scale = 2) {
  const factor = [1, 2, 3].includes(Number(scale)) ? Number(scale) : 2;
  const w = Math.round(width * factor),
    h = Math.round(height * factor);
  return {
    width: w,
    height: h,
    valid: w <= 16384 && h <= 16384 && w * h <= 48000000,
  };
}
export const PRESENTATION_PATTERNS = {
  none: "Sin patrón",
  dots: "Puntos",
  grid: "Cuadrícula",
  diagonal: "Diagonales",
  cross: "Cruces",
  waves: "Ondas",
  checker: "Damero",
};
export function patternMarkup(width, height, s = {}) {
  if (
    s.frameType === "shadow" ||
    !PRESENTATION_PATTERNS[s.framePattern] ||
    s.framePattern === "none"
  )
    return "";
  const n = bounded(s.patternSize, 10, 160, 32),
    a = n / 2;
  const ink = color(s.patternColor, "#ffffff"),
    opacity = bounded(s.patternOpacity, 0, 100, 15) / 100;
  const stroke = bounded(s.patternStroke, 0.5, 4, 1);
  const shapes = {
    dots: `<circle cx="${a}" cy="${a}" r="${stroke * 1.6}" fill="${ink}"/>`,
    grid: `<path d="M0 ${n}V0H${n}"/>`,
    diagonal: `<path d="M${-a} ${a}L${a} ${-a}M0 ${n}L${n} 0M${a} ${n + a}L${n + a} ${a}"/>`,
    cross: `<path d="M${a - 4} ${a}H${a + 4}M${a} ${a - 4}V${a + 4}"/>`,
    waves: `<path d="M${-n} ${a}Q${-a} 0 0 ${a}T${n} ${a}T${2 * n} ${a}"/>`,
    checker: `<path d="M0 0H${a}V${a}H0ZM${a} ${a}H${n}V${n}H${a}Z" fill="${ink}" stroke="none"/>`,
  };
  return `<defs><pattern id="export-frame-pattern" patternUnits="userSpaceOnUse" width="${n}" height="${n}"><g stroke="${ink}" stroke-width="${stroke}" fill="none">${shapes[s.framePattern]}</g></pattern></defs><rect data-presentation-pattern="true" width="${width}" height="${height}" fill="url(#export-frame-pattern)" opacity="${opacity}"/>`;
}
// Frame and patterns remain vector paths; raster export renders the SVG directly at output resolution.
export function frameChartSvg(svg, width, height, s = {}) {
  if (!hasPresentation(s)) return svg;
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
  const background =
    s.frameType === "shadow"
      ? ""
      : `<rect data-presentation-background="true" width="${g.outputWidth}" height="${g.outputHeight}" fill="${s.frameType === "solid" ? start : "url(#export-frame-gradient)"}"/>`;
  const shadow =
    g.shadow && s.background !== "transparent"
      ? `<rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="${g.radius}" fill="${s.background === "dark" ? "#0d1b2a" : "#ffffff"}" filter="url(#export-frame-shadow)"/>`
      : "";
  svg = svg.replace(/<svg\b[^>]*>/, (tag) => {
    tag = tag.replace(/\s(?:width|height|viewBox)="[^"]*"/g, "");
    return tag.replace(
      />$/,
      ` width="${g.outputWidth}" height="${g.outputHeight}" viewBox="0 0 ${g.outputWidth} ${g.outputHeight}">`,
    );
  });
  return svg
    .replace(
      /(<svg\b[^>]*>)/,
      `$1${defs}${background}${patternMarkup(g.outputWidth, g.outputHeight, s)}${shadow}<g data-editor-artboard="true" transform="translate(${g.x} ${g.y}) scale(${g.scale})" clip-path="url(#export-frame-clip)">`,
    )
    .replace(/<\/svg>\s*$/, "</g></svg>");
}
