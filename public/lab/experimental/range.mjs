const enhancements = new WeakMap();
const clamp = value => Math.max(0, Math.min(1, value));

/** Native value = leading edge; a delayed visual tail supplies the deformation. */
export function enhanceSlideboxRange(input) {
  if (input?.tagName !== "INPUT" || input.type !== "range") {
    throw new TypeError("enhanceSlideboxRange expects a range input");
  }
  if (enhancements.has(input)) return enhancements.get(input);
  const view = input.ownerDocument.defaultView;
  if (!view?.PointerEvent) throw new Error("Slidebox range motion requires a browser with Pointer Events");
  let motion;
  let previous = progress();

  function progress() {
    const min = Number.parseFloat(input.min) || 0;
    const parsedMax = Number.parseFloat(input.max);
    const max = Number.isFinite(parsedMax) ? parsedMax : 100;
    return max > min ? clamp((input.valueAsNumber - min) / (max - min)) : 0;
  }
  function stop() {
    if (!motion) return;
    const current = motion;
    motion = undefined;
    current.visual.remove();
    if (current.frame !== undefined) view.cancelAnimationFrame(current.frame);
    if (current.attribute === null) input.removeAttribute("data-slidebox-range-dragging");
    else input.setAttribute("data-slidebox-range-dragging", current.attribute);
    if (current.style) input.style.setProperty("--slidebox-range-stretch", current.style, current.priority);
    else input.style.removeProperty("--slidebox-range-stretch");
    if (current.progressStyle) input.style.setProperty("--slidebox-range-progress", current.progressStyle, current.progressPriority);
    else input.style.removeProperty("--slidebox-range-progress");
  }
  function start() {
    if (motion) return motion;
    if (!input.isConnected || !input.parentElement || input.matches(":disabled") || view.matchMedia("(prefers-reduced-motion: reduce)").matches || view.matchMedia("(forced-colors: active)").matches) return;
    const computed = view.getComputedStyle(input);
    const deform = Math.max(0, Math.min(1, Number.parseFloat(computed.getPropertyValue("--_deform")) || 0));
    const time = computed.getPropertyValue("--_duration").trim();
    const duration = (Number.parseFloat(time) || 0) * (time.endsWith("ms") ? 1 : 1000);
    const box = input.getBoundingClientRect();
    if (!deform || !duration || box.height <= 0 || box.width <= box.height) return;
    // Keep the native thumb's layout/hit box constant. Resizing it changes the
    // browser's pointer-to-value mapping mid-drag and makes the head jump.
    const visual = input.ownerDocument.createElement("span");
    visual.setAttribute("data-slidebox-range-visual", "");
    visual.setAttribute("aria-hidden", "true");
    Object.assign(visual.style, {
      position: "absolute", display: "flex", alignItems: "center",
      boxSizing: "border-box", pointerEvents: "none", zIndex: "1",
      border: "1px solid transparent", padding: "0", margin: "0",
      direction: computed.direction, colorScheme: computed.colorScheme,
    });
    const thumb = input.ownerDocument.createElement("span");
    const size = Number.parseFloat(computed.height);
    const spacing = Number.parseFloat(computed.getPropertyValue("--_spacing")) || 0;
    Object.assign(thumb.style, {
      display: "block", flex: "1 1 auto", minWidth: "0", boxSizing: "border-box",
      height: `${size * (1 - spacing)}px`, width: `${size * (1 - spacing)}px`,
      border: `1px solid ${computed.getPropertyValue("--_track").trim()}`,
      borderRadius: computed.getPropertyValue("--slidebox-radius").trim() || "100vw",
      background: computed.getPropertyValue("--_on").trim(), pointerEvents: "none",
    });
    visual.append(thumb);
    input.after(visual);
    motion = {
      deform, duration, tail: previous, target: previous, direction: 0,
      visual, thumb, size, gap: Math.max(0, size * spacing / 2),
      travelSize: size * (1 - spacing) + 2 * Math.max(0, size * spacing / 2),
      holdUntil: view.performance.now(),
      distanceRatio: (box.width - box.height) / box.height,
      attribute: input.getAttribute("data-slidebox-range-dragging"),
      style: input.style.getPropertyValue("--slidebox-range-stretch"),
      priority: input.style.getPropertyPriority("--slidebox-range-stretch"),
      progressStyle: input.style.getPropertyValue("--slidebox-range-progress"),
      progressPriority: input.style.getPropertyPriority("--slidebox-range-progress"),
    };
    input.setAttribute("data-slidebox-range-dragging", "");
    return motion;
  }
  function draw() {
    // Clamp the tail in progress space: it cannot extend beyond either endpoint.
    const lag = Math.max(-motion.deform, Math.min(motion.deform, motion.target - motion.tail));
    input.style.setProperty("--slidebox-range-stretch", String(lag * motion.distanceRatio));
    input.style.setProperty("--slidebox-range-progress", String(motion.target));
    const tail = motion.target - lag;
    const start = Math.min(motion.target, tail);
    const end = 1 - Math.max(motion.target, tail);
    motion.thumb.style.marginInlineStart = `calc((100% - ${motion.travelSize}px) * ${start} + ${motion.gap}px)`;
    motion.thumb.style.marginInlineEnd = `calc((100% - ${motion.travelSize}px) * ${end} + ${motion.gap}px)`;
    positionVisual();
  }
  function positionVisual() {
    if (!motion) return;
    const rect = input.getBoundingClientRect();
    const parent = motion.visual.offsetParent;
    let left = rect.left + view.scrollX;
    let top = rect.top + view.scrollY;
    if (parent && !(parent === input.ownerDocument.body && view.getComputedStyle(parent).position === "static")) {
      const box = parent.getBoundingClientRect();
      left = rect.left - box.left - parent.clientLeft + parent.scrollLeft;
      top = rect.top - box.top - parent.clientTop + parent.scrollTop;
    }
    Object.assign(motion.visual.style, {
      left: `${left}px`, top: `${top}px`, width: `${rect.width}px`, height: `${rect.height}px`,
    });
  }
  function animate(now) {
    if (!motion) return;
    if (!input.isConnected || input.matches(":disabled") || view.matchMedia("(prefers-reduced-motion: reduce)").matches || view.matchMedia("(forced-colors: active)").matches) { stop(); return; }
    const from = Math.max(motion.lastFrame ?? now, motion.holdUntil);
    const elapsed = Math.max(0, now - from);
    motion.lastFrame = now;
    // The leading edge is always positioned by the browser's native value.
    // Only the tail eases toward that destination after the initial delay.
    motion.tail += (motion.target - motion.tail) * (1 - Math.exp(-elapsed / Math.max(16, motion.duration / 3)));
    if (Math.abs(motion.target - motion.tail) < .0001) { stop(); return; }
    draw();
    motion.frame = view.requestAnimationFrame(animate);
  }
  function changed() {
    const next = progress();
    if (next === previous) return;
    const current = start();
    if (current) {
      const direction = Math.sign(next - current.target);
      if (direction && direction !== current.direction) {
        // On reversal, the old leading edge becomes the new trailing edge.
        current.tail = current.target;
        current.direction = direction;
        current.holdUntil = view.performance.now() + current.duration * current.deform;
      }
      current.target = next;
      draw();
      if (current.frame === undefined) current.frame = view.requestAnimationFrame(animate);
    }
    previous = next;
  }
  function baseline() { if (!motion) previous = progress(); }
  function cancel() { stop(); previous = progress(); }
  input.addEventListener("pointerdown", baseline);
  input.addEventListener("keydown", baseline);
  input.addEventListener("input", changed);
  input.addEventListener("pointercancel", cancel);
  view.addEventListener("blur", cancel);
  view.addEventListener("scroll", positionVisual, true);
  view.addEventListener("resize", positionVisual);
  const form = input.form;
  form?.addEventListener("reset", cancel);

  function destroy() {
    cancel();
    input.removeEventListener("pointerdown", baseline);
    input.removeEventListener("keydown", baseline);
    input.removeEventListener("input", changed);
    input.removeEventListener("pointercancel", cancel);
    view.removeEventListener("blur", cancel);
    view.removeEventListener("scroll", positionVisual, true);
    view.removeEventListener("resize", positionVisual);
    form?.removeEventListener("reset", cancel);
    enhancements.delete(input);
  }
  enhancements.set(input, destroy);
  return destroy;
}

const fills = new WeakMap();

/** Optional progress paint; independent of directional motion. */
export function enhanceSlideboxRangeFill(input) {
  if (input?.tagName !== "INPUT" || input.type !== "range") {
    throw new TypeError("enhanceSlideboxRangeFill expects a range input");
  }
  if (fills.has(input)) return fills.get(input);
  const view = input.ownerDocument.defaultView;
  if (!view) throw new Error("Slidebox range fill requires a mounted browser document");
  const attribute = input.getAttribute("data-slidebox-range-fill");
  const value = input.style.getPropertyValue("--slidebox-range-fill");
  const priority = input.style.getPropertyPriority("--slidebox-range-fill");
  let resetFrame;
  function update() {
    const min = Number.parseFloat(input.min) || 0;
    const parsedMax = Number.parseFloat(input.max);
    const max = Number.isFinite(parsedMax) ? parsedMax : 100;
    const progress = max > min ? clamp((input.valueAsNumber - min) / (max - min)) : 0;
    input.style.setProperty("--slidebox-range-fill", String(progress));
  }
  function reset() {
    view.cancelAnimationFrame(resetFrame);
    // Native reset applies defaultValue after dispatching the reset event.
    resetFrame = view.requestAnimationFrame(update);
  }
  input.setAttribute("data-slidebox-range-fill", "");
  input.addEventListener("input", update);
  input.addEventListener("change", update);
  const form = input.form;
  form?.addEventListener("reset", reset);
  update();

  function destroy() {
    view.cancelAnimationFrame(resetFrame);
    input.removeEventListener("input", update);
    input.removeEventListener("change", update);
    form?.removeEventListener("reset", reset);
    if (attribute === null) input.removeAttribute("data-slidebox-range-fill");
    else input.setAttribute("data-slidebox-range-fill", attribute);
    if (value) input.style.setProperty("--slidebox-range-fill", value, priority);
    else input.style.removeProperty("--slidebox-range-fill");
    fills.delete(input);
  }
  fills.set(input, destroy);
  return destroy;
}
