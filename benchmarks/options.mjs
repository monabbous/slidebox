import { VARIANTS } from "./metrics.mjs";

export function parseOptions(args) {
  const options = { headed: false, trace: false, trials: 5, counts: [500, 2000], variants: [...VARIANTS], seed: 20261031 };
  const positive = (value, name, maximum) => {
    if (!/^\d+$/.test(value ?? "") || Number(value) < 1 || Number(value) > maximum) {
      throw new Error(`${name} must be an integer from 1 to ${maximum}`);
    }
    return Number(value);
  };
  for (let i = 0; i < args.length; i++) {
    const argument = args[i];
    if (argument === "--headed") options.headed = true;
    else if (argument === "--trace") options.trace = true;
    else if (argument === "--help") options.help = true;
    else if (argument === "--trials") options.trials = positive(args[++i], "--trials", 100);
    else if (argument === "--counts") {
      options.counts = [...new Set((args[++i] ?? "").split(",").map(value => positive(value, "--counts", 2000)))];
    } else if (argument === "--variants") {
      options.variants = [...new Set((args[++i] ?? "").split(","))];
      if (options.variants.some(variant => !VARIANTS.includes(variant))) throw new Error(`--variants must use: ${VARIANTS.join(",")}`);
    } else if (argument === "--seed") {
      const value = args[++i];
      if (!/^\d+$/.test(value ?? "") || Number(value) > 0xffffffff) throw new Error("--seed must be an unsigned 32-bit integer");
      options.seed = Number(value);
    } else if (argument === "--output") {
      options.output = args[++i];
      if (!options.output || options.output.startsWith("--")) throw new Error("--output requires a directory");
    } else throw new Error(`Unknown option: ${argument}`);
  }
  return options;
}

export const HELP = `Run reproducible switch technique comparisons.

  npm run benchmark -- [options]

  --headed              Open Chromium normally; recommended for GPU comparisons
  --counts 500,2000     Visible controls per scene (1-2000)
  --trials 5            Independent trials per case (1-100)
  --variants LIST       slidebox,edge,translate,grid-track,native
  --trace               Collect separate instrumented paint diagnostics afterward
  --seed 20261031        Reproducible randomized trial order
  --output DIRECTORY    Empty output directory; defaults to benchmark-results/<timestamp>
  --help                Show this message without launching a browser

Default: isolated, headless Chromium; no video or screenshot recording.
FPS means rAF callback cadence, not actual GPU-presented FPS.
`;
