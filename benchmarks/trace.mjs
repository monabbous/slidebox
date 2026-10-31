import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { prepareScene, withTimeout } from "./runtime.mjs";

export async function collectDiagnostics(context, url, cases, output) {
  mkdirSync(join(output, "traces"), { recursive: true });
  const runs = [];
  for (const spec of cases) {
    const { page } = await prepareScene(context, url, spec);
    try {
      const cdp = await context.newCDPSession(page);
      const complete = new Promise(resolve => cdp.once("Tracing.tracingComplete", resolve));
      await cdp.send("Tracing.start", {
        categories: "devtools.timeline,blink.user_timing,disabled-by-default-devtools.timeline.frame,toplevel",
        transferMode: "ReturnAsStream",
      });
      await withTimeout(page.evaluate(() => window.switchBench.runTrial()));
      await cdp.send("Tracing.end");
      const { stream } = await withTimeout(complete);
      const buffers = [];
      try {
        for (;;) {
          const chunk = await cdp.send("IO.read", { handle: stream, size: 1048576 });
          buffers.push(Buffer.from(chunk.data, chunk.base64Encoded ? "base64" : "utf8"));
          if (chunk.eof) break;
        }
      } finally { await cdp.send("IO.close", { handle: stream }); }
      const bytes = Buffer.concat(buffers);
      const trace = JSON.parse(bytes.toString());
      const mainThreads = new Set(trace.traceEvents.filter(event =>
        event.ph === "M" && event.name === "thread_name" && event.args?.name === "CrRendererMain"
      ).map(event => `${event.pid}:${event.tid}`));
      const events = trace.traceEvents.filter(event => event.ph === "X" && mainThreads.has(`${event.pid}:${event.tid}`));
      const summaries = {};
      for (const name of ["Layout", "UpdateLayoutTree", "PrePaint", "Paint"]) {
        const selected = events.filter(event => event.name === name);
        summaries[name] = mainThreads.size ? {
          count: selected.length,
          inclusiveMs: selected.reduce((sum, event) => sum + (event.dur ?? 0) / 1000, 0),
          maxMs: selected.reduce((max, event) => Math.max(max, (event.dur ?? 0) / 1000), 0),
        } : null;
      }
      const filename = `${spec.variant}-${spec.count}-${spec.hint ? "hint" : "auto"}.json.gz`;
      writeFileSync(join(output, "traces", filename), gzipSync(bytes));
      runs.push({ ...spec, trace: "traces/" + filename, events: summaries });
      console.log(`Saved diagnostic trace: ${filename}`);
    } finally { await page.close(); }
  }
  const diagnostics = {
    warning: "Separate, single traced diagnostics. Inclusive event timings may overlap nested work and exclude GPU raster/presentation time. Do not mix them into primary untraced timing samples.",
    runs,
  };
  writeFileSync(join(output, "diagnostics.json"), JSON.stringify(diagnostics, null, 2) + "\n");
  return diagnostics;
}
