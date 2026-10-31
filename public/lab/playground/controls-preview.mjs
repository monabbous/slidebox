import { enhanceSlideboxRange, enhanceSlideboxRangeFill } from "../experimental/range.mjs";

const range = document.getElementById("rangePreview");
const group = document.getElementById("groupPreview");
const preview = document.getElementById("controlsPreview");
const disabled = document.getElementById("controlsDisabled");
const rtl = document.getElementById("controlsRtl");
const rangeMotion = document.getElementById("rangeMotionEnabled");
let destroyRange;
const rangeFill = document.getElementById("rangeFillEnabled");
let destroyFill;

function sync() {
  document.getElementById("rangeValue").value = range.value;
  document.getElementById("groupValue").value = group.querySelector("input:checked")?.value ?? "none";
  document.getElementById("controlsFieldset").disabled = disabled.checked;
  preview.dir = rtl.checked ? "rtl" : "ltr";
  if (rangeMotion.checked && !destroyRange) destroyRange = enhanceSlideboxRange(range);
  if (!rangeMotion.checked && destroyRange) { destroyRange(); destroyRange = undefined; }
  if (rangeFill.checked && !destroyFill) destroyFill = enhanceSlideboxRangeFill(range);
  if (!rangeFill.checked && destroyFill) { destroyFill(); destroyFill = undefined; }
}

range.addEventListener("input", sync);
group.addEventListener("change", sync);
disabled.addEventListener("change", sync);
rtl.addEventListener("change", sync);
rangeMotion.addEventListener("change", sync);
rangeFill.addEventListener("change", sync);
if (!("PointerEvent" in window)) rangeMotion.disabled = true;
document.getElementById("reset").addEventListener("click", () => {
  range.value = range.defaultValue;
  for (const input of group.querySelectorAll("input")) input.checked = input.defaultChecked;
  disabled.checked = false;
  rtl.checked = false;
  rangeMotion.checked = false;
  rangeFill.checked = false;
  sync();
});
sync();
