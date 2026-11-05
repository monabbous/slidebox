import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/tests/browser/fixture.html");
});

test("range retains native steps, keyboard controls, and form submission", async ({ page }) => {
  const range = page.getByRole("slider", { name: "Volume" });
  await range.focus();
  await range.press("ArrowRight");
  await expect(range).toHaveValue("45");
  await range.press("End");
  await expect(range).toHaveValue("100");
  expect(await page.locator("#form").evaluate(form => new FormData(form).get("volume"))).toBe("100");
  await range.press("Home");
  await expect(range).toHaveValue("0");
  await expect(range).toHaveCSS("outline-style", "solid");
});

test("checkbox paint layers keep one input and share native thumb geometry in LTR and RTL", async ({ page }) => {
  const input = page.locator("#switch");
  const read = (element, pseudo) => {
    const style = getComputedStyle(element, pseudo);
    return [style.width, style.height, style.marginInlineStart, style.marginInlineEnd, style.marginTop, style.marginBottom, style.transitionDuration, style.transitionDelay];
  };
  for (const direction of ["ltr", "rtl"]) {
    await input.evaluate((element, direction) => { element.dir = direction; element.removeAttribute("data-slidebox-thumb-layers"); }, direction);
    await input.uncheck();
    await expect.poll(() => input.evaluate(element => parseFloat(getComputedStyle(element, "::after").marginInlineStart))).toBeCloseTo(8.25, 1);
    const original = await input.evaluate(read, "::after");
    await input.evaluate(element => element.setAttribute("data-slidebox-thumb-layers", ""));
    expect(await input.evaluate(read, "::before")).toEqual(original);
    expect(await input.evaluate(read, "::after")).toEqual(original);
    expect(await input.evaluate(element => element.parentElement.children.length)).toBe(1);
    await input.press("Space");
    await expect(input).toBeChecked();
    for (let frame = 0; frame < 6; frame++) {
      expect(await input.evaluate(element => {
        const a = getComputedStyle(element, "::before"), b = getComputedStyle(element, "::after");
        return ["width", "height", "marginInlineStart", "marginInlineEnd"].every(key => Math.abs(parseFloat(a[key]) - parseFloat(b[key])) < .1);
      })).toBe(true);
      await page.waitForTimeout(40);
    }
    expect(await page.locator("#form").evaluate(form => new FormData(form).get("enabled"))).toBe("on");
  }
});

test("range layers reuse two decorative spans, remain native, and restore media/reset/cleanup state", async ({ page }) => {
  await page.evaluate(async () => {
    const { enhanceSlideboxRange, enhanceSlideboxRangeFill } = await import("/experimental/range.mjs");
    const input = document.querySelector("#volume");
    window.layerCleanup = enhanceSlideboxRange(input, { layers: true });
    window.layerFillCleanup = enhanceSlideboxRangeFill(input);
  });
  const range = page.locator("#volume"), visual = page.locator("[data-slidebox-range-visual]");
  await expect(range).toHaveAttribute("data-slidebox-range-layers", "");
  await expect(visual).toHaveCount(1);
  await expect(visual.locator("*")).toHaveCount(1);
  await expect(visual.locator("[data-slidebox-range-thumb]")).toHaveCount(1);
  await page.locator("#form").evaluate(form => {
    const banner = document.createElement("div");
    banner.style.height = "120px";
    form.before(banner);
  });
  await expect.poll(() => range.evaluate(input => Math.abs(input.getBoundingClientRect().top - input.nextElementSibling.getBoundingClientRect().top))).toBeLessThan(.5);
  expect(await visual.evaluate(element => getComputedStyle(element, "::before").content)).toBe('""');
  await range.press("End");
  await expect(range).toHaveValue("100");
  await expect(range).not.toHaveAttribute("data-slidebox-range-dragging");
  await expect(visual).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await range.press("Home");
  await expect(range).toHaveValue("0");
  await expect(visual).toHaveCount(1);
  await expect(range).not.toHaveAttribute("data-slidebox-range-dragging");
  await page.locator("#form").evaluate(form => form.reset());
  await expect(range).toHaveValue("40");
  await expect.poll(() => visual.evaluate(element => element.style.getPropertyValue("--slidebox-visual-progress"))).toBe("0.4");
  await page.emulateMedia({ forcedColors: "active" });
  await expect(visual).toHaveCount(0);
  await expect(range).not.toHaveAttribute("data-slidebox-range-layers");
  await page.emulateMedia({ forcedColors: "none" });
  await expect(visual).toHaveCount(1);
  await range.evaluate(input => { input.disabled = true; });
  await expect(visual).toHaveCSS("opacity", "0.5");
  await page.evaluate(() => { window.layerCleanup(); window.layerCleanup(); window.layerFillCleanup(); });
  await expect(visual).toHaveCount(0);
  await expect(range).not.toHaveAttribute("data-slidebox-range-layers");
  expect(await range.evaluate(input => input.style.getPropertyValue("--slidebox-range-stretch"))).toBe("");
});

test("a resting layered range does not run an idle animation loop", async ({ page }) => {
  await page.evaluate(async () => {
    const raf = window.requestAnimationFrame.bind(window);
    window.layerFrames = 0;
    window.requestAnimationFrame = callback => { window.layerFrames++; return raf(callback); };
    const { enhanceSlideboxRange } = await import("/experimental/range.mjs");
    window.layerCleanup = enhanceSlideboxRange(document.querySelector("#volume"), { layers: true });
  });
  await page.waitForTimeout(150);
  const frames = await page.evaluate(() => window.layerFrames);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.layerFrames)).toBe(frames);
  await page.evaluate(() => window.layerCleanup());
});

test("range pointer interaction changes the value without custom JavaScript", async ({ page }) => {
  const range = page.locator("#volume");
  const box = await range.boundingBox();
  await page.mouse.click(box.x + box.width * .8, box.y + box.height / 2);
  expect(Number(await range.inputValue())).toBeGreaterThan(40);
});

test("optional progress fill works independently of motion and follows values, RTL, reset, and cleanup", async ({ page }) => {
  await page.waitForFunction(() => window.enableRangeFill);
  await page.evaluate(() => window.enableRangeFill());
  const range = page.locator("#volume");
  const fill = () => range.evaluate(el => el.style.getPropertyValue("--slidebox-range-fill"));
  expect(await fill()).toBe("0.4");
  await expect(range).toHaveAttribute("data-slidebox-range-fill", "");
  await expect(range).not.toHaveAttribute("data-slidebox-range-dragging");
  expect(await range.evaluate(el => getComputedStyle(el).backgroundImage)).toContain("linear-gradient");
  await range.press("End");
  expect(await fill()).toBe("1");
  await range.press("Home");
  expect(await fill()).toBe("0");
  await range.evaluate(el => { el.dir = "rtl"; });
  expect(await range.evaluate(el => getComputedStyle(el).backgroundImage)).toContain("to left");
  await page.locator("#form").evaluate(form => form.reset());
  await expect.poll(fill).toBe("0.4");
  await page.evaluate(() => window.destroyFill());
  await expect(range).not.toHaveAttribute("data-slidebox-range-fill");
  expect(await fill()).toBe("");
  expect(await range.evaluate(el => getComputedStyle(el).backgroundImage)).toBe("none");
});

test("playground fill and motion toggles are independent and reset together", async ({ page }) => {
  await page.goto("/");
  await page.locator("#rangeSection").scrollIntoViewIfNeeded();
  const range = page.locator("#rangePreview");
  await expect(page.locator("#rangeFillEnabled")).not.toBeChecked();
  await page.locator("#rangeFillEnabled").check();
  await expect(range).toHaveAttribute("data-slidebox-range-fill", "");
  await expect(page.locator("#rangeMotionEnabled")).not.toBeChecked();
  await range.press("End");
  expect(await range.evaluate(el => el.style.getPropertyValue("--slidebox-range-fill"))).toBe("1");
  await page.locator("#rangeMotionEnabled").check();
  await range.press("Home");
  await expect(page.locator("[data-slidebox-range-visual]")).toBeAttached();
  await page.locator("#reset").click();
  await expect(page.locator("#rangeMotionEnabled")).not.toBeChecked();
  await expect(page.locator("#rangeFillEnabled")).not.toBeChecked();
  await expect(range).not.toHaveAttribute("data-slidebox-range-fill");
  await expect(page.locator("[data-slidebox-range-visual]")).toHaveCount(0);
});

test("playground spacing controls also update native range insets", async ({ page }) => {
  await page.goto("/");
  await page.locator("#rangeSection").scrollIntoViewIfNeeded();
  const range = page.locator("#rangePreview");
  await page.locator("#spacing").fill("0.5");
  await page.locator("#rangeFillEnabled").check();
  await expect(range).toHaveCSS("padding-inline-start", "8px");
  await expect(range).toHaveCSS("padding-inline-end", "8px");
  const fillSize = await range.evaluate(el => getComputedStyle(el).backgroundSize);
  expect(fillSize).toContain("16px 16px");
  expect(fillSize).toContain("max(0px, 100% - 16px) 16px");
  await page.locator("#spacing").fill("0.03");
  await expect(range).toHaveCSS("padding-inline-start", "0.48px");
});

test("radio press stretches only toward a different target, including RTL", async ({ page }) => {
  const group = page.locator("#periodGroup");
  const margins = () => group.evaluate(el => {
    const style = CSS.supports("anchor-scope", "--test")
      ? getComputedStyle(el, "::before")
      : getComputedStyle(el.querySelector("input:checked + span"), "::before");
    return { start: parseFloat(style.marginInlineStart), end: parseFloat(style.marginInlineEnd) };
  });
  for (const direction of ["ltr", "rtl"]) {
    await group.evaluate((el, dir) => { el.dir = dir; }, direction);
    for (const [label, edge] of [["Week", "none"], ["Month", "end"], ["Day", "start"]]) {
      const selectedLabel = page.locator("#week + span");
      const initialBox = await selectedLabel.boundingBox();
      const box = await page.getByText(label, { exact: true }).boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      if (edge === "none") expect(await margins()).toEqual({ start: 0, end: 0 });
      else {
        await expect.poll(async () => (await margins())[edge]).toBeLessThan(-1);
        expect((await margins())[edge === "start" ? "end" : "start"]).toBe(0);
      }
      const pressedBox = await selectedLabel.boundingBox();
      expect(pressedBox.x).toBeCloseTo(initialBox.x, 2);
      expect(pressedBox.width).toBeCloseTo(initialBox.width, 2);
      // Release outside so the original checked segment stays selected.
      await page.mouse.move(10, 10);
      await page.mouse.up();
      await expect.poll(margins).toEqual({ start: 0, end: 0 });
      await expect(page.locator("#week")).toBeChecked();
    }
  }
});

async function nativeThumbBox(page) {
  const session = await page.context().newCDPSession(page);
  try {
    const { root } = await session.send("DOM.getDocument", { depth: -1, pierce: true });
    function find(node, predicate) {
      if (predicate(node)) return node;
      for (const child of [...(node.children ?? []), ...(node.shadowRoots ?? [])]) {
        const found = find(child, predicate);
        if (found) return found;
      }
    }
    const input = find(root, node => node.nodeName === "INPUT" && node.attributes?.includes("volume"));
    const thumb = find(input, node => node.attributes?.includes("thumb"));
    const { model } = await session.send("DOM.getBoxModel", { nodeId: thumb.nodeId });
    return { left: model.border[0], right: model.border[2], width: model.width };
  } finally { await session.detach(); }
}

test("range endpoints preserve spacing even when directionally stretched", async ({ page }) => {
  const range = page.locator("#volume");
  for (const dir of ["ltr", "rtl"]) {
    for (const [value, stretch] of [["0", 0], ["100", 0], ["0", -.1], ["100", .1]]) {
      await range.evaluate((el, state) => {
        el.dir = state.dir;
        el.value = state.value;
        el.setAttribute("data-slidebox-range-dragging", "");
        el.style.setProperty("--slidebox-range-stretch", String(state.stretch));
        el.style.setProperty("--slidebox-range-progress", String(Number(state.value) / 100));
      }, { dir, value, stretch });
      const box = await range.boundingBox();
      const thumb = await nativeThumbBox(page);
      const inset = 24 * .33 / 2;
      expect(thumb.left - box.x).toBeGreaterThanOrEqual(inset - .1);
      expect(box.x + box.width - thumb.right).toBeGreaterThanOrEqual(inset - .1);
    }
  }
});

test("the visual tail keeps its leading edge at the native destination without resizing the hit box", async ({ page }) => {
  const range = page.locator("#volume");
  await page.waitForFunction(() => window.enableRangeMotion);
  for (const dir of ["ltr", "rtl"]) {
    for (const stretch of [-.3, .3]) {
      const from = stretch > 0 ? "20" : "80";
      const to = stretch > 0 ? "80" : "20";
      await range.evaluate((el, state) => {
        el.dir = state.dir;
        el.style.setProperty("--slidebox-duration", "1000ms");
        el.value = state.to;
      }, { dir, to });
      const rest = await nativeThumbBox(page);
      await range.evaluate((el, value) => { el.value = value; }, from);
      await page.evaluate(() => window.enableRangeMotion());
      await range.evaluate((el, value) => { el.value = value; el.dispatchEvent(new Event("input", { bubbles: true })); }, to);
      const native = await nativeThumbBox(page);
      const box = await page.locator("[data-slidebox-range-visual] > span").boundingBox();
      const stretched = { left: box.x, right: box.x + box.width, width: box.width };
      const edge = (stretch > 0) === (dir === "ltr") ? "right" : "left";
      expect(stretched[edge], `${dir}: stretch ${stretch}, ${edge} edge`).toBeCloseTo(rest[edge], 0);
      expect(stretched.width).toBeGreaterThan(rest.width);
      expect(native.width).toBe(rest.width);
      await page.evaluate(() => window.destroyRange());
    }
  }
});

test("dragging with the visual tail preserves a fixed native thumb and monotonic values", async ({ page }) => {
  await page.waitForFunction(() => window.enableRangeMotion);
  await page.evaluate(() => window.enableRangeMotion());
  const range = page.locator("#volume");
  const box = await range.boundingBox();
  const width = (await nativeThumbBox(page)).width;
  await page.mouse.move(box.x + box.width * .2, box.y + box.height / 2);
  await page.mouse.down();
  let previous = Number(await range.inputValue());
  for (let step = 3; step <= 9; step++) {
    await page.mouse.move(box.x + box.width * step / 10, box.y + box.height / 2);
    const value = Number(await range.inputValue());
    expect(value).toBeGreaterThanOrEqual(previous);
    expect(value).toBeLessThanOrEqual(step * 10 + 5);
    expect((await nativeThumbBox(page)).width).toBe(width);
    previous = value;
  }
  await page.mouse.up();
});

test("range enhancement deforms toward the pointer without replacing native events", async ({ page }) => {
  await page.waitForFunction(() => window.enableRangeMotion);
  await page.evaluate(() => {
    window.enableRangeMotion();
    window.rangeEvents = [];
    const input = document.getElementById("volume");
    for (const name of ["input", "change"]) input.addEventListener(name, () => window.rangeEvents.push(name));
  });
  const range = page.locator("#volume");
  const box = await range.boundingBox();
  await page.mouse.move(box.x + box.width * .85, box.y + box.height / 2);
  await page.mouse.down();
  expect(Number(await range.evaluate(el => el.style.getPropertyValue("--slidebox-range-stretch")))).toBeGreaterThan(0);
  await page.mouse.move(box.x + box.width * .2, box.y + box.height / 2);
  expect(Number(await range.evaluate(el => el.style.getPropertyValue("--slidebox-range-stretch")))).toBeLessThan(0);
  await page.mouse.up();
  expect(Number(await range.inputValue())).toBeLessThan(40);
  await expect(range).not.toHaveAttribute("data-slidebox-range-dragging");
  const events = await page.evaluate(() => window.rangeEvents);
  expect(events.filter(name => name === "change")).toHaveLength(1);
  await page.evaluate(() => window.destroyRange());
  await range.press("End");
  await expect(range).toHaveValue("100");
  expect(await range.evaluate(el => el.style.getPropertyValue("--slidebox-range-stretch"))).toBe("");
});

test("radio segments retain label clicks, arrow keys, and a single form value", async ({ page }) => {
  const week = page.getByRole("radio", { name: "Week", exact: true });
  const month = page.getByRole("radio", { name: "Month", exact: true });
  await expect(week).toBeChecked();
  await week.focus();
  await week.press("ArrowRight");
  await expect(month).toBeChecked();
  await expect(week).not.toBeChecked();
  expect(await page.locator("#form").evaluate(form => new FormData(form).getAll("period"))).toEqual(["month"]);
  await page.getByText("Day", { exact: true }).click();
  await expect(page.locator("#day")).toBeChecked();
});

test("scoped anchor indicator follows the selected segment", async ({ page }) => {
  test.skip(!await page.evaluate(() => CSS.supports("anchor-scope", "--test")), "CSS anchor positioning unavailable");
  const group = page.locator("#periodGroup");
  const initial = await group.evaluate(el => parseFloat(getComputedStyle(el, "::before").left));
  await page.getByText("Month", { exact: true }).click();
  await expect.poll(() => group.evaluate(el => parseFloat(getComputedStyle(el, "::before").left))).toBeGreaterThan(initial + 10);
  // Two groups do not resolve to one another's selected anchor.
  await group.evaluate(el => {
    const clone = el.cloneNode(true);
    clone.id = "secondGroup";
    for (const radio of clone.querySelectorAll("input")) { radio.name = "otherPeriod"; radio.removeAttribute("id"); }
    clone.querySelector("input").checked = true;
    el.after(clone);
  });
  expect(await page.locator("#secondGroup").evaluate(el => parseFloat(getComputedStyle(el, "::before").left))).toBeLessThan(initial);
});

test("disabled fieldsets, reset, and RTL preserve native group behavior", async ({ page }) => {
  await page.locator("#periodGroup").evaluate(el => { el.dir = "rtl"; });
  await page.locator("#week").focus();
  await page.locator("#week").press("ArrowRight");
  await expect(page.locator("#day")).toBeChecked();
  await page.locator("#periodFieldset").evaluate(el => { el.disabled = true; });
  await expect(page.locator("#day")).toBeDisabled();
  await expect(page.locator("#day + span")).toHaveCSS("opacity", "0.5");
  expect(await page.locator("#form").evaluate(form => new FormData(form).get("period"))).toBeNull();
  await page.locator("#form").evaluate(form => form.reset());
  await expect(page.locator("#week")).toBeChecked();
});

test("reduced-motion and forced-colors styles override experimental defaults", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
  const span = page.locator("#week + span");
  await expect(span).toHaveCSS("transition-duration", "1e-05s");
  await expect(span).toHaveCSS("outline-style", "solid");
  const group = page.locator("#periodGroup");
  expect(await group.evaluate(el => getComputedStyle(el).getPropertyValue("--_on").trim())).toBe("Highlight");
  expect(await page.locator("#volume").evaluate(el => getComputedStyle(el).getPropertyValue("--_on").trim())).toBe("Highlight");
});

test("experimental playground previews respond to controls and reset", async ({ page }) => {
  await page.goto("/");
  await page.locator("#rangeSection").scrollIntoViewIfNeeded();
  await page.locator("#rangePreview").focus();
  await page.locator("#rangePreview").press("ArrowRight");
  await expect(page.locator("#rangeValue")).toHaveText("45");
  await page.locator("#groupPreview span").last().click();
  await expect(page.locator("#groupValue")).toHaveText("month");
  await page.locator("#controlsDisabled").check();
  await expect(page.locator("#rangePreview")).toBeDisabled();
  await page.locator("#controlsRtl").check();
  await expect(page.locator("#controlsPreview")).toHaveAttribute("dir", "rtl");
  await page.locator("#reset").click();
  await expect(page.locator("#rangeValue")).toHaveText("40");
  await expect(page.locator("#groupValue")).toHaveText("week");
  await expect(page.locator("#rangePreview")).toBeEnabled();
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("range and radio segments remain usable", async ({ page }) => {
    await page.locator("#volume").focus();
    await page.locator("#volume").press("ArrowRight");
    await expect(page.locator("#volume")).toHaveValue("45");
    await page.getByText("Day", { exact: true }).click();
    await expect(page.locator("#day")).toBeChecked();
  });
});
