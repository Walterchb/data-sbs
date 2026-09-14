// Fixing the body also prevents background touch scrolling in mobile Safari.
export function lockPageScroll() {
  const root = document.documentElement,
    body = document.body;
  const x = window.scrollX,
    y = window.scrollY;
  const props = [
    "position",
    "top",
    "left",
    "width",
    "overflow",
    "padding-right",
  ];
  const saved = props.map((name) => [
    name,
    body.style.getPropertyValue(name),
    body.style.getPropertyPriority(name),
  ]);
  const overflow = root.style.overflow;
  const scrollbar = Math.max(0, window.innerWidth - root.clientWidth);
  const padding = parseFloat(window.getComputedStyle(body).paddingRight) || 0;
  root.classList.add("chart-export-open");
  root.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `${-y}px`;
  body.style.left = `${-x}px`;
  body.style.width = "100%";
  body.style.overflow = "hidden";
  if (scrollbar) body.style.paddingRight = `${padding + scrollbar}px`;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    for (const [name, value, priority] of saved) {
      if (value) body.style.setProperty(name, value, priority);
      else body.style.removeProperty(name);
    }
    root.style.overflow = overflow;
    const behavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(x, y);
    root.style.scrollBehavior = behavior;
    root.classList.remove("chart-export-open");
    window.dispatchEvent(new window.Event("sbs:scroll-restored"));
  };
}
