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
