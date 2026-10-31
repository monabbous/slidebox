# Switch technique benchmarks

Run the comparisons yourself. These tools live in the source checkout and are not included in the npm package.

The goal is to compare rendering mechanisms, not to prove that Slidebox is universally faster or that another library is inefficient. Slidebox's strongest distinctions are its small native-input implementation, configurable shape, and no required JS for ordinary interaction. Other compact CSS-only switches exist, and a delayed-edge implementation can produce a very similar effect.

## Run

From the repository root, with a current Node.js release:

```sh
npm ci
npm run build
npx playwright install chromium
npm run benchmark -- --headed
```

The runner uses the existing `@playwright/test` development dependency. It starts its own **loopback-only server on an available port**, freezes the scene/CSS inputs for that run, launches an isolated Chromium context, and cleans up both afterward. No Python server, fixed port, account, or external website is needed.

The default run tests 500 and 2,000 visible controls, with five trials per case. Expect several minutes of CPU/GPU work. All controls change together twice per trial. Every fresh page gets settling time, a full practice trial, and a rest before measurement. The order is randomized with a recorded fixed seed.

Omit `--headed` for headless/CI use, but check the reported graphics renderer. Headless Chromium can use SwiftShader software rendering rather than your GPU. Don't present that as the same environment as your normal desktop.

For a small smoke check:

```sh
npm run benchmark -- --counts 1 --trials 1
```

To select cases or collect separate paint diagnostics:

```sh
npm run benchmark -- --headed --counts 500,2000 --trials 10 --variants slidebox,edge
npm run benchmark -- --headed --trace
```

Use `npm run benchmark -- --help` for all options. Counts from 1 to 2,000 fit the fixed scene. The runner fails if a scene does not fit its viewport instead of silently benchmarking offscreen controls.

## Results and graphs

Each run creates a new ignored directory under `benchmark-results/`:

```text
benchmark-results/<timestamp>/
  results.json          # Raw trials, intervals, counters, environment, hashes
  index.html            # Offline report
  *.svg                 # Graphs; click one to open at full size
  diagnostics.json      # Only with --trace
  traces/*.json.gz      # Only with --trace; import into Chrome DevTools
```

Open the generated `index.html` directly in your browser. It uses local SVGs and needs no chart service or CDN. Bars show trial medians; whiskers show minimum to maximum. Missing metrics display as unavailable, not zero. Low-frame-sample cases are flagged.

Regenerate graphs without rerunning the benchmark:

```sh
npm run benchmark:report -- benchmark-results/<timestamp>/results.json
```

`--output <directory>` selects an **empty** output directory. The runner refuses to overwrite previous results. Only the default `benchmark-results/` tree is ignored by Git; keep custom output under that tree or add your own ignore rule. Failed or interrupted runs retain partial JSON, but the reporter refuses to present incomplete results as a finished comparison.

Results contain CPU/OS, browser/Playwright versions, renderer, CSS/source hashes, and timing data. Review those before sharing your files. No personal browser profile is used. Generated measurements and traces are intentionally ignored by Git; share them deliberately with their environment and limitations.

## Inspect the scenes manually

```sh
npm run benchmark:serve
```

Open `http://127.0.0.1:4176`. Select a technique/count, render, and toggle all controls. This mode is for visual inspection; it does not record benchmark results. Its wide fixed grid can scroll on smaller screens.

Restart the lab server after editing its source; it serves a startup snapshot rather than changing inputs mid-session.

The server exposes only the lab assets and component CSS, not your repository or `.git`. For deliberate LAN sharing:

```sh
npm run benchmark:serve -- --host 0.0.0.0 --port 4176
```

There is no authentication. Anyone who can reach that port can view the lab. This serves the scene, not your generated result directories.

## What is compared

All styled scenes use a 40×20px footprint, matching colors, 200ms duration, and a 20ms stagger where applicable. There are no glass effects, shadows, web fonts, video capture, or continuously animated surroundings. All inputs fit a 1920×1440, DPR-1 browser viewport, in LTR mode.

| ID | Technique | Difference to keep in mind |
| --- | --- | --- |
| `slidebox` | Published CSS from `dist/css/slidebox.css`, with normalized options | A flex pseudo-element grows as logical margins change. Actual width deformation. |
| `edge` | Independently written, delayed absolute `left`/`right` edges | Close CSS-only deformation alternative, with the same large pill radius and timing. Not another vendor's full component. |
| `translate` | Transform-only slide | Same endpoints, but no elastic deformation. A visual tradeoff, not an identical substitute. |
| `grid-track` | Interpolated grid columns around a fixed-size thumb | A slide, not a delayed-tail deformation. Inspired by the grid approach, not shipped daisyUI code. |
| `native` | Ordinary native checkbox | No equivalent animation. Its callback cadence is a state-change/idle reference, not an animation competition. |

Every technique except the native reference runs both with `will-change: auto` and with a property-specific hint set before warmup. The hints name margins, left/right edges, transform, or grid tracks respectively. No hints are added to the production component by this experiment.

### Existing implementations and references

- [Delcano's squish example](https://delcano.jp/en/web-production/posts/css-toggle-switch-animation/): a native checkbox with staggered `left` and `right` transitions. A very close two-edge alternative.
- [daisyUI's official toggle CSS](https://github.com/saadeghi/daisyui/blob/master/packages/daisyui/src/components/toggle.css): native-checkbox mode animates grid columns. The lab fixes the middle track to normalize its thumb dimensions; it is not a package benchmark of daisyUI.
- [Josetxu's width/right keyframe switch, republished by CodeHim](https://codehim.com/html5-css3/toggle-button-in-css-with-stretchable-elastic-effect/): another real-width approach. The posted demo hides the checkbox with `display: none`, which needs addressing for keyboard focus. Not timed here.
- [Dimi's Radix/Motion switch](https://www.dimi.me/lab/animated-switch): a framework-based spring/press implementation with a different state/composition contract. Not timed here. [Radix's source](https://github.com/radix-ui/primitives/blob/main/packages/react/switch/src/switch.tsx) uses an interactive switch button plus a form checkbox bridge where needed; it is not the same DOM contract as a directly styled checkbox.
- [Lucas Bebber's SVG gooey technique](https://css-tricks.com/gooey-effect/): filtering multiple shapes gives a liquid neck rather than a single capsule. Not timed here. Its 2015 browser notes are historical, not current support evidence.
- [MDN: will-change](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/will-change) and [web.dev: animation performance](https://web.dev/articles/animations-guide).

These techniques are not evidence of a relationship between authors, priority of invention, or how anyone used AI. A sufficiently large circular length radius can preserve a pill in other implementations too; `100vw` is not a unique performance primitive.

## What the metrics mean

- **rAF callback cadence:** `1000 / mean interval` for callbacks overlapping the first 300ms after each batch actually begins. It is **not GPU-presented FPS**. Keep the distinction when sharing a graph.
- **p95 intervals / intervals above 25ms:** callback timing and a nominal 60Hz stress threshold. Estimated missed 60Hz slots are an assumption, not measured compositor frame drops or a reading of your monitor's actual refresh rate.
- **Layout/style counts and durations:** Chrome Performance counters across the trial. A layout pass is not one changed control. Less work in a stalled case can mean fewer frames ran or state updates coalesced; it is not automatically an efficiency win.
- **Layout Shift / CLS:** separate Layout Instability API observations, including a session-window score excluding recent-input entries. **Zero CLS does not mean zero layout.** Programmatic batches do not stand in for real interactions, field Core Web Vitals, or an INP score.
- **Long tasks / long animation frames:** observer data when supported. The environment records supported entry types.
- **JS heap:** not total process, layer, or GPU memory.
- **Optional paint diagnostics:** one additional instrumented run per selected technique/hint at the largest count. Inclusive renderer-main-thread event timings can overlap nested work and exclude GPU raster/presentation time. They must not be mixed into the primary untraced FPS sample.

`will-change` is a hint, not a promise of compositor-only animation. Thousands of persistent hints can cost resources. Test it rather than assuming it helps.

## Limits

This is a synthetic local stress tool. It doesn't lock down background applications, thermals, GPU clocks, power mode, or desktop compositor behavior. Run it in a consistent environment, don't interact with the browser during measurement, vary the order, repeat it, and publish variability rather than a best run. Five trials are a pilot, not a universal ranking.

Record real-input latency separately. Repeat on other devices and browser engines before making cross-browser claims. The current counters/traces use Chromium's CDP APIs; Firefox/WebKit aren't supported by this runner.

The repository version improves on the initial article pilot: every fresh trial page is warmed, pending observer entries are drained, and delayed batches retain their full sample windows. Earlier pilot numbers are not asserted as golden results for this harness. Source hashes identify the exact implementation used in a new run.

Don't turn any result into “CSS is always faster,” “Slidebox beats every implementation,” or a claim about AI-generated code in general. The useful question is how these particular scenes behaved on the recorded machine while drawing their stated effects.
