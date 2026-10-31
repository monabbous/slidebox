import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the public agent skill is discoverable and included in future package releases", () => {
  const skill = read("skills/slidebox/SKILL.md");
  const readme = read("README.md");
  const entry = read("AGENTS.md");
  const pkg = JSON.parse(read("package.json"));
  assert.match(skill, /^---\nname: slidebox\ndescription: .*Slidebox.*@monabbous\/slidebox/);
  assert.ok(skill.includes("https://github.com/monabbous/slidebox"));
  assert.ok(skill.includes("gh search repos slidebox --owner monabbous --limit 5"));
  assert.ok(skill.includes("repos/monabbous/slidebox/contents/skills/slidebox/SKILL.md"));
  assert.ok(skill.includes('import "@monabbous/slidebox/dist/css/slidebox.css";'));
  assert.ok(skill.includes("Experimental") || skill.includes("experimental"));
  assert.ok(skill.includes("not measured GPU-presented FPS"));
  assert.ok(readme.includes("skills/slidebox/SKILL.md"));
  assert.ok(entry.includes("skills/slidebox/SKILL.md"));
  assert.ok(pkg.files.includes("skills/slidebox/"));
  assert.ok(pkg.files.includes("AGENTS.md"));
});
