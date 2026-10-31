import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

// A new automated demonstration, not an upscale of the author's recording.
// Pause real CSS transitions and render their timeline at exactly 60 samples/s.
const css = readFileSync(new URL("../dist/css/slidebox.css", import.meta.url), "utf8");
const elastic = t => {
  if (t === 0 || t === 1) return t;
  const c = 2 * Math.PI / 4.5;
  return t < .5 ? -(2 ** (20 * t - 10) * Math.sin((20 * t - 11.125) * c)) / 2
    : (2 ** (-20 * t + 10) * Math.sin((20 * t - 11.125) * c)) / 2 + 1;
};
const timing = "linear(" + Array.from({ length: 161 }, (_, i) => `${elastic(i / 160).toFixed(5)} ${i / 160 * 100}%`).join(",") + ")";
const temporary = mkdtempSync(join(tmpdir(), "slidebox-cover-"));
const output = fileURLToPath(new URL("../public/assets/", import.meta.url));
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: "chromium", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: "dark", reducedMotion: "no-preference" });
  await page.setContent(`<!doctype html><html><head><style>${css}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 50%,#2a5b7c 0%,#063c59 70%);color-scheme:dark}
    .slidebox{--slidebox-size:384px;--slidebox-width:2.5;--slidebox-spacing:-.27;--slidebox-deform:.2;--slidebox-duration:350ms;--slidebox-easing:${timing};--slidebox-track:#2a5b7c;--slidebox-border:#5289a6;--slidebox-off:#d4f4f2;--slidebox-on:#00b2b2;box-shadow:inset 0 2px 8px #ffffff24,0 18px 90px #001c2b55}
    .slidebox::after{box-shadow:inset 0 2px 5px #ffffff38,0 6px 24px #001c2b40}
    </style></head><body><input type="checkbox" class="slidebox" aria-label="Slidebox cover demonstration"></body></html>`);
  await page.waitForTimeout(200);
  for (let frame = 0; frame < 240; frame++) {
    await page.evaluate(frame => {
      const input = document.querySelector("input");
      if (frame === 60 || frame === 180) {
        input.checked = frame === 60;
        void input.offsetWidth;
        window.coverAnimations = input.getAnimations({ subtree: true });
        if (!window.coverAnimations.length) throw new Error("CSS transition capture failed");
        for (const animation of window.coverAnimations) animation.pause();
      }
      if (window.coverAnimations) {
        const start = frame >= 180 ? 180 : 60;
        for (const animation of window.coverAnimations) animation.currentTime = (frame - start) * 1000 / 60;
      }
    }, frame);
    await page.screenshot({ path: join(temporary, `${String(frame).padStart(4, "0")}.png`), animations: "allow" });
  }
  execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-framerate", "60", "-i", join(temporary, "%04d.png"), "-c:v", "libwebp_anim", "-lossless", "1", "-quality", "100", "-loop", "0", join(output, "slidebox-cover.webp")]);
  writeFileSync(join(output, "slidebox-cover.json"), JSON.stringify({
    file: "slidebox-cover.webp", purpose: "High-resolution animated 16:9 blog thumbnail",
    source: "Automated browser rendering of dist/css/slidebox.css; not the author's documentary recording",
    cssSha256: createHash("sha256").update(css).digest("hex"), browser: browser.version(),
    canvas: [1920, 1080], fps: 60, durationSeconds: 4, sampledFrames: 240,
    timing: "CSS timeline sampled at 60 fps; the encoder can coalesce identical held frames",
    settings: { width: 2.5, spacing: -.27, deform: .2, duration: "350ms", easing: "easeInOutElastic" },
    encoding: "Lossless animated WebP from full-resolution browser PNG frames, loop=0; no upscaling",
    caption: "Automated demonstration of the actual CSS component, rendered at 1920×1080. Original author-recorded clips remain unchanged.",
  }, null, 2) + "\n");
  console.log("Rendered 1920×1080 cover at 60 fps (4 seconds), without upscaling");
} finally {
  await browser.close();
  rmSync(temporary, { recursive: true, force: true });
}
