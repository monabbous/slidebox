import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const source = readFileSync(new URL("../public/assets/slidebox-cover.webp", import.meta.url));
const browser = await chromium.launch({ channel: "chromium", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas></canvas>');
  await page.evaluate(async base64 => {
    const blob = await (await fetch(`data:image/webp;base64,${base64}`)).blob();
    // ImageBitmap decodes the first frame, not an arbitrary animation moment.
    const image = await createImageBitmap(blob);
    const canvas = document.querySelector("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.getContext("2d").drawImage(image, 0, 0);
    image.close();
  }, source.toString("base64"));
  await page.screenshot({ path: fileURLToPath(new URL("../public/assets/slidebox-social.jpg", import.meta.url)), type: "jpeg", quality: 92 });
  writeFileSync(new URL("../public/assets/slidebox-social.json", import.meta.url), JSON.stringify({
    source: "slidebox-cover.webp", sourceSha256: createHash("sha256").update(source).digest("hex"),
    frame: "first frame", canvas: [1920, 1080], output: "slidebox-social.jpg", purpose: "Static Open Graph and Twitter preview; no upscaling",
  }, null, 2) + "\n");
} finally { await browser.close(); }
