export const VARIANTS = ["slidebox", "edge", "translate", "grid-track", "native"];
export const LABELS = {
  slidebox: "Slidebox margins",
  edge: "Staggered left/right edges",
  translate: "Transform slide (no stretch)",
  "grid-track": "Grid-track slide (no stretch)",
  native: "Native checkbox (no animation)",
};

export function percentile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}

export function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function summarizeFrames(frames, toggles, activeWindowMs = 300) {
  const intervals = frames.filter(frame => toggles.some(toggle =>
    frame.end > toggle.begin && frame.begin < toggle.begin + activeWindowMs
  )).map(frame => frame.end - frame.begin).filter(value => value > 0 && Number.isFinite(value));
  const mean = intervals.length ? intervals.reduce((sum, value) => sum + value, 0) / intervals.length : null;
  return {
    rafFps: mean === null ? null : 1000 / mean,
    sampledFrames: intervals.length,
    frameIntervals: intervals,
    p95FrameMs: percentile(intervals, .95),
    maxFrameMs: intervals.length ? Math.max(...intervals) : null,
    longIntervalPercent: intervals.length ? intervals.filter(value => value > 25).length / intervals.length * 100 : null,
    estimatedMissed60HzSlots: intervals.reduce((sum, value) => sum + Math.max(0, Math.round(value / (1000 / 60)) - 1), 0),
    lowSampleCount: intervals.length < 10,
  };
}

export function clsScore(entries) {
  let maximum = 0, score = 0, first = 0, last = 0;
  const eligible = entries.filter(entry => !entry.hadRecentInput).sort((a, b) => a.startTime - b.startTime);
  for (const entry of eligible) {
    if (!score || entry.startTime - last >= 1000 || entry.startTime - first >= 5000) {
      score = entry.value;
      first = entry.startTime;
    } else score += entry.value;
    last = entry.startTime;
    maximum = Math.max(maximum, score);
  }
  return maximum;
}

export function createCases(variants, counts) {
  return variants.flatMap(variant => counts.flatMap(count =>
    (variant === "native" ? [false] : [false, true]).map(hint => ({ variant, count, hint }))
  ));
}

export function trialOrder(cases, trials, initialSeed) {
  let seed = initialSeed >>> 0;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const order = [];
  for (let trial = 1; trial <= trials; trial++) {
    const round = cases.map(spec => ({ ...spec, trial }));
    for (let i = round.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [round[i], round[j]] = [round[j], round[i]];
    }
    order.push(...round);
  }
  return order;
}

export function metricDelta(before, after, name, multiplier = 1) {
  if (!Number.isFinite(before[name]) || !Number.isFinite(after[name])) return null;
  if (after[name] < before[name]) return null;
  return (after[name] - before[name]) * multiplier;
}
