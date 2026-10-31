const enhancements = new WeakMap();

/** Opt in a native checkbox to experimental horizontal pointer dragging. */
export function enhanceSlidebox(input, { threshold = 5 } = {}) {
  if (input?.tagName !== "INPUT" || input.type !== "checkbox") {
    throw new TypeError("enhanceSlidebox expects a checkbox input");
  }
  if (!Number.isFinite(threshold) || threshold < 0) {
    throw new RangeError("threshold must be a non-negative number of pixels");
  }
  if (enhancements.has(input)) return enhancements.get(input);

  const view = input.ownerDocument.defaultView;
  if (!view?.PointerEvent || typeof input.setPointerCapture !== "function") {
    throw new Error("Slidebox dragging requires a browser with Pointer Events and pointer capture");
  }
  const originalTouchAction = input.style.getPropertyValue("touch-action");
  const originalTouchPriority = input.style.getPropertyPriority("touch-action");
  let gesture;
  let suppressed;
  let suppressionTimer;
  input.style.setProperty("touch-action", "pan-y pinch-zoom");

  function disabled() { return input.matches(":disabled"); }
  function clearSuppression() {
    suppressed = undefined;
    view.clearTimeout(suppressionTimer);
  }
  function suppressClick(id) {
    clearSuppression();
    suppressed = id;
    suppressionTimer = view.setTimeout(clearSuppression, 500);
  }
  function finish(commit = false) {
    if (!gesture) return;
    const current = gesture;
    gesture = undefined;
    if (current.frame !== undefined) view.cancelAnimationFrame(current.frame);
    if (current.dragging) {
      if (current.attribute === null) input.removeAttribute("data-slidebox-dragging");
      else input.setAttribute("data-slidebox-dragging", current.attribute);
      if (current.progressStyle) input.style.setProperty("--slidebox-drag-progress", current.progressStyle, current.progressPriority);
      else input.style.removeProperty("--slidebox-drag-progress");
      if (current.stretchStyle) input.style.setProperty("--slidebox-drag-stretch", current.stretchStyle, current.stretchPriority);
      else input.style.removeProperty("--slidebox-drag-stretch");
      suppressClick(current.id);
    }
    if (input.hasPointerCapture(current.id)) input.releasePointerCapture(current.id);
    if (commit && current.dragging && !disabled()) {
      const checked = current.progress >= .5;
      if (checked !== input.checked) {
        input.checked = checked;
        input.dispatchEvent(new view.Event("input", { bubbles: true }));
        input.dispatchEvent(new view.Event("change", { bubbles: true }));
      }
    }
  }
  function down(event) {
    if (gesture || disabled() || !event.isPrimary || event.button !== 0) return;
    clearSuppression();
    const box = input.getBoundingClientRect();
    const travel = box.width - box.height;
    if (travel <= 0) return;
    const computed = view.getComputedStyle(input);
    const deformation = Number.parseFloat(computed.getPropertyValue("--_deform")) || 0;
    const durationValue = computed.getPropertyValue("--_duration").trim();
    const duration = (Number.parseFloat(durationValue) || 0) * (durationValue.endsWith("ms") ? 1 : 1000);
    gesture = {
      id: event.pointerId, x: event.clientX, y: event.clientY, travel,
      start: input.checked ? 1 : 0, progress: input.checked ? 1 : 0,
      direction: computed.direction === "rtl" ? -1 : 1,
      deform: view.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : Math.max(0, Math.min(1, deformation)),
      duration, stretch: 0,
      attribute: input.getAttribute("data-slidebox-dragging"),
      progressStyle: input.style.getPropertyValue("--slidebox-drag-progress"),
      progressPriority: input.style.getPropertyPriority("--slidebox-drag-progress"),
      stretchStyle: input.style.getPropertyValue("--slidebox-drag-stretch"),
      stretchPriority: input.style.getPropertyPriority("--slidebox-drag-stretch"),
      dragging: false,
    };
    input.setPointerCapture(event.pointerId);
  }
  function relax(now) {
    if (!gesture) return;
    const elapsed = gesture.lastFrame === undefined ? 16 : Math.max(0, now - gesture.lastFrame);
    gesture.lastFrame = now;
    gesture.stretch *= Math.exp(-elapsed / Math.max(16, gesture.duration * .35));
    if (Math.abs(gesture.stretch) < .0001) gesture.stretch = 0;
    input.style.setProperty("--slidebox-drag-stretch", String(gesture.stretch));
    gesture.frame = gesture.stretch ? view.requestAnimationFrame(relax) : undefined;
    if (!gesture.stretch) gesture.lastFrame = undefined;
  }
  function move(event) {
    if (!gesture || event.pointerId !== gesture.id) return;
    if (disabled()) { finish(); return; }
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.dragging) {
      // Leave vertical gestures to page scrolling and taps to native clicks.
      if (Math.abs(dy) > threshold && Math.abs(dy) > Math.abs(dx)) { finish(); return; }
      if (Math.abs(dx) <= threshold) return;
      gesture.dragging = true;
      input.setAttribute("data-slidebox-dragging", "");
      input.focus({ preventScroll: true });
    }
    const progress = Math.max(0, Math.min(1, gesture.start + dx * gesture.direction / gesture.travel));
    gesture.stretch = Math.max(-gesture.deform, Math.min(gesture.deform, gesture.stretch + progress - gesture.progress));
    gesture.progress = progress;
    input.style.setProperty("--slidebox-drag-progress", String(gesture.progress));
    input.style.setProperty("--slidebox-drag-stretch", String(gesture.stretch));
    if (gesture.stretch && gesture.frame === undefined) gesture.frame = view.requestAnimationFrame(relax);
    event.preventDefault();
  }
  function up(event) {
    if (!gesture || event.pointerId !== gesture.id) return;
    move(event);
    finish(true);
  }
  function cancel(event) {
    if (gesture && event.pointerId === gesture.id) finish();
  }
  function click(event) {
    // Keyboard activation has detail=0 and must retain native behavior.
    if (suppressed === undefined || event.detail === 0) return;
    if ("pointerId" in event && event.pointerId !== suppressed) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    clearSuppression();
  }
  function reset() { finish(); }
  const form = input.form;
  input.addEventListener("pointerdown", down);
  input.addEventListener("pointermove", move);
  input.addEventListener("pointerup", up);
  input.addEventListener("pointercancel", cancel);
  input.addEventListener("lostpointercapture", cancel);
  input.addEventListener("click", click, true);
  form?.addEventListener("reset", reset);

  function destroy() {
    finish();
    clearSuppression();
    input.removeEventListener("pointerdown", down);
    input.removeEventListener("pointermove", move);
    input.removeEventListener("pointerup", up);
    input.removeEventListener("pointercancel", cancel);
    input.removeEventListener("lostpointercapture", cancel);
    input.removeEventListener("click", click, true);
    form?.removeEventListener("reset", reset);
    if (input.style.getPropertyValue("touch-action") === "pan-y pinch-zoom") {
      if (originalTouchAction) input.style.setProperty("touch-action", originalTouchAction, originalTouchPriority);
      else input.style.removeProperty("touch-action");
    }
    enhancements.delete(input);
  }
  enhancements.set(input, destroy);
  return destroy;
}
