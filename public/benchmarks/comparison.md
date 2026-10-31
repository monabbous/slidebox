# Existing ways to build a stretchy switch

Research checked Oct. 31, 2026. These are source-code comparisons, not claims about which author invented the effect or which implementation is fastest.

## The closest alternatives

| Approach / example | What actually moves | Core interaction | Shape and tradeoff |
| --- | --- | --- | --- |
| Slidebox 1.3.0 | Two logical margins around a flex pseudo-element, with staggered delays | A native checkbox; CSS-only for normal use | Actual thumb width changes. A very large length radius keeps rounded ends. One input draws both track and thumb. Layout work still needs measuring. |
| [Delcano's squish switch](https://delcano.jp/en/web-production/posts/css-toggle-switch-animation/) | Absolute `left` and `right` edges, with different delays | Visually hidden native checkbox plus a track span and pseudo-element; CSS-only | A very close leading-edge/trailing-edge alternative. The posted base uses `50%` corners; a sufficiently large length radius can also preserve a pill here. `left`/`right` are layout-affecting, not automatic compositor-only animations. |
| [Josetxu's stretchable toggle, republished by CodeHim](https://codehim.com/html5-css3/toggle-button-in-css-with-stretchable-elastic-effect/) | Keyframes animate thumb `width` and `right` | Checkbox and label; CSS-only for the demo | Real geometric stretch rather than scaling the thumb. More staged motion and decorative styling. The posted `input { display:none }` loses normal keyboard focus; fix that before treating it as a production accessibility example. Its text has separate scale animations. |
| [daisyUI Toggle](https://daisyui.com/components/toggle/) | Interpolated grid tracks; the middle column holds the thumb | Native `<input type="checkbox" class="toggle">`; CSS-only in that mode | Strong native/minimal-markup comparison. Its ordinary grid transition is a slide, not the same delayed-edge deformation. Source also supports a label/input/icons form. |
| [Dimi's animated switch](https://www.dimi.me/lab/animated-switch) | Motion layout animation, press-state scale/radius changes, and an inner element's margins | Radix + React + Motion, with an interactive button and form bridge | A genuine interactive spring/press alternative, but it supplies a framework state/composition contract too. Comparing its whole stack to a CSS file as though the features were identical would be misleading. |
| [SVG gooey filtering](https://css-tricks.com/gooey-effect/) | Multiple shapes under blur/alpha-threshold filters | Can be driven by a native checkbox and CSS; SVG itself doesn't require JS | Produces a liquid neck/merging blobs, not a single capsule with rounded ends. Extra filter/raster work depends on effect size, browser, and hardware. This is a technique explanation, not a ready-made accessible switch by itself. |

## Primary source observations

- **daisyUI:** the [official toggle CSS](https://github.com/saadeghi/daisyui/blob/master/packages/daisyui/src/components/toggle.css) changes `grid-template-columns` from `0fr 1fr 1fr` to `1fr 1fr 0fr`. Its before pseudo-element occupies the middle column. It is not a React component merely because it is commonly used in Tailwind projects.
- **Delcano:** the “Squish” example keeps width automatic and switches `left`/`right` targets, delaying the trailing edge by 0.1s. This is the nearest CSS-only comparison for the two-edge idea. Its unmeasured prose about rendering being cheap is not a benchmark result.
- **Josetxu / CodeHim:** `go-left`/`go-right` keyframes expand actual width mid-travel. A fixed-length radius already avoids the need to scale the thumb. The page credits Josetxu and links the [original CodePen](https://codepen.io/josetxu/pen/ExJXRBB).
- **Dimi / Radix:** Dimi publishes its complete component code on the linked page. [Radix's source](https://github.com/radix-ui/primitives/blob/main/packages/react/switch/src/switch.tsx) uses a `button` with `role="switch"` and renders a checkbox bridge when needed for form integration. Don't describe the button as a native checkbox, or imply that using it is inherently inaccessible.
- **SVG:** Lucas Bebber's explanation shows `feGaussianBlur`, `feColorMatrix`, and blending/compositing to merge shapes. It dates to 2015; don't reuse its historical browser-support notes as current support data.

The AI authorship or development process of these examples was not established. Their code cannot be used as proof of a claim about LLM output in general.

## What this means for Slidebox's story

The two-edge idea has CSS alternatives. A native checkbox and a large pill radius are also not unique to Slidebox. The defensible story is Mohamed's own route to the margin implementation, its configurable geometry and integrations, and why he likes handing the input state to the browser. Avoid a claim that everybody else needs JavaScript, scales the endcaps, or uses more code for the same result.

`100vw` is one convenient oversized length radius. Another sufficiently large circular length radius can also become a pill. The visual benefit comes from changing real geometry and letting the browser fit the corners, not from that exact unit having special performance properties.

## What the local stress benchmark compares

The lab compares isolated mechanisms, not the entire above libraries or their web pages:

1. Published Slidebox CSS with normalized colors, dimensions, duration, and easing.
2. An independently written delayed `left`/`right` illustration, normalized to the same thumb dimensions and delay.
3. A transform-only slide, with the same endpoints but no deformation.
4. A grid-track slide inspired by the daisyUI mechanism. The lab fixes the middle thumb track to normalize its size; it is not the exact shipped daisyUI stylesheet.
5. An unanimated native checkbox as a reference for state changes and painting, not a visually equivalent animation.

Every scene contains 500 or 2,000 visible inputs. A single batch changes them all together. Separate trials add property-specific `will-change` hints before warmup. Core scenes have no glass, shadows, online fonts, network scripts, or recording overhead.

`will-change` is a hint, not a promise to move margin, inset, or grid animation onto the compositor. Persistent hints on thousands of elements can also cost resources. See [MDN's guidance](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/will-change) and [web.dev's animation guide](https://web.dev/articles/animations-guide).

## How to read the metrics

The primary report uses a headed Chromium run on the NVIDIA renderer; the earlier SwiftShader/headless pilot is preserved separately. Each scene gets 350ms to settle after creation. The first occurrence of each technique/count/hint combination gets one practice trial, followed by a 250ms rest. Five recorded trials per combination run in a fixed-seed randomized order. These are programmatic simultaneous state changes, not thousands of trusted user clicks.

At 2,000 controls some scenes are badly overloaded. Fewer layout passes can mean frames were skipped or state changes coalesced, not that a technique became more efficient. A zero-layout transform scene can still have poor frame cadence for other rendering/compositing reasons; these measurements don't establish the exact bottleneck by themselves.

The desktop's other applications and power/clock state were not locked down. Treat the results as a reproducible local pilot with reported variability, not a laboratory-wide ranking. In particular, the poor transform-scene callback cadence is not evidence that transforms are generally slower than margins.

- The FPS graph is **rAF callback cadence**, not a GPU/presented-frame counter. It measures intervals overlapping the first 300ms after each batch actually begins. A native checkbox has no equivalent animation, so its line is an idle/state-change reference.
- Layout passes and duration come from Chrome's Performance counters. A pass count is not a count of changed inputs.
- Layout Shift entries and CLS use the browser's Layout Instability API, separately from layout work. **Zero CLS does not mean zero layout.** These are synthetic batches, not field Core Web Vitals or a real-user INP score.
- Variability bars show minimum to maximum across independent trials; the bar is the median. Five trials are a local pilot, not broad statistical or cross-device proof.
- JavaScript heap is not total process/GPU/layer memory.
- The environment record states headless/headed mode and the graphics renderer. Software rendering or headless results must not be presented as the exact experience of a hardware-composited Omarchy desktop.
