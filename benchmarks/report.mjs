import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { VARIANTS, LABELS, createCases, median } from "./metrics.mjs";

const METRICS = [
  ["rafFps", "rAF callback cadence", "callbacks/sec", 1],
  ["p95FrameMs", "95th-percentile callback interval", "ms", 1],
  ["layoutMs", "Layout time per two-batch trial", "ms", 1],
  ["styleMs", "Style recalculation time per trial", "ms", 1],
  ["layoutPasses", "Layout passes per trial", "passes", 0],
  ["cls", "Maximum CLS session score per trial", "score", 5],
];
const escape = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const format = (value, digits = 1) => Number.isFinite(value) ? value.toFixed(digits) : "n/a";

export function validateReport(report) {
  if (report.schemaVersion !== 1 || report.status !== "complete") throw new Error("Only complete schema-version 1 results can be graphed");
  const { counts, variants, trials } = report.method ?? {};
  if (!Array.isArray(counts) || !counts.length || new Set(counts).size !== counts.length || counts.some(n => !Number.isInteger(n) || n < 1 || n > 2000)) throw new Error("Invalid counts");
  if (!Array.isArray(variants) || !variants.length || new Set(variants).size !== variants.length || variants.some(v => !VARIANTS.includes(v))) throw new Error("Invalid variants");
  if (!Number.isInteger(trials) || trials < 1 || trials > 100) throw new Error("Invalid trial count");
  const cases = createCases(variants, counts);
  if (!Array.isArray(report.runs) || report.runs.length !== cases.length * trials) throw new Error("Missing trial results");
  const keys = new Set(cases.map(spec => JSON.stringify([spec.variant, spec.count, spec.hint])));
  const seen = new Set();
  for (const run of report.runs) {
    if (!keys.has(JSON.stringify([run.variant, run.count, run.hint])) || !Number.isInteger(run.trial) || run.trial < 1 || run.trial > trials) throw new Error("Unexpected trial");
    const key = JSON.stringify([run.variant, run.count, run.hint, run.trial]);
    if (seen.has(key)) throw new Error("Duplicate trial");
    seen.add(key);
    for (const [name] of METRICS) {
      if (run[name] !== null && (!Number.isFinite(run[name]) || run[name] < 0)) throw new Error(`Invalid metric: ${name}`);
    }
  }
  if (report.diagnostics) {
    if (!Array.isArray(report.diagnostics.runs)) throw new Error("Invalid diagnostics");
    for (const run of report.diagnostics.runs) {
      if (!keys.has(JSON.stringify([run.variant, run.count, run.hint])) || !/^traces\/(slidebox|edge|translate|grid-track|native)-\d+-(hint|auto)\.json\.gz$/.test(run.trace)) throw new Error("Invalid diagnostic trace path");
    }
  }
  return cases.map(spec => ({ ...spec, runs: report.runs.filter(run => run.variant === spec.variant && run.count === spec.count && run.hint === spec.hint) }));
}

function chart(rows, metric, title, unit, digits) {
  const maximum = Math.max(metric === "cls" ? .00001 : 1, ...rows.flatMap(row => row.runs.map(run => run[metric]).filter(Number.isFinite)));
  const left = 280, available = 500, height = rows.length * 42 + 55;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 ${height}" role="img" aria-label="${escape(title)}"><style>text{font-family:system-ui,sans-serif;fill:#18313e}</style><line x1="${left}" x2="${left}" y1="10" y2="${height - 30}" stroke="#b9ccd6"/>`;
  rows.forEach((row, index) => {
    const values = row.runs.map(run => run[metric]).filter(Number.isFinite);
    const middle = median(values), low = values.length ? Math.min(...values) : null, high = values.length ? Math.max(...values) : null;
    const y = 16 + index * 42;
    const label = `${LABELS[row.variant]}${row.variant === "native" ? "" : row.hint ? " · hint" : " · auto"}`;
    svg += `<text x="0" y="${y + 17}" font-size="18">${escape(label)}</text>`;
    if (middle !== null) {
      svg += `<rect x="${left}" y="${y}" width="${middle / maximum * available}" height="23" rx="2" fill="${row.hint ? "#d17b22" : "#008f91"}"><title>${escape(label)}: median ${format(middle, digits)}, min ${format(low, digits)}, max ${format(high, digits)} ${escape(unit)}</title></rect><line x1="${left + low / maximum * available}" x2="${left + high / maximum * available}" y1="${y + 11}" y2="${y + 11}" stroke="#173847" stroke-width="2"/>`;
    }
    svg += `<text x="${high === null ? left + 8 : left + high / maximum * available + 8}" y="${y + 17}" font-size="16">${format(middle, digits)}</text>`;
  });
  return svg + `<text x="${left}" y="${height - 8}" font-size="15">Median bar; minimum–maximum whisker; ${escape(unit)}</text></svg>`;
}

export function writeReport(report, output) {
  const groups = validateReport(report);
  mkdirSync(output, { recursive: true });
  const sections = report.method.counts.map(count => {
    const rows = groups.filter(group => group.count === count);
    const charts = METRICS.map(([metric, title, unit, digits]) => {
      const file = `${metric}-${count}.svg`;
      writeFileSync(join(output, file), chart(rows, metric, title, unit, digits));
      return `<section class="card"><h3>${escape(title)}</h3><a href="${file}" target="_blank" rel="noopener" title="Open full-size graph"><img src="${file}" alt="${escape(title)}, ${count} controls"></a></section>`;
    }).join("");
    return `<h2>${count.toLocaleString()} visible controls</h2><div class="charts">${charts}</div>`;
  }).join("");
  const columns = [...METRICS, ["longIntervalPercent", "Intervals >25ms", "%", 1], ["styleRecalculations", "Style recalculations", "", 0], ["layoutShiftEntries", "Shift entries", "", 0], ["longAnimationFrames", "Long animation frames", "", 0], ["sampledFrames", "Sampled intervals", "", 0], ["jsHeapBytes", "JS heap (not GPU memory)", "bytes", 0]];
  const table = `<table><thead><tr><th>Technique</th><th>Count</th><th>Hint</th><th>Trials</th>${columns.map(([, title, unit]) => `<th>${escape(title)} ${escape(unit)}</th>`).join("")}</tr></thead><tbody>${groups.map(group => `<tr><td>${escape(LABELS[group.variant])}</td><td>${group.count}</td><td>${group.hint ? "on" : "auto"}</td><td>${group.runs.length}</td>${columns.map(([name, , , digits]) => `<td>${format(median(group.runs.map(run => run[name])), digits)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  let diagnostics = "";
  if (report.diagnostics?.runs?.length) {
    const rows = report.diagnostics.runs.map(run => ({ ...run, runs: [{ paintMs: run.events.Paint?.inclusiveMs ?? null }] }));
    writeFileSync(join(output, "paint-diagnostics.svg"), chart(rows, "paintMs", "Separate traced Paint event durations", "inclusive ms", 1));
    diagnostics = `<h2>Separate paint diagnostics</h2><p>One traced diagnostic per selected case at the largest count, not part of the repeated primary FPS sample. Inclusive Paint event durations can overlap nested work; they are not GPU raster or presentation times.</p><a href="paint-diagnostics.svg"><img src="paint-diagnostics.svg" alt="Separate traced paint diagnostics"></a><ul>${report.diagnostics.runs.map(run => `<li><a href="${escape(run.trace)}" download>${escape(LABELS[run.variant])}, ${run.count}, ${run.hint ? "hint" : "auto"}: DevTools trace</a></li>`).join("")}</ul>`;
  }
  const lowSamples = report.runs.filter(run => run.lowSampleCount).length;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Slidebox technique benchmarks</title><style>
*{box-sizing:border-box}body{font:15px/1.7 system-ui;margin:0;background:#edf3f7;color:#18313e}main{max-width:1400px;margin:32px auto;padding:0 24px 60px}a{color:#007f80}h1{font-size:36px;line-height:1.2;letter-spacing:-.04em}h2{margin-top:36px}h3{margin:0 0 10px;font-size:16px}.note{background:#fff3cf;border-left:4px solid #b67d14;padding:16px}.charts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.card{background:white;border:1px solid #d9e5eb;border-radius:10px;padding:18px;min-width:0}img{display:block;max-width:100%;height:auto;width:100%}table{display:block;overflow:auto;border-collapse:collapse;width:100%;font-size:12px;background:white}td,th{padding:9px;border:1px solid #d9e5eb;text-align:left;white-space:nowrap}th{background:#e5f1f4}pre{overflow:auto;background:#102b3b;color:#e8f6fa;padding:20px;border-radius:8px}.legend{display:flex;gap:24px;flex-wrap:wrap;margin:18px 0}.legend span:before{content:'';display:inline-block;width:12px;height:12px;background:#008f91;margin-right:7px}.legend span+span:before{background:#d17b22}@media(max-width:900px){.charts{display:block}.card{margin-bottom:18px}}
</style></head><body><main><h1>Switch technique comparison</h1><p>${report.method.trials} trials per case; all controls change together twice per trial. <a href="results.json" download>Download raw results</a>.</p><div class="note"><strong>rAF cadence, not GPU-presented FPS.</strong> These are programmatic batches, not real-user INP or field Core Web Vitals. The transform/grid/native scenes do not reproduce the same elastic shape; these graphs do not rank vendor libraries.</div><p>This run was ${report.environment.headless ? "headless" : "headed"}. Renderer: ${escape(report.environment.graphics?.renderer ?? "unknown")}. ${lowSamples} trials had fewer than 10 sampled intervals; treat those overload cases cautiously.</p><p>Less layout work in a low-cadence scene can mean frames were skipped or state changes coalesced. Zero CLS does not mean zero layout. Hinting thousands of elements can cost resources rather than help. Click a graph for its full-size SVG.</p><div class="legend"><span>will-change: auto</span><span>Property-specific hint before warmup</span></div>${sections}<h2>Detailed results</h2><p>Cells are medians; unavailable counters display n/a, not zero. The native checkbox has no equivalent animation. Layout passes are not a count of changed inputs. JS heap excludes compositor/process/GPU memory.</p>${table}${diagnostics}<h2>Environment and reproducibility</h2><pre>${escape(JSON.stringify({ startedAt: report.startedAt, completedAt: report.completedAt, method: report.method, environment: report.environment }, null, 2))}</pre><p>Read benchmarks/README.md in the source checkout for sources, limitations, and reproduction steps. Keep these qualifications with any shared graphs.</p></main></body></html>`;
  writeFileSync(join(output, "index.html"), html);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3) throw new Error("Usage: npm run benchmark:report -- path/to/results.json");
    const input = resolve(process.argv[2]);
    writeReport(JSON.parse(readFileSync(input, "utf8")), dirname(input));
    console.log(`Report written to ${join(dirname(input), "index.html")}`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
