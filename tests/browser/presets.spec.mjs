import { test, expect } from "@playwright/test";

test("checkbox examples appear above the playground with the requested fixed geometry", async ({ page }) => {
  await page.goto("/");
  const examples = page.locator("#checkboxPresets");
  await expect(examples.getByRole("heading", { name: "Checkboxes", exact: true })).toBeVisible();
  const presets = [
    ["Default", "2", ".33", ".1"],
    ["Material UI", "2.5", "-.33", ".1"],
    ["Old iOS", "1.6", ".03", "0"],
  ];
  async function geometry(input) {
    return input.evaluate(el => {
      const css = getComputedStyle(el);
      return ["--_container-width-ratio", "--_thumb-spacing-ratio", "--_deform"].map(key => css.getPropertyValue(key).trim());
    });
  }
  for (const [name, ...expected] of presets) {
    for (const palette of ["nabous.dev", "browser colors"]) {
      const input = examples.getByRole("checkbox", { name: `${name}, ${palette}`, exact: true });
      expect(await geometry(input)).toEqual(expected);
      await input.uncheck();
      await expect(input).not.toBeChecked();
      await input.press("Space");
      await expect(input).toBeChecked();
    }
  }
  await page.locator("#width").fill("4");
  await page.locator("#spacing").fill("0.5");
  await page.locator("#deform").fill("0.5");
  for (const [name, ...expected] of presets) {
    for (const palette of ["nabous.dev", "browser colors"]) {
      expect(await geometry(examples.getByRole("checkbox", { name: `${name}, ${palette}`, exact: true }))).toEqual(expected);
    }
  }
  expect((await examples.boundingBox()).y).toBeLessThan((await page.locator(".workspace").boundingBox()).y);
  await page.getByRole("button", { name: "Light", exact: true }).click();
  await expect(examples).toHaveAttribute("data-scheme", "light");
});

test("example colors remain side by side independently of the playground palette", async ({ page }) => {
  await page.goto("/");
  const brand = page.getByRole("checkbox", { name: "Default, nabous.dev", exact: true });
  const browser = page.getByRole("checkbox", { name: "Default, browser colors", exact: true });
  for (const palette of ["brand", "native", "system", "custom"]) {
    await page.locator("#palette").selectOption(palette);
    await expect(brand).toHaveCSS("backdrop-filter", "blur(40px)");
    await expect(browser).toHaveCSS("backdrop-filter", "none");
    await expect(browser).toHaveCSS("background-image", "none");
    expect(await brand.evaluate(el => getComputedStyle(el).getPropertyValue("--_on").trim())).toBe("#00b2b2");
  }
});

test("preset table scrolls on narrow screens instead of overflowing the page", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await expect(page.locator(".presets-scroll")).toHaveCSS("overflow-x", "auto");
});

test("nabous.dev glass is the default and other palettes keep their original paint", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#palette")).toHaveValue("brand");
  await expect(page.locator("body")).toHaveClass(/brand-glass/);
  await expect(page.locator("#switch")).toHaveCSS("backdrop-filter", "blur(40px)");
  await expect(page.locator("#switch")).toHaveCSS("box-shadow", "none");
  expect(await page.locator("#switch").evaluate(el => getComputedStyle(el, "::after").backgroundImage)).toContain("radial-gradient");
  expect(await page.locator("#switch").evaluate(el => getComputedStyle(el, "::after").backgroundImage)).toContain("linear-gradient(rgb(0, 178, 178), rgb(0, 178, 178))");
  await page.locator("#palette").selectOption("native");
  await expect(page.locator("body")).not.toHaveClass(/brand-glass/);
  await expect(page.locator("#switch")).toHaveCSS("background-image", "none");
  await page.locator("#reset").click();
  await expect(page.locator("#palette")).toHaveValue("brand");
});

test("cards use the nabous.dev About border recipe", async ({ page }) => {
  await page.goto("/");
  const card = page.locator("#checkboxPresets");
  await expect(card).toHaveCSS("border-top-width", "2px");
  const border = await card.evaluate(el => {
    const style = getComputedStyle(el, "::before");
    return { width: style.borderTopWidth, mask: style.maskComposite, background: style.backgroundImage, pointerEvents: style.pointerEvents };
  });
  expect(border.width).toBe("2px");
  expect(border.mask).toContain("exclude");
  expect(border.background).toContain("radial-gradient");
  expect(border.pointerEvents).toBe("none");
});

test("checkbox thumbs paint above the glowing track border", async ({ page }) => {
  await page.goto("/");
  for (const selector of ["#switch", "#checkboxDefault", "#checkboxMaterial", "#checkboxIos"]) {
    const layers = await page.locator(selector).evaluate(el => ({
      isolation: getComputedStyle(el).isolation,
      border: Number(getComputedStyle(el, "::before").zIndex),
      thumb: Number(getComputedStyle(el, "::after").zIndex),
    }));
    expect(layers.isolation).toBe("isolate");
    expect(layers.thumb).toBeGreaterThan(layers.border);
  }
});

test("range has its own section below the playground and the page keeps its bottom underglow", async ({ page }) => {
  await page.goto("/");
  const workspace = await page.locator(".workspace").boundingBox();
  const range = page.locator("#rangeSection");
  const box = await range.boundingBox();
  expect(box.y).toBeGreaterThanOrEqual(workspace.y + workspace.height);
  await expect(range.getByRole("heading", { name: "Range slider", exact: true })).toBeVisible();
  await expect(range.getByText("Experimental", { exact: true })).toBeVisible();
  expect(await page.locator("body").evaluate(el => getComputedStyle(el).backgroundImage)).toContain("at 50% 100%");
  expect(await page.locator("body").evaluate(el => getComputedStyle(el).backgroundAttachment)).toContain("fixed");
});
