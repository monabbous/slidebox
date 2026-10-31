import { enhanceSlidebox } from "../experimental/drag.mjs";

const toggle = document.getElementById("dragEnabled");
const input = document.getElementById("switch");
let destroy;

function sync() {
  destroy?.();
  destroy = toggle.checked ? enhanceSlidebox(input) : undefined;
}

if (!("PointerEvent" in window)) {
  toggle.disabled = true;
  document.getElementById("dragNote").textContent = "Pointer dragging is not supported in this browser. Clicks and keyboard controls still work.";
}

toggle.addEventListener("change", sync);
document.getElementById("reset").addEventListener("click", () => {
  toggle.checked = false;
  sync();
});
sync();
