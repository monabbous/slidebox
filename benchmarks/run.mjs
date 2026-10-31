import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { cpus, arch, platform, release } from "node:os";
import { parseOptions, HELP } from "./options.mjs";
import { createCases, trialOrder, metricDelta } from "./metrics.mjs";
import { prepareScene, withTimeout, metricValues } from "./runtime.mjs";
import { startServer } from "./server.mjs";
import { collectDiagnostics } from "./trace.mjs";
import { writeReport } from "./report.mjs";

const repo = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
const hash = data => createHash("sha256").update(data).digest("hex");

export async function runBenchmark(options) {
  const stamp = new Date().toISOString().replaceAll(":", "-");
  const output = resolve(repo, options.output ?? join("benchmark-results", stamp));
  if (existsSync(output) && readdirSync(output).length) throw new Error("Output directory must be empty; previous results will not be overwritten");
  mkdirSync(output, { recursive: true });
  const css = readFileSync(new URL("../dist/css/slidebox.css", import.meta.url));
  const assets = Object.fromEntries(["lab.html", "lab.css", "lab.mjs", "metrics.mjs", "run.mjs", "runtime.mjs", "options.mjs", "server.mjs", "trace.mjs", "report.mjs"].map(file => [file, readFileSync(new URL(file, import.meta.url))]));
  const cases = createCases(options.variants, options.counts);
  const report = {
    schemaVersion: 1, status: "running", startedAt: new Date().toISOString(),
    method: {
      viewport: { width: 1920, height: 1440 }, deviceScaleFactor: 1,
      colorScheme: "dark", reducedMotion: "no-preference",
      counts: options.counts, variants: options.variants, trials: options.trials, seed: options.seed,
      togglesPerTrial: 2, animationMs: 200, tailDelayMs: 20, activeWindowMs: 300,
      warmup: "Every fresh page: 350ms settling, one full practice trial, 250ms rest",
      fps: "1000 / mean active-window rAF interval; not GPU-presented FPS",
      longIntervalThresholdMs: 25, missedSlotAssumptionHz: 60,
      normalization: "Published Slidebox CSS at 40×20px; independent edge/transform/grid illustrations. Transform/grid/native are not equivalent elastic effects or vendor-package benchmarks.",
      willChange: "Property-specific hints set before warmup; not layer-promotion guarantees",
      limitations: "Programmatic batches, not trusted input latency or field INP. Background load and power mode are not controlled. Primary trials have no tracing, screenshots, or video.",
    },
    environment: {
      node: process.version, playwright: require("@playwright/test/package.json").version,
      platform: platform(), architecture: arch(), kernel: release(), cpu: cpus()[0]?.model ?? null,
      release: JSON.parse(readFileSync(new URL("../package.json", import.meta.url))).version,
      headless: !options.headed, cssSha256: hash(css),
      harnessSha256: Object.fromEntries(Object.entries(assets).map(([file, bytes]) => [file, hash(bytes)])),
    },
    runs: [],
  };
  const save = () => writeFileSync(join(output, "results.json"), JSON.stringify(report, null, 2) + "\n");
  let server, browser, interrupted = false;
  const interrupt = () => { interrupted = true; void browser?.close(); };
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  try {
    save();
    server = await startServer({ css, assets });
    browser = await chromium.launch({ channel: "chromium", headless: !options.headed });
    report.environment.browser = browser.version();
    const context = await browser.newContext({
      viewport: report.method.viewport, deviceScaleFactor: 1,
      colorScheme: "dark", reducedMotion: "no-preference",
    });
    const keeper = await context.newPage();
    report.environment.graphics = await keeper.evaluate(() => {
      const gl = document.createElement("canvas").getContext("webgl");
      const extension = gl?.getExtension("WEBGL_debug_renderer_info");
      return {
        renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : null,
        hardwareConcurrency: navigator.hardwareConcurrency,
        supportedObservers: PerformanceObserver.supportedEntryTypes,
      };
    });
    if (/swiftshader|llvmpipe|software/i.test(report.environment.graphics.renderer ?? "")) {
      console.warn("Software renderer detected. Do not present these results as hardware-composited desktop performance; consider --headed.");
    }
    const order = trialOrder(cases, options.trials, options.seed);
    console.log(`Running ${order.length} trials; outputs: ${output}`);
    for (const spec of order) {
      if (interrupted) throw new Error("Benchmark interrupted");
      const { page, geometry } = await prepareScene(context, server.url, spec);
      try {
        const cdp = await context.newCDPSession(page);
        await cdp.send("Performance.enable");
        const before = metricValues((await cdp.send("Performance.getMetrics")).metrics);
        const data = await withTimeout(page.evaluate(() => window.switchBench.runTrial()));
        const after = metricValues((await cdp.send("Performance.getMetrics")).metrics);
        const entry = {
          ...spec, geometry, ...data,
          layoutPasses: metricDelta(before, after, "LayoutCount"),
          styleRecalculations: metricDelta(before, after, "RecalcStyleCount"),
          layoutMs: metricDelta(before, after, "LayoutDuration", 1000),
          styleMs: metricDelta(before, after, "RecalcStyleDuration", 1000),
          scriptMs: metricDelta(before, after, "ScriptDuration", 1000),
          mainThreadTaskMs: metricDelta(before, after, "TaskDuration", 1000),
          jsHeapBytes: after.JSHeapUsedSize ?? null,
        };
        report.runs.push(entry);
        save();
        console.log(`${report.runs.length}/${order.length} ${spec.variant} count=${spec.count} hint=${spec.hint} trial=${spec.trial}: rAF ${entry.rafFps?.toFixed(1) ?? "n/a"}, layout ${entry.layoutMs?.toFixed(1) ?? "n/a"}ms`);
      } finally { await page.close(); }
    }
    report.status = "complete";
    report.completedAt = new Date().toISOString();
    save();
    if (options.trace) {
      const largest = Math.max(...options.counts);
      report.diagnostics = await collectDiagnostics(context, server.url, cases.filter(spec => spec.count === largest), output);
      save();
    }
    writeReport(report, output);
    console.log(`Open ${join(output, "index.html")} for graphs. Raw data: ${join(output, "results.json")}`);
    return output;
  } catch (error) {
    if (report.status !== "complete") report.status = interrupted ? "interrupted" : "failed";
    report.error = String(error.message ?? error);
    throw error;
  } finally {
    save();
    await browser?.close().catch(() => {});
    await server?.close();
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseOptions(process.argv.slice(2));
    if (options.help) console.log(HELP);
    else await runBenchmark(options);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
