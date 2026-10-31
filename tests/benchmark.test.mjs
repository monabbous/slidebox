import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { summarizeFrames, clsScore, createCases, trialOrder, metricDelta } from "../benchmarks/metrics.mjs";
import { parseOptions } from "../benchmarks/options.mjs";
import { startServer } from "../benchmarks/server.mjs";
import { validateReport, writeReport } from "../benchmarks/report.mjs";
import { brandSvg, REPORT_STYLES } from "../benchmarks/theme.mjs";

test("benchmark options validate workload limits and do not accept unknown flags", () => {
  assert.deepEqual(parseOptions([]).counts, [500, 2000]);
  const options = parseOptions(["--headed", "--trace", "--counts", "1,500,500", "--trials", "2", "--variants", "slidebox,edge", "--seed", "0"]);
  assert.equal(options.headed, true);
  assert.equal(options.trace, true);
  assert.deepEqual(options.counts, [1, 500]);
  assert.equal(options.seed, 0);
  for (const args of [["--counts", "0"], ["--counts", "2001"], ["--trials", "NaN"], ["--variants", "unknown"], ["--output"], ["--seed", "-1"], ["--unknown"]]) {
    assert.throws(() => parseOptions(args));
  }
});

test("benchmark sampling does not double-count overlapping active windows or invent empty FPS", () => {
  const stats = summarizeFrames([{ begin: 0, end: 20 }], [{ begin: 1 }, { begin: 5 }]);
  assert.equal(stats.sampledFrames, 1);
  assert.equal(stats.rafFps, 50);
  assert.equal(stats.lowSampleCount, true);
  const empty = summarizeFrames([], [{ begin: 0 }]);
  assert.equal(empty.rafFps, null);
  assert.equal(empty.p95FrameMs, null);
  assert.equal(empty.longIntervalPercent, null);
});

test("benchmark CLS respects recent input and one-second session gaps", () => {
  assert.equal(clsScore([
    { startTime: 0, value: .2, hadRecentInput: false },
    { startTime: 500, value: 10, hadRecentInput: true },
    { startTime: 1000, value: .3, hadRecentInput: false },
  ]), .3);
  assert.equal(clsScore([]), 0);
});

test("benchmark order is reproducible, complete, and has no native hint case", () => {
  const cases = createCases(["slidebox", "native"], [1, 500]);
  assert.equal(cases.length, 6);
  assert.ok(!cases.some(spec => spec.variant === "native" && spec.hint));
  const first = trialOrder(cases, 3, 42);
  assert.deepEqual(first, trialOrder(cases, 3, 42));
  assert.equal(first.length, 18);
  assert.equal(new Set(first.map(spec => JSON.stringify(spec))).size, 18);
  assert.equal(metricDelta({}, {}, "LayoutCount"), null);
  assert.equal(metricDelta({ x: 4 }, { x: 2 }, "x"), null);
  assert.equal(metricDelta({ x: 2 }, { x: 4 }, "x", 1000), 2000);
});

test("benchmark server is self-contained and does not expose the repository", async () => {
  const server = await startServer();
  try {
    const page = await fetch(server.url);
    assert.equal(page.status, 200);
    assert.ok((await page.text()).includes("Slidebox technique lab"));
    const css = await fetch(server.url + "/slidebox.css", { method: "HEAD" });
    assert.equal(css.status, 200);
    assert.match(css.headers.get("content-type"), /text\/css/);
    assert.equal(await css.text(), "");
    for (const path of ["/package.json", "/.git/config", "/%2e%2e/package.json"]) {
      assert.equal((await fetch(server.url + path)).status, 404);
    }
    assert.equal((await fetch(server.url, { method: "POST" })).status, 405);
  } finally { await server.close(); }
});

test("benchmark server freezes supplied scene inputs for the session", async () => {
  const css = Buffer.from("/* initial CSS */");
  const server = await startServer({ css });
  try {
    css.fill(32);
    assert.equal(await (await fetch(server.url + "/slidebox.css")).text(), "/* initial CSS */");
  } finally { await server.close(); }
});

function fixture() {
  const cases = createCases(["slidebox"], [1]);
  return {
    schemaVersion: 1, status: "complete",
    method: { variants: ["slidebox"], counts: [1], trials: 2 },
    environment: { headless: true, note: "Synthetic unit-test fixture, not measured benchmark data" },
    runs: cases.flatMap(spec => [1, 2].map(trial => ({
      ...spec, trial, rafFps: 60, p95FrameMs: 16.7, layoutMs: 1,
      styleMs: 2, layoutPasses: 4, cls: 0,
    }))),
  };
}

test("benchmark reporter rejects incomplete, duplicate, or non-finite measurements", () => {
  const report = fixture();
  assert.equal(validateReport(report).length, 2);
  assert.throws(() => validateReport({ ...report, status: "failed" }), /complete/);
  assert.throws(() => validateReport({ ...report, runs: report.runs.slice(1) }), /Missing/);
  const duplicate = structuredClone(report);
  duplicate.runs[1] = { ...duplicate.runs[0] };
  assert.throws(() => validateReport(duplicate), /Duplicate/);
  const invalid = structuredClone(report);
  invalid.runs[0].layoutMs = Infinity;
  assert.throws(() => validateReport(invalid), /Invalid metric/);
  const unsafe = structuredClone(report);
  unsafe.diagnostics = { runs: [{ ...unsafe.runs[0], trace: "javascript:alert(1)" }] };
  assert.throws(() => validateReport(unsafe), /Invalid diagnostic/);
});

test("benchmark report exports valid standalone SVGs and explains metric limits", () => {
  const output = mkdtempSync(join(tmpdir(), "slidebox-benchmark-test-"));
  try {
    writeReport(fixture(), output);
    const html = readFileSync(join(output, "index.html"), "utf8");
    assert.ok(html.includes("not GPU-presented FPS"));
    assert.ok(html.includes("Zero CLS does not mean zero layout"));
    assert.ok(html.includes(REPORT_STYLES));
    assert.ok(html.includes("~/ nabous.dev"));
    assert.ok(!html.includes("https://fonts.googleapis.com"));
    const svgs = readdirSync(output).filter(file => file.endsWith(".svg"));
    assert.equal(svgs.length, 6);
    for (const file of svgs) assert.match(readFileSync(join(output, file), "utf8"), /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  } finally { rmSync(output, { recursive: true, force: true }); }
});

test("graph branding preserves geometry and data and is idempotent", () => {
  const original = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 387"><text x="0" y="32" fill="#18313e">Median 59.9</text><rect x="235" y="20" width="499.763" height="18" fill="#008f91"><title>min 58.4, max 60.0</title></rect><line x1="721.6" x2="735" stroke="#173847"/><rect x="235" y="58" width="315.59" height="18" fill="#d17b22"/></svg>';
  const themed = brandSvg(original);
  assert.equal(brandSvg(themed), themed);
  assert.ok(themed.includes('viewBox="0 0 850 387"'));
  for (const value of ['x="235" y="20" width="499.763" height="18"', 'x1="721.6" x2="735"', "Median 59.9", "min 58.4, max 60.0"]) assert.ok(themed.includes(value));
  assert.ok(themed.includes('fill="#00b2b2"'));
  assert.ok(themed.includes('fill="#80b9ed"'));
  assert.ok(themed.includes('fill="#082f46"'));
  assert.ok(themed.includes("color-scheme:dark"));
});
