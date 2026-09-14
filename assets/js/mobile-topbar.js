// Keep the header's layout space; only its sticky visual position changes.
export function initMobileTopbar(topbar) {
  const root = document.documentElement;
  const mobile = window.matchMedia("(max-width: 760px)");
  let lastY = Math.max(0, window.scrollY),
    travel = 0,
    frame = 0;
  const reveal = () => root.classList.remove("topbar-hidden");
  const update = () => {
    frame = 0;
    const y = Math.max(
      0,
      Math.min(
        window.scrollY,
        document.documentElement.scrollHeight - window.innerHeight,
      ),
    );
    const delta = y - lastY;
    lastY = y;
    if (
      !mobile.matches ||
      y < topbar.offsetHeight ||
      (topbar.contains(document.activeElement) &&
        document.activeElement.matches(":focus-visible")) ||
      document.querySelector("dialog[open]")
    ) {
      travel = 0;
      reveal();
      return;
    }
    if (Math.sign(delta) !== Math.sign(travel)) travel = 0;
    travel += delta;
    if (Math.abs(travel) >= 10) {
      root.classList.toggle("topbar-hidden", travel > 0);
      travel = 0;
    }
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    },
    { passive: true },
  );
  window.addEventListener("resize", () => {
    travel = 0;
    lastY = window.scrollY;
    reveal();
  });
  topbar.addEventListener("focusin", reveal);
}
