import { VARIANTS, LABELS, summarizeFrames, clsScore } from "./metrics.mjs";

function configure({ variant, count, hint }) {
  if (!VARIANTS.includes(variant) || !Number.isInteger(count) || count < 1 || count > 2000) throw new Error("Invalid scene");
  document.body.classList.toggle("hint", hint);
  document.getElementById("title").textContent = `${LABELS[variant]} · ${count} controls · will-change ${hint ? "on" : "auto"}`;
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "unit " + variant;
    input.setAttribute("aria-label", "Benchmark switch " + (i + 1));
    fragment.append(input);
  }
  const grid = document.getElementById("grid");
  grid.replaceChildren(fragment);
  const last = grid.lastElementChild.getBoundingClientRect();
  const box = grid.getBoundingClientRect();
  return { visible: last.bottom <= innerHeight && box.right <= innerWidth, viewport: [innerWidth, innerHeight], lastBottom: last.bottom };
}

function runTrial() {
  return new Promise(resolve => {
    const inputs = [...document.querySelectorAll("#grid input")];
    const shifts = [], longTasks = [], loafs = [], frames = [], toggles = [], observers = [];
    const supported = new Set(PerformanceObserver.supportedEntryTypes);
    const start = performance.now();
    let last;
    for (const [type, target] of [["layout-shift", shifts], ["longtask", longTasks], ["long-animation-frame", loafs]]) {
      if (!supported.has(type)) continue;
      const append = entries => {
        for (const entry of entries) target.push({
          startTime: entry.startTime, value: entry.value ?? 0,
          hadRecentInput: entry.hadRecentInput ?? false, duration: entry.duration ?? 0,
          blockingDuration: entry.blockingDuration ?? 0,
        });
      };
      const observer = new PerformanceObserver(list => append(list.getEntries()));
      observer.observe({ type });
      observers.push({ observer, append });
    }
    function toggle(value) {
      const begin = performance.now();
      for (const input of inputs) input.checked = value;
      toggles.push({ begin, end: performance.now(), value });
    }
    setTimeout(() => toggle(true), 50);
    setTimeout(() => toggle(false), 500);
    function frame(now) {
      if (last !== undefined) frames.push({ begin: last, end: now });
      last = now;
      // Heavy scenes may delay the second timer. Always include its active window.
      if (toggles.length < 2 || now - start < 1000 || now < toggles[1].begin + 300) {
        requestAnimationFrame(frame);
        return;
      }
      setTimeout(() => {
        for (const { observer, append } of observers) {
          append(observer.takeRecords());
          observer.disconnect();
        }
        resolve({
          elapsedMs: performance.now() - start,
          ...summarizeFrames(frames, toggles),
          toggleScriptMs: toggles.reduce((sum, toggle) => sum + toggle.end - toggle.begin, 0),
          layoutShiftEntries: supported.has("layout-shift") ? shifts.length : null,
          layoutShiftRawSum: supported.has("layout-shift") ? shifts.reduce((sum, entry) => sum + entry.value, 0) : null,
          cls: supported.has("layout-shift") ? clsScore(shifts) : null,
          longTasks: supported.has("longtask") ? longTasks.length : null,
          longTaskBlockingMs: supported.has("longtask") ? longTasks.reduce((sum, entry) => sum + Math.max(0, entry.duration - 50), 0) : null,
          longAnimationFrames: supported.has("long-animation-frame") ? loafs.length : null,
          loafBlockingMs: supported.has("long-animation-frame") ? loafs.reduce((sum, entry) => sum + entry.blockingDuration, 0) : null,
          toggles: toggles.map(toggle => ({ atMs: toggle.begin - start, scriptMs: toggle.end - toggle.begin, value: toggle.value })),
        });
      }, 0);
    }
    requestAnimationFrame(frame);
  });
}

window.switchBench = { configure, runTrial };
if (!new URLSearchParams(location.search).has("benchmark")) {
  document.body.classList.add("manual");
  document.getElementById("toolbar").hidden = false;
  const render = () => configure({
    variant: document.getElementById("variant").value,
    count: Number(document.getElementById("count").value),
    hint: document.getElementById("hint").checked,
  });
  document.getElementById("render").addEventListener("click", render);
  document.getElementById("toggle").addEventListener("click", () => {
    const controls = document.querySelectorAll("#grid input");
    const next = !controls[0].checked;
    for (const input of controls) input.checked = next;
  });
  render();
}
