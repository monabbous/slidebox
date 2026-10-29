import { readFileSync, mkdirSync, writeFileSync } from "node:fs";

const source = readFileSync(new URL("../style.css", import.meta.url), "utf8");
const start = "/* Slidebox component: begin */";
const end = "/* Slidebox component: end */";
const beginAt = source.indexOf(start);
const endAt = source.indexOf(end);
if (beginAt < 0 || endAt <= beginAt) {
  throw new Error("Slidebox component markers are missing from style.css");
}
const css = source.slice(beginAt + start.length, endAt).trim() + "\n";
if (!css.includes(".slidebox:checked::after")) {
  throw new Error("Extracted CSS is missing checked-state styling");
}
for (const output of ["dist/css/slidebox.css", "scss/slidebox.scss"]) {
  mkdirSync(new URL("../" + output.substring(0, output.lastIndexOf("/")), import.meta.url), { recursive: true });
  writeFileSync(new URL("../" + output, import.meta.url), css);
}
console.log("Built dist/css/slidebox.css and scss/slidebox.scss");
