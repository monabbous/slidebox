import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("the public article has a summary, valid contents links, and skill installation", () => {
  const article = readFileSync(new URL("../public/blog.md", import.meta.url), "utf8");
  const prose = article.replace(/```[\s\S]*?```/g, "");
  const slug = text => text.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-");
  const headings = new Set([...prose.matchAll(/^#{1,6} (.+)$/gm)].map(([, text]) => slug(text)));
  assert.ok(article.includes("## TL;DR"));
  assert.ok(article.includes("## Contents"));
  const links = [...prose.matchAll(/\]\(#([^)]+)\)/g)];
  assert.ok(links.length >= 8);
  for (const [, anchor] of links) assert.ok(headings.has(anchor), `Missing article heading: ${anchor}`);
  assert.ok(article.includes("npx skills add monabbous/slidebox --skill slidebox"));
  assert.ok(article.includes("not the Slidebox package itself"));
});
