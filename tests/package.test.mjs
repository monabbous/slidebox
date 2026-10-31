import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import * as sass from "sass";
import less from "less";
import postcss from "postcss";
import tailwind from "tailwindcss";
import { compile } from "@tailwindcss/node";
const require = createRequire(import.meta.url);
const plugin = require("../tailwind/index.cjs");
const base = fileURLToPath(new URL("..", import.meta.url));
const file = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("package retains the published npm name and correct component entrypoints", () => {
  const pkg = JSON.parse(file("package.json"));
  assert.equal(pkg.name, "@monabbous/slidebox");
  assert.equal(pkg.style, "./dist/css/slidebox.css");
  assert.equal(pkg.sass, "./scss/slidebox.scss");
  assert.ok(pkg.files.includes("experimental/"));
  assert.ok(file("experimental/drag.d.mts").includes("HTMLInputElement"));
});
test("Sass entrypoint preserves the plain CSS rules", () => {
  const css = sass.compile(base + "/scss/slidebox.scss").css;
  const selectors = text => {
    const result = [];
    postcss.parse(text).walkRules(rule => result.push(rule.selector));
    return result;
  };
  assert.deepEqual(selectors(css), selectors(file("dist/css/slidebox.css")));
});
test("published stylesheet contains state and accessibility rules", () => {
  const css = file("dist/css/slidebox.css");
  for (const token of [".slidebox:checked::after","--slidebox-duration, 200ms","--slidebox-deform, .1","SelectedItem","@media (forced-colors: active)","@media (prefers-reduced-motion: reduce)"]) {
    assert.ok(css.includes(token), "Missing: " + token);
  }
});

test("Sass mixin supports defaults, overrides, and custom selectors without emitting .slidebox", () => {
  const css = sass.compileString(`@use "mixins" with ($defaults: (size: 24px, on: purple)); .toggle { @include mixins.slidebox((size: 32px)); }`, { loadPaths: [base + "/scss"] }).css;
  assert.ok(css.includes(".toggle:checked::after"));
  assert.ok(css.includes("--slidebox-size: 32px"));
  assert.ok(css.includes("--slidebox-on: purple"));
  assert.ok(!css.includes(".slidebox"));
});

test("Less mixin compiles state rules and named overrides without emitting defaults", async () => {
  const { css } = await less.render(`@import "${base}/less/slidebox.less"; .toggle { .slidebox(@size: 28px; @on: purple); }`);
  assert.ok(css.includes(".toggle:checked::after"));
  assert.ok(css.includes("--slidebox-size: 28px"));
  assert.ok(css.includes("--slidebox-on: purple"));
  assert.ok(!css.includes(".slidebox"));
  assert.ok(!css.includes(": false"));
});

test("Tailwind v3 generates the component, defaults, colors, and arbitrary controls", async () => {
  const { css } = await postcss([tailwind({
    content: [{ raw: 'slidebox slidebox-on-red-500 slidebox-width-[2.5] hover:slidebox-duration-[100ms]' }],
    plugins: [plugin({ size: "24px", on: "purple" })],
  })]).process("@tailwind utilities;", { from: undefined });
  for (const token of [".slidebox:checked::after", "--slidebox-size: 24px", "--slidebox-on: purple", "--slidebox-on: #ef4444", "--slidebox-width: 2.5", "--slidebox-duration: 100ms", "prefers-reduced-motion", "forced-colors"]) assert.ok(css.includes(token), token);
});

test("Tailwind v4 loads the plugin with configured defaults and arbitrary controls", async () => {
  const compiler = await compile(`@import "tailwindcss-v4"; @plugin "./tailwind/index.cjs" { size: 24px; on: purple; }`, { base, onDependency() {} });
  const css = compiler.build(["slidebox", "slidebox-width-[2.5]", "slidebox-on-red-500"]);
  for (const token of ["--slidebox-size: 24px", "--slidebox-on: purple", "--slidebox-width: 2.5", ".slidebox-on-red-500", "--slidebox-on: oklch(", "&:checked::after", "prefers-reduced-motion"]) assert.ok(css.includes(token), token);
});
