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

test("published benchmark reports use brand colors and shared card corners on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/public/benchmarks/");
  await expect(page.locator(".card").first()).toHaveCSS("border-radius", "4px");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(6, 60, 89)");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(await page.locator('a[href^="/benchmarks/"]').count()).toBe(0);
  await expect(page.getByRole("link", { name: "Article", exact: true })).toHaveAttribute("href", "https://nabous.dev/blog/slidebox/");
  const graph = await page.request.get("/public/benchmarks/rafFps-500.svg");
  expect(graph.ok()).toBe(true);
  expect(await graph.text()).toContain('fill="#00b2b2"');
});
