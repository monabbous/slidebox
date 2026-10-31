import { test, expect } from "@playwright/test";
import { startServer } from "../../benchmarks/server.mjs";

let server;
test.beforeAll(async () => { server = await startServer(); });
test.afterAll(async () => { await server?.close(); });

test("every benchmark technique fits 2000 controls in the measured viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1440 });
  await page.goto(server.url + "/?benchmark=1");
  await page.waitForFunction(() => window.switchBench);
  for (const variant of ["slidebox", "edge", "translate", "grid-track", "native"]) {
    const geometry = await page.evaluate(variant => window.switchBench.configure({ variant, count: 2000, hint: false }), variant);
    expect(geometry.visible, variant).toBe(true);
    await expect(page.locator("#grid input")).toHaveCount(2000);
  }
  await expect(page.locator("#toolbar")).toBeHidden();
});

test("manual benchmark controls render a chosen scene and toggle its native inputs", async ({ page }) => {
  await page.goto(server.url);
  await page.locator("#count").selectOption("1");
  await page.locator("#variant").selectOption("edge");
  await page.locator("#hint").check();
  await page.locator("#render").click();
  await expect(page.locator("#grid input")).toHaveCount(1);
  await expect(page.locator("#grid input")).toHaveClass(/edge/);
  await expect(page.locator("body")).toHaveClass(/hint/);
  await page.locator("#toggle").click();
  await expect(page.locator("#grid input")).toBeChecked();
});

test("benchmark trial records both batches without asserting a hardware speed", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1440 });
  await page.goto(server.url + "/?benchmark=1");
  await page.waitForFunction(() => window.switchBench);
  await page.evaluate(() => window.switchBench.configure({ variant: "slidebox", count: 1, hint: false }));
  const trial = await page.evaluate(() => window.switchBench.runTrial());
  expect(trial.toggles.map(toggle => toggle.value)).toEqual([true, false]);
  expect(trial.sampledFrames).toBeGreaterThan(0);
  await expect(page.locator("#grid input")).not.toBeChecked();
});
