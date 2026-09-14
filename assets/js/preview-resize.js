export function initPreviewResize(dialog) {
  const layout = dialog.querySelector(".chart-export-layout"),
    preview = dialog.querySelector(".chart-export-preview");
  const grip = document.createElement("div");
  grip.className = "preview-resize-row";
  grip.innerHTML =
    '<button type="button" class="preview-resize-handle" role="separator" aria-orientation="horizontal" aria-label="Ajustar altura de la vista previa" title="Arrastra hacia arriba o abajo"><span></span><small>Ajustar altura</small></button><button type="button" class="preview-resize-reset" aria-label="Restablecer altura de la vista previa" title="Restablecer altura">↺</button>';
  preview.append(grip);
  const handle = grip.querySelector(".preview-resize-handle");
  let drag = null,
    chosen = null,
    frame = 0;
  const limits = () => {
    const total = layout.getBoundingClientRect().height;
    return {
      min: Math.min(200, total * 0.48),
      max: Math.max(total * 0.48, total - 110),
    };
  };
  function set(value) {
    const { min, max } = limits();
    chosen = Math.round(Math.max(min, Math.min(max, value)));
    layout.style.setProperty("--mobile-preview-height", `${chosen}px`);
    handle.setAttribute("aria-valuemin", Math.round(min));
    handle.setAttribute("aria-valuemax", Math.round(max));
    handle.setAttribute("aria-valuenow", chosen);
  }
  handle.addEventListener("pointerdown", (e) => {
    drag = {
      id: e.pointerId,
      y: e.clientY,
      height: preview.getBoundingClientRect().height,
    };
    handle.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  handle.addEventListener("pointermove", (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    set(drag.height + e.clientY - drag.y);
    e.preventDefault();
  });
  const end = (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    drag = null;
    if (handle.hasPointerCapture(e.pointerId))
      handle.releasePointerCapture(e.pointerId);
  };
  handle.addEventListener("pointerup", end);
  handle.addEventListener("pointercancel", end);
  handle.addEventListener("keydown", (e) => {
    const { min, max } = limits(),
      height = preview.getBoundingClientRect().height;
    if (e.key === "ArrowDown") set(height + 20);
    else if (e.key === "ArrowUp") set(height - 20);
    else if (e.key === "Home") set(min);
    else if (e.key === "End") set(max);
    else return;
    e.preventDefault();
  });
  grip.querySelector(".preview-resize-reset").addEventListener("click", () => {
    chosen = null;
    layout.style.removeProperty("--mobile-preview-height");
    handle.setAttribute(
      "aria-valuenow",
      Math.round(preview.getBoundingClientRect().height),
    );
  });
  const observer = window.ResizeObserver
    ? new window.ResizeObserver(() => {
        if (frame) window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => {
          frame = 0;
          if (chosen !== null) set(chosen);
          else
            handle.setAttribute(
              "aria-valuenow",
              Math.round(preview.getBoundingClientRect().height),
            );
        });
      })
    : null;
  observer?.observe(layout);
  return {
    destroy() {
      observer?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    },
  };
}
