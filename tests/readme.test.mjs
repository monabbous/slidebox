import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as sass from "sass";
import less from "less";

const root = fileURLToPath(new URL("..", import.meta.url));
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const examples = language => [...readme.matchAll(new RegExp("```" + language + "\\n([\\s\\S]*?)```", "g"))].map(([, source]) => source.replaceAll("@monabbous/slidebox", root));

test("README Sass examples compile against the shipped mixins", () => {
  const snippets = examples("scss");
  assert.ok(snippets.length >= 2);
  for (const source of snippets) assert.ok(sass.compileString(source, { loadPaths: [root] }).css.length > 0);
});

test("README Less examples compile against the shipped mixins", async () => {
  const snippets = examples("less");
  assert.ok(snippets.length >= 2);
  for (const source of snippets) assert.ok((await less.render(source)).css.length > 0);
});
