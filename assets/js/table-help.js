const headers = {
  "% padre":
    "Saldo de la fila / saldo de su rubro padre × 100. El total padre incluye a sus hijos; no sumarlos nuevamente.",
  "Δ mes · S/ MM":
    "Saldo actual menos saldo del mes anterior, expresado en millones de soles.",
  "Δ YTD YoY":
    "Resultado acumulado desde enero menos el resultado acumulado hasta el mismo mes del año anterior.",
  "YTD YoY":
    "Variación porcentual del acumulado desde enero frente al mismo acumulado del año anterior.",
  "Total · S/ MM":
    "Saldo total expresado en millones de soles. Se usa el total publicado de la fuente.",
  "Tendencia 12M":
    "Evolución de las últimas doce observaciones mensuales. Los datos ausentes no se sustituyen por cero.",
  MoM: "Comparación con el mes anterior exacto. Importes: (actual / base − 1) × 100; ratios: diferencia en puntos básicos; múltiplos: diferencia en veces.",
  QoQ: "Comparación con el trimestre anterior exacto (tres meses). Importes: (actual / base − 1) × 100; ratios: diferencia en puntos básicos. Se requieren periodos declarados válidos.",
  YTD: "Variación frente al cierre de diciembre del año anterior. En resultados, YTD identifica el acumulado desde enero: contrasta el mismo mes para comparar periodos equivalentes.",
  YoY: "Comparación con el mismo mes del año anterior. Importes: (actual / base − 1) × 100; ratios: diferencia en puntos básicos. 100 pb = 1 punto porcentual.",
  "Periodo declarado":
    "Fecha del dato indicada en la fuente, que puede diferir del mes de publicación del archivo.",
  Participación:
    "Proporción del saldo respecto del total o rubro padre indicado en esta tabla; no sumar subtotales con sus componentes.",
  CAGR: "Tasa anual compuesta entre el primer y último dato válido: (final / inicial) elevado a (12 / meses transcurridos), menos 1.",
  MN: "Moneda nacional. En los EEFF B-2201 se expresa en soles.",
  ME: "Moneda extranjera. B-2201 expresa su equivalente en soles; RCL publica ME en dólares. Respeta la unidad indicada en cada dato.",
};
let tooltip, active, pinned=false;
function close() {
  if (!tooltip) return;
  tooltip.hidden = true;
  active?.removeAttribute("aria-describedby");
  active = null;
  pinned = false;
}
function display(el, pin = false) {
  if (!el) return;
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = "table-help-tooltip";
    tooltip.className = "table-help-tooltip";
    tooltip.role = "tooltip";
    document.body.append(tooltip);
  }
  close();
  active = el;
  pinned = pin;
  tooltip.textContent = el.dataset.help;
  tooltip.hidden = false;
  el.setAttribute("aria-describedby", tooltip.id);
  const r = el.getBoundingClientRect(),
    box = tooltip.getBoundingClientRect();
  tooltip.style.left = `${Math.max(10, Math.min(r.left, window.innerWidth - box.width - 10))}px`;
  tooltip.style.top = `${r.bottom + box.height + 12 < window.innerHeight ? r.bottom + 8 : Math.max(10, r.top - box.height - 8)}px`;
}
export function enhanceTableHelp(root) {
  close();
  for (const th of root.querySelectorAll("table thead th")) {
    const text = th.textContent.trim();
    if (!th.dataset.help)
      th.dataset.help =
        headers[text] ||
        Object.entries(headers).find(([k]) => text.startsWith(k + " "))?.[1] ||
        "";
    if (th.dataset.help) {
      th.tabIndex = 0;
      th.classList.add("has-table-help");
    }
  }
  for (const cell of root.querySelectorAll("table [data-help]")) {
    if (!cell.dataset.help) continue;
    cell.classList.add("has-table-help");
    // Keep row navigation intact; a separate help button also works on touch devices.
    if (
      cell.matches("button") &&
      !cell.nextElementSibling?.classList.contains("table-help-button")
    ) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "table-help-button";
      b.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor"/><path d="M10 9v5m0-8v1" stroke="currentColor" stroke-width="1.5"/></svg>';
      b.dataset.help = cell.dataset.help;
      b.setAttribute("aria-label", "Definición de " + cell.textContent);
      cell.after(b);
    }
  }
  if (root.dataset.helpBound) return;
  root.dataset.helpBound = "true";
  root.addEventListener("pointerover", (ev) => {
    if (ev.pointerType === "touch" || pinned) return;
    display(ev.target.closest("[data-help]"));
  });
  root.addEventListener("pointerout", (ev) => {
    if (!pinned && !ev.target.closest("[data-help]")?.contains(ev.relatedTarget)) close();
  });
  root.addEventListener("focusin", (ev) =>
    !pinned && display(ev.target.closest("[data-help]")),
  );
  root.addEventListener("focusout", () => { if(!pinned) close(); });
  root.addEventListener("click", (ev) => {
    const el = ev.target.closest(".table-help-button,th[data-help]");
    if (el) display(el, true);
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") close();
  });
  document.addEventListener("click", (ev) => {
    if (!ev.target.closest("[data-help]")) close();
  });
  window.addEventListener("scroll", close, true);
}
