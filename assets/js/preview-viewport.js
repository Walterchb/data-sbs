// Zoom changes only the editing viewport, never the exported dimensions or data.
export function initPreviewViewport(canvas, surface, toolbar, cancelDrawing) {
  let zoom = 1,
    x = 0,
    y = 0,
    gesture = null,
    panMode = false;
  const touches = new Map();
  const controls = document.createElement("div");
  controls.className = "preview-zoom";
  controls.innerHTML =
    '<button type="button" data-zoom="out" aria-label="Alejar vista previa">−</button><button type="button" data-zoom="reset" title="Ajustar a la ventana">100%</button><button type="button" data-zoom="in" aria-label="Acercar vista previa">+</button><button type="button" data-zoom="pan" aria-pressed="false" title="Arrastra la imagen ampliada, incluso sobre anotaciones">Mover vista</button>';
  toolbar.after(controls);
  function paint() {
    const r = surface.getBoundingClientRect();
    x = Math.max(r.width * (1 - zoom), Math.min(0, x));
    y = Math.max(r.height * (1 - zoom), Math.min(0, y));
    canvas.classList.toggle("can-pan", zoom > 1);
    canvas.classList.toggle("pan-mode", panMode);
    canvas.style.transform = `translate(${x}px,${y}px) scale(${zoom})`;
    controls.querySelector("[data-zoom=reset]").textContent =
      `${Math.round(zoom * 100)}%`;
    controls.querySelector("[data-zoom=out]").disabled = zoom <= 1;
    controls.querySelector("[data-zoom=in]").disabled = zoom >= 4;
  }
  function scale(next, cx, cy) {
    next = Math.max(1, Math.min(4, next));
    x = cx - ((cx - x) * next) / zoom;
    y = cy - ((cy - y) * next) / zoom;
    zoom = next;
    paint();
  }
  controls.addEventListener("click", (e) => {
    const b = e.target.closest("[data-zoom]");
    if (!b) return;
    const r = surface.getBoundingClientRect();
    if (b.dataset.zoom === "pan") {
      panMode = !panMode;
      b.setAttribute("aria-pressed", String(panMode));
      paint();
    } else if (b.dataset.zoom === "reset") {
      zoom = 1;
      x = y = 0;
      paint();
    } else
      scale(
        zoom * (b.dataset.zoom === "in" ? 1.3 : 1 / 1.3),
        r.width / 2,
        r.height / 2,
      );
  });
  const local = (e) => {
    const r = surface.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const pair = () => {
    const [a, b] = [...touches.values()];
    return {
      cx: (a.x + b.x) / 2,
      cy: (a.y + b.y) / 2,
      d: Math.hypot(a.x - b.x, a.y - b.y),
    };
  };
  canvas.addEventListener(
    "pointerdown",
    (e) => {
      if (e.pointerType === "mouse" && ![0, 1].includes(e.button)) return;
      canvas.setPointerCapture(e.pointerId);
      touches.set(e.pointerId, local(e));
      if (touches.size >= 2) {
        const p = pair();
        gesture = { ...p, zoom, x, y, pinch: true };
        cancelDrawing();
        canvas.setPointerCapture(e.pointerId);
        e.preventDefault();
        e.stopImmediatePropagation();
      } else if (
        zoom > 1 &&
        (panMode ||
          e.button === 1 ||
          !e.target.closest("[data-hit],[data-resize],[data-endpoint]"))
      ) {
        cancelDrawing();
        gesture = { ...local(e), oldX: x, oldY: y, pan: true };
        canvas.setPointerCapture(e.pointerId);
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true,
  );
  canvas.addEventListener(
    "pointermove",
    (e) => {
      if (!touches.has(e.pointerId)) return;
      touches.set(e.pointerId, local(e));
      if (!gesture) return;
      if (touches.size >= 2) {
        const p = pair();
        zoom = Math.max(
          1,
          Math.min(4, (gesture.zoom * p.d) / Math.max(1, gesture.d)),
        );
        x = p.cx - ((gesture.cx - gesture.x) * zoom) / gesture.zoom;
        y = p.cy - ((gesture.cy - gesture.y) * zoom) / gesture.zoom;
        paint();
      } else if (gesture.pan) {
        const p = local(e);
        x = gesture.oldX + p.x - gesture.x;
        y = gesture.oldY + p.y - gesture.y;
        paint();
      }
      e.preventDefault();
      e.stopImmediatePropagation();
    },
    true,
  );
  const end = (e) => {
    touches.delete(e.pointerId);
    if (!gesture) return;
    if (canvas.hasPointerCapture(e.pointerId))
      canvas.releasePointerCapture(e.pointerId);
    if (!touches.size) gesture = null;
    else {
      const remaining = [...touches.values()][0];
      gesture = { ...remaining, oldX: x, oldY: y, pan: true };
    }
    e.stopImmediatePropagation();
  };
  canvas.addEventListener("pointerup", end, true);
  canvas.addEventListener("pointercancel", end, true);
  const observer = window.ResizeObserver
    ? new window.ResizeObserver(paint)
    : null;
  observer?.observe(surface);
  paint();
  return {
    destroy() {
      observer?.disconnect();
    },
  };
}
