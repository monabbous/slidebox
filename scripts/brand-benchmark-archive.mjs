import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import { REPORT_STYLES, brandSvg } from "../benchmarks/theme.mjs";

const root = fileURLToPath(new URL("../public/benchmarks/", import.meta.url));
function update(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) { update(path); continue; }
    if (entry.name.endsWith(".svg")) {
      writeFileSync(path, brandSvg(readFileSync(path, "utf8")));
    } else if (entry.name.endsWith(".html") && entry.name !== "lab.html") {
      let html = readFileSync(path, "utf8");
      // The historical scene, raw results, traces, and collector sources stay
      // untouched. Only presentation and broken preview-era navigation change.
      html = html.replace(/<style>[\s\S]*?<\/style>/, () => `<style>${REPORT_STYLES}</style>`);
      html = html.replace(/<svg\b[\s\S]*?<\/svg>/g, brandSvg);
      const prefix = relative(directory, root).replaceAll("\\", "/");
      const base = prefix ? `${prefix}/` : "./";
      html = html.replace(/href="\/benchmarks\/([^"]*)"/g, (_, target) => `href="${base}${target}"`)
        .replace('href="/">Article draft', 'href="https://nabous.dev/blog/slidebox/">Article')
        .replace('href="headless/"', `href="${base}headless/"`);
      writeFileSync(path, html);
    }
  }
}
update(root);
console.log("Branded the pilot archive without regenerating measurements");
