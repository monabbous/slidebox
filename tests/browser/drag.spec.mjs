import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/tests/browser/fixture.html");
  await page.waitForFunction(() => window.ready);
});

async function startDrag(page, delta = 40) {
  const box = await page.locator("#switch").boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + delta, y);
}

test("drag follows the pointer, deforms, and commits exactly once", async ({ page }) => {
  const input = page.locator("#switch");
  const width = await input.evaluate(el => parseFloat(getComputedStyle(el, "::after").width));
  await startDrag(page);
  await expect(input).toHaveAttribute("data-slidebox-dragging", "");
  expect(await input.evaluate(el => parseFloat(getComputedStyle(el, "::after").width))).toBeGreaterThan(width);
  await page.mouse.up();
  await expect(input).toBeChecked();
  expect(await page.evaluate(() => window.events)).toEqual(["input", "change"]);
  await expect(input).not.toHaveAttribute("data-slidebox-dragging");
});

test("a drag ending below halfway does not turn into a native click", async ({ page }) => {
  await startDrag(page, 15);
  await page.mouse.up();
  await expect(page.locator("#switch")).not.toBeChecked();
  expect(await page.evaluate(() => window.events)).toEqual([]);
});

test("clicks, label clicks, and keyboard activation remain native", async ({ page }) => {
  const input = page.locator("#switch");
  await input.click();
  await expect(input).toBeChecked();
  await input.press("Space");
  await expect(input).not.toBeChecked();
  await page.locator("label").click({ position: { x: 170, y: 10 } });
  await expect(input).toBeChecked();
  expect(await page.evaluate(() => window.events)).toEqual(["input", "change", "input", "change", "input", "change"]);
});

test("RTL reverses the drag direction", async ({ page }) => {
  await page.locator("#switch").evaluate(el => { el.dir = "rtl"; });
  await startDrag(page, -40);
  await page.mouse.up();
  await expect(page.locator("#switch")).toBeChecked();
});

test("an initially checked switch can be dragged off", async ({ page }) => {
  await page.locator("#switch").evaluate(el => { el.checked = true; });
  await startDrag(page, -40);
  await page.mouse.up();
  await expect(page.locator("#switch")).not.toBeChecked();
  expect(await page.evaluate(() => window.events)).toEqual(["input", "change"]);
});

test("form reset abandons an active drag without changing the default value", async ({ page }) => {
  await startDrag(page);
  await page.locator("#form").evaluate(el => el.reset());
  await page.mouse.up();
  await expect(page.locator("#switch")).not.toHaveAttribute("data-slidebox-dragging");
  await expect(page.locator("#switch")).not.toBeChecked();
  expect(await page.evaluate(() => window.events)).toEqual([]);
});

test("touch dragging commits without an extra synthetic toggle", async ({ page }) => {
  const session = await page.context().newCDPSession(page);
  const box = await page.locator("#switch").boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + 40, y }] });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.locator("#switch")).toBeChecked();
  expect(await page.evaluate(() => window.events)).toEqual(["input", "change"]);
  await session.detach();
});

test("disabled fieldsets cannot start a drag", async ({ page }) => {
  await page.locator("#switch").evaluate(el => {
    const fieldset = document.createElement("fieldset");
    el.parentElement.before(fieldset);
    fieldset.append(el.parentElement);
    fieldset.disabled = true;
  });
  await startDrag(page);
  await page.mouse.up();
  await expect(page.locator("#switch")).not.toBeChecked();
  await expect(page.locator("#switch")).not.toHaveAttribute("data-slidebox-dragging");
});

test("cleanup cancels an active drag and restores native behavior", async ({ page }) => {
  await startDrag(page);
  await page.evaluate(() => window.destroy());
  await expect(page.locator("#switch")).not.toHaveAttribute("data-slidebox-dragging");
  expect(await page.locator("#switch").evaluate(el => el.style.touchAction)).toBe("");
  await page.mouse.up();
  await page.locator("#switch").uncheck();
  await page.locator("#switch").check();
  await expect(page.locator("#switch")).toBeChecked();
});

test("reduced motion keeps dragging but disables stretch", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await startDrag(page);
  expect(await page.locator("#switch").evaluate(el => el.style.getPropertyValue("--slidebox-drag-stretch"))).toBe("0");
  await page.mouse.up();
  await expect(page.locator("#switch")).toBeChecked();
});

test("playground toggle and Reset enable and disable the enhancement", async ({ page }) => {
  await page.goto("/");
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const toggle = page.locator("#dragEnabled");
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  await expect(page.locator("#switch")).toHaveCSS("touch-action", "pan-y pinch-zoom");
  await page.locator("#reset").click();
  await expect(toggle).not.toBeChecked();
  expect(await page.locator("#switch").evaluate(el => el.style.touchAction)).toBe("");
  expect(errors).toEqual([]);
});
