import { test, expect } from "@playwright/test";

test("the committed runtime playground loads all relative assets and works independently", async ({ page }) => {
  const failures = [];
  page.on("pageerror", error => failures.push(error.message));
  page.on("response", response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  await page.goto("/public/lab/");
  const input = page.getByRole("checkbox", { name: "Material UI, nabous.dev", exact: true });
  await expect(input).toBeVisible();
  await input.uncheck();
  await input.press("Space");
  await expect(input).toBeChecked();
  await expect(page.locator("#width")).toBeVisible();
  await page.locator("#width").fill("3");
  expect(failures).toEqual([]);
});

test("the studio preset and CSS readout keep the actual native checkbox in sync", async ({ page }) => {
  await page.goto("/public/lab/");
  await page.locator("#elasticPreset").click();
  await expect(page.locator("#width")).toHaveValue("2.5");
  await expect(page.locator("#duration")).toHaveValue("350");
  await expect(page.locator("#family")).toHaveValue("Elastic");
  await expect(page.locator("#studioCode")).toContainText("--slidebox-spacing: -0.27;");
  await page.locator("#switch").press("Space");
  await expect(page.locator("#switch")).not.toBeChecked();
  await expect(page.locator("#switchState")).toHaveText("Unchecked");
  await page.locator("#reset").click();
  await expect(page.locator("#width")).toHaveValue("2");
  await expect(page.locator("#studioCode")).toContainText("--slidebox-duration: 200ms;");
});
