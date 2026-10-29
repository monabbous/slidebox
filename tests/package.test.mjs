import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const file = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("package retains the published npm name and correct component entrypoints", () => {
  const pkg = JSON.parse(file("package.json"));
  assert.equal(pkg.name, "@monabbous/slidebox");
  assert.equal(pkg.style, "./dist/css/slidebox.css");
  assert.equal(pkg.sass, "./scss/slidebox.scss");
});
test("CSS and SCSS entrypoints match", () => {
  assert.equal(file("dist/css/slidebox.css"), file("scss/slidebox.scss"));
});
test("published stylesheet contains state and accessibility rules", () => {
  const css = file("dist/css/slidebox.css");
  for (const token of [".slidebox:checked::after","--_duration: 200ms","--_deform: .1","SelectedItem","@media (forced-colors: active)","@media (prefers-reduced-motion: reduce)"]) {
    assert.ok(css.includes(token), "Missing: " + token);
  }
});
