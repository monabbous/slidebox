import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Keep the runtime-hosted playground self-contained. nabous.dev fetches these
// committed files on requests; its build never runs this script.
for (const path of ["index.html", "style.css", "script.js", "dist/css/group.css", "experimental/range.css", "experimental/range.mjs", "experimental/drag.mjs", "playground/drag-preview.mjs", "playground/glass.mjs", "playground/controls-preview.mjs"]) {
  const destination = fileURLToPath(new URL(`../public/lab/${path}`, import.meta.url));
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(new URL(`../${path}`, import.meta.url), destination);
}
console.log("Updated public/lab from the source playground");
mkdirSync(new URL("../public/assets/", import.meta.url), { recursive: true });
const demos = JSON.parse(readFileSync(new URL("../assets/demos.json", import.meta.url), "utf8"));
for (const { file } of demos.clips) {
  copyFileSync(new URL(`../assets/${file}`, import.meta.url), new URL(`../public/assets/${file}`, import.meta.url));
}
