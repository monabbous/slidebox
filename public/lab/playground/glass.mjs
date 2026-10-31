// Only pointer coordinates need JavaScript; CSS paints the continuous light.
const root = document.documentElement;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let frame;
let x;
let y;

function clear() {
  cancelAnimationFrame(frame);
  frame = undefined;
  root.style.removeProperty("--mouse-x");
  root.style.removeProperty("--mouse-y");
}

window.addEventListener("pointermove", event => {
  if (event.pointerType === "touch" || reducedMotion.matches) return;
  x = event.clientX;
  y = event.clientY;
  if (frame !== undefined) return;
  frame = requestAnimationFrame(() => {
    root.style.setProperty("--mouse-x", `${x}px`);
    root.style.setProperty("--mouse-y", `${y}px`);
    frame = undefined;
  });
}, { passive: true });

document.addEventListener("pointerleave", clear);
window.addEventListener("blur", clear);
reducedMotion.addEventListener("change", clear);
