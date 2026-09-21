// Session-only assets shared by the image editor and report builder.
const charts = new Map();
let nextId = 0;
export const savedCharts = () => [...charts.values()];
export function saveChart(chart) {
  if (charts.size >= 20) throw Error('Puedes guardar hasta 20 gráficos. Quita alguno para continuar.');
  const used = savedCharts().reduce((n, c) => n + c.png.size + c.svg.length * 2, 0);
  if (used + chart.png.size + chart.svg.length * 2 > 40 * 1024 * 1024)
    throw Error('Los gráficos de esta sesión alcanzan 40 MB. Quita alguno para continuar.');
  const item = {...chart, id: `chart-${++nextId}`, url: URL.createObjectURL(chart.png)};
  charts.set(item.id, item);
  globalThis.dispatchEvent(new Event('report-assets-change'));
  return item;
}
export function removeChart(id) {
  const item = charts.get(id);
  if (item) URL.revokeObjectURL(item.url);
  charts.delete(id);
  globalThis.dispatchEvent(new Event('report-assets-change'));
}
// Capture only displayed cells, never tooltip text or hidden, collapsed rows.
export function captureVisibleTables(root, context) {
  const clean = (cell) => {
    const copy = cell.cloneNode(true);
    copy.querySelectorAll('.table-help-button,.tree-toggle,.tree-spacer,svg,canvas,input').forEach(n => n.remove());
    return copy.textContent.replace(/\s+/g, ' ').trim();
  };
  return [...root.querySelectorAll('table')].filter(t => t.getClientRects().length && t.tBodies.length).map((table, i) => {
    const headerRows = [...table.tHead?.rows || []];
    const headers = (headerRows.at(-1) ? [...headerRows.at(-1).cells] : []).flatMap(c => Array(c.colSpan).fill(clean(c)));
    const rows = [...table.tBodies].flatMap(b => [...b.rows]).filter(r => r.getClientRects().length).map(r => [...r.cells].flatMap(c => [clean(c), ...Array(c.colSpan - 1).fill('')]));
    const columns = Math.max(headers.length, ...rows.map(r => r.length));
    if (!columns || !rows.length) return null;
    const section = table.closest('section,article,.panel');
    const title = section?.querySelector('h2,h3')?.textContent.trim() || table.closest('[aria-label]')?.getAttribute('aria-label') || `Tabla ${i + 1}`;
    const keep=Array.from({length:columns},(_,n)=>n).filter(c=>c===0||rows.some(r=>r[c]));
    return {kind:'table', id:`table-${Date.now()}-${i}`, title, headers: keep.map(n=>headers[n] || `Columna ${n+1}`), rows:rows.map(r=>keep.map(c=>r[c]||'')), context};
  }).filter(Boolean);
}
export function tableNumber(value) {
  const s = String(value).trim().replace(/\u2212/g,'-');
  const percent = s.endsWith('%');
  const n = s.replace(/%$/, '').trim();
  // Dashboard es-PE uses comma thousands and a decimal point. Dates/identifiers stay text.
  if (!/^[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/.test(n)) return null;
  return {value:Number(n.replace(/,/g,'')) / (percent ? 100 : 1), percent};
}

export function numericColumns(headers,rows){return headers.map((_,c)=>c>0&&rows.some(r=>tableNumber(r[c]))&&rows.every(r=>tableNumber(r[c])||!r[c]||/^[—–-]$/.test(String(r[c]).trim())));}
