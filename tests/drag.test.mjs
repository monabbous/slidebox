import test from "node:test";
import assert from "node:assert/strict";
import { enhanceSlidebox } from "../experimental/drag.mjs";

function fixture() {
  const values = new Map();
  const attributes = new Map();
  const captures = new Set();
  const input = Object.assign(new EventTarget(), {
    tagName: "INPUT", type: "checkbox", checked: false, disabled: false,
    style: {
      getPropertyValue: key => values.get(key)?.value ?? "",
      getPropertyPriority: key => values.get(key)?.priority ?? "",
      setProperty: (key, value, priority = "") => values.set(key, { value, priority }),
      removeProperty: key => values.delete(key),
    },
    ownerDocument: { defaultView: {
      Event, PointerEvent: Event, setTimeout, clearTimeout,
      requestAnimationFrame: () => 1, cancelAnimationFrame() {},
      getComputedStyle: () => ({ direction: "ltr", getPropertyValue: key => key === "--_deform" ? ".1" : "200ms" }),
    } },
    matches: () => input.disabled,
    getBoundingClientRect: () => ({ width: 100, height: 50 }),
    getAttribute: key => attributes.get(key) ?? null,
    setAttribute: (key, value) => attributes.set(key, value),
    removeAttribute: key => attributes.delete(key),
    setPointerCapture: id => captures.add(id),
    hasPointerCapture: id => captures.has(id),
    releasePointerCapture: id => captures.delete(id),
    focus() {},
  });
  function pointer(type, x, extra = {}) {
    const event = Object.assign(new Event(type, { cancelable: true }), {
      pointerId: 1, isPrimary: true, button: 0, clientX: x, clientY: 0, ...extra,
    });
    input.dispatchEvent(event);
    return event;
  }
  return { input, pointer };
}

test("drag enhancement commits once, suppresses the pointer click, and cleans up", () => {
  const { input, pointer } = fixture();
  const events = [];
  input.addEventListener("input", () => events.push("input"));
  input.addEventListener("change", () => events.push("change"));
  const destroy = enhanceSlidebox(input);
  assert.equal(enhanceSlidebox(input), destroy);
  pointer("pointerdown", 0);
  pointer("pointermove", 40);
  assert.equal(input.style.getPropertyValue("--slidebox-drag-progress"), "0.8");
  assert.equal(input.style.getPropertyValue("--slidebox-drag-stretch"), "0.1");
  pointer("pointerup", 40);
  assert.equal(input.checked, true);
  assert.deepEqual(events, ["input", "change"]);
  assert.equal(pointer("click", 40, { detail: 1 }).defaultPrevented, true);
  assert.equal(input.getAttribute("data-slidebox-dragging"), null);
  assert.equal(input.style.getPropertyValue("--slidebox-drag-stretch"), "");
  destroy();
  assert.equal(input.style.getPropertyValue("touch-action"), "");
  pointer("pointerdown", 0);
  pointer("pointermove", -40);
  assert.equal(input.getAttribute("data-slidebox-dragging"), null);
});

test("canceling, vertical scrolling, keyboard clicks, and disabled inputs do not commit", () => {
  const { input, pointer } = fixture();
  const destroy = enhanceSlidebox(input);
  pointer("pointerdown", 0);
  pointer("pointermove", 40);
  pointer("pointercancel", 40);
  assert.equal(input.checked, false);
  assert.equal(pointer("click", 0, { detail: 0 }).defaultPrevented, false);
  pointer("pointerdown", 0);
  pointer("pointermove", 1, { clientY: 20 });
  pointer("pointerup", 40);
  assert.equal(input.checked, false);
  input.disabled = true;
  pointer("pointerdown", 0);
  pointer("pointerup", 40);
  assert.equal(input.checked, false);
  destroy();
});

test("invalid inputs, options, and unsupported browsers give actionable errors", () => {
  assert.throws(() => enhanceSlidebox(null), /checkbox/);
  const { input } = fixture();
  for (const threshold of [-1, Infinity, NaN, "5"]) {
    assert.throws(() => enhanceSlidebox(input, { threshold }), /threshold/);
  }
  delete input.ownerDocument.defaultView.PointerEvent;
  assert.throws(() => enhanceSlidebox(input), /Pointer Events/);
  assert.equal(input.style.getPropertyValue("touch-action"), "");
});

test("stretch relaxes over animation frames and respects zero deformation", () => {
  const { input, pointer } = fixture();
  let frame;
  const view = input.ownerDocument.defaultView;
  view.requestAnimationFrame = callback => { frame = callback; return 1; };
  let destroy = enhanceSlidebox(input);
  pointer("pointerdown", 0);
  pointer("pointermove", 40);
  frame(16);
  const stretch = Number(input.style.getPropertyValue("--slidebox-drag-stretch"));
  assert.ok(stretch > 0 && stretch < .1);
  frame(1000);
  assert.equal(input.style.getPropertyValue("--slidebox-drag-stretch"), "0");
  destroy();
  view.getComputedStyle = () => ({ direction: "ltr", getPropertyValue: () => "0" });
  destroy = enhanceSlidebox(input);
  pointer("pointerdown", 0);
  pointer("pointermove", 40);
  assert.equal(input.style.getPropertyValue("--slidebox-drag-stretch"), "0");
  destroy();
});

test("cleanup restores author styles, attributes, and cancels animation", () => {
  const { input, pointer } = fixture();
  let canceled = false;
  input.ownerDocument.defaultView.cancelAnimationFrame = () => { canceled = true; };
  input.style.setProperty("touch-action", "auto", "important");
  input.style.setProperty("--slidebox-drag-progress", ".25", "important");
  input.style.setProperty("--slidebox-drag-stretch", ".02");
  input.setAttribute("data-slidebox-dragging", "original");
  const destroy = enhanceSlidebox(input);
  pointer("pointerdown", 0);
  pointer("pointermove", 40);
  destroy();
  destroy();
  assert.equal(canceled, true);
  assert.equal(input.style.getPropertyValue("touch-action"), "auto");
  assert.equal(input.style.getPropertyPriority("touch-action"), "important");
  assert.equal(input.style.getPropertyValue("--slidebox-drag-progress"), ".25");
  assert.equal(input.style.getPropertyPriority("--slidebox-drag-progress"), "important");
  assert.equal(input.style.getPropertyValue("--slidebox-drag-stretch"), ".02");
  assert.equal(input.getAttribute("data-slidebox-dragging"), "original");
});

test("live-preview toggle enables and disables dragging, and Reset turns it off", async () => {
  const { input, pointer } = fixture();
  const toggle = Object.assign(new EventTarget(), { checked: false });
  const reset = new EventTarget();
  const elements = { switch: input, dragEnabled: toggle, reset };
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  globalThis.document = { getElementById: id => elements[id] };
  globalThis.window = { PointerEvent: Event };
  try {
    await import("../playground/drag-preview.mjs");
    assert.equal(input.style.getPropertyValue("touch-action"), "");
    toggle.checked = true;
    toggle.dispatchEvent(new Event("change"));
    assert.equal(input.style.getPropertyValue("touch-action"), "pan-y pinch-zoom");
    pointer("pointerdown", 0);
    pointer("pointermove", 40);
    toggle.checked = false;
    toggle.dispatchEvent(new Event("change"));
    assert.equal(input.getAttribute("data-slidebox-dragging"), null);
    assert.equal(input.checked, false);
    assert.equal(input.style.getPropertyValue("touch-action"), "");
    toggle.checked = true;
    toggle.dispatchEvent(new Event("change"));
    reset.dispatchEvent(new Event("click"));
    assert.equal(toggle.checked, false);
    assert.equal(input.style.getPropertyValue("touch-action"), "");
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});
