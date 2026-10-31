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

test("official groups and experimental ranges are opt-in and generated from component sources", () => {
  for (const name of ["range", "group"]) {
    const entry = name === "group" ? "dist/css/group.css" : "experimental/range.css";
    assert.equal(file(entry), file(`components/${name}.css`));
    assert.ok(!file("dist/css/slidebox.css").includes(`.slidebox-${name}`));
    assert.ok(!file(entry).includes("transform:"));
    assert.ok(file(entry).includes("100vw"));
  }
  assert.ok(file("experimental/range.mjs").includes("marginInlineStart"));
  const css = file("experimental/range.css");
  assert.ok(css.includes("background-clip: padding-box"));
  assert.ok(css.includes("clamp(0, var(--slidebox-range-fill, 0), 1)"));
  assert.ok(css.includes("min(var(--_thumb-size), calc(var(--_size) - 2px))"));
  // Browser-specific pseudos must stay in separate rules, not selector lists.
  postcss.parse(css).walkRules(rule => {
    if (rule.selector.includes("::-webkit") || rule.selector.includes("::-moz")) assert.ok(!rule.selector.includes(","));
  });
});

test("Sass mixins expose official groups and experimental ranges with shared defaults", () => {
  const css = sass.compileString(`@use "mixins" with ($defaults: (size: 28px, duration: 300ms)); @use "experimental" with ($defaults: (size: 28px, duration: 300ms)); .volume { @include experimental.range(); } .period { @include mixins.group((selected-text: black, on: cyan)); }`, { loadPaths: [base + "/scss"] }).css;
  for (const token of [".volume::-webkit-slider-thumb", ".volume::-moz-range-thumb", ".period > label > input:checked + span", "--slidebox-size: 28px", "--slidebox-selected-text: black", "--slidebox-duration: 300ms", "anchor-scope", "prefers-reduced-motion", "forced-colors"]) assert.ok(css.includes(token), token);
  assert.ok(!css.includes(".slidebox-range"));
  assert.ok(!css.includes(".slidebox-group"));
  assert.equal(sass.compileString('@use "experimental";', { loadPaths: [base + "/scss"] }).css, "");
});

test("experimental Less mixins compile native states, geometry, and named options", async () => {
  const { css } = await less.render(`@import "${base}/less/slidebox.less"; @import "${base}/less/experimental.less"; .volume { .slidebox-range(@size: 28px); } .period { .slidebox-group(@selected-text: black; @radius: 10px); }`);
  for (const token of [".volume::-webkit-slider-thumb", ".volume::-moz-range-thumb", ".period > label > input:checked + span", "--slidebox-size: 28px", "--slidebox-selected-text: black", "--slidebox-radius: 10px", "anchor-size(height)", "prefers-reduced-motion"]) assert.ok(css.includes(token), token);
  assert.ok(!css.includes(": false"));
  assert.equal((await less.render(`@import "${base}/less/experimental.less";`)).css, "");
});

test("Tailwind v3 emits experimental components and their extra utilities on demand", async () => {
  const { css } = await postcss([tailwind({
    content: [{ raw: "slidebox-range slidebox-group slidebox-radius-lg slidebox-text-slate-800 slidebox-selected-text-white" }],
    plugins: [plugin({ size: "28px", radius: "8px", "selected-text": "black" })],
  })]).process("@tailwind utilities;", { from: undefined });
  for (const token of [".slidebox-range::-webkit-slider-thumb", ".slidebox-group > label > input:checked + span", "--slidebox-size: 28px", "--slidebox-selected-text: black", "--slidebox-radius: 0.5rem", "--slidebox-text: #1e293b", "--slidebox-selected-text: #fff", "anchor-scope"]) assert.ok(css.includes(token), token);
});

test("Tailwind v4 emits experimental components, colors, and arbitrary radii", async () => {
  const compiler = await compile(`@import "tailwindcss-v4"; @plugin "./tailwind/index.cjs" { size: 28px; }`, { base, onDependency() {} });
  const css = compiler.build(["slidebox-range", "slidebox-group", "slidebox-selected-text-white", "slidebox-radius-[8px]"]);
  for (const token of [".slidebox-range", "&::-webkit-slider-thumb", "&::-moz-range-thumb", ".slidebox-group", "--slidebox-size: 28px", "--slidebox-selected-text:", "--slidebox-radius: 8px", "anchor-scope"]) assert.ok(css.includes(token), token);
});
