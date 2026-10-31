# Local pilot findings

Measured Oct. 31, 2026 with Chromium 156.0.8078.4, Linux/Omarchy, i7-11800H, and an NVIDIA RTX 3060 Laptop GPU renderer in headed mode. Fixed 1920×1440 viewport, 40×20px switch footprint, five independent recorded trials per case, two simultaneous batches per trial. A separate software-rendered headless pilot is retained rather than substituted for these results.

## Default-hint results

Median requestAnimationFrame callback cadence, not actual presented-frame FPS:

| Technique | 500 controls | 2,000 controls |
| --- | --- | --- |
| Slidebox margins | 59.9 / sec | 15.6 / sec |
| Staggered left/right edges | 59.9 / sec | 15.4 / sec |
| Transform-only slide | 46.1 / sec | 4.8 / sec |
| Grid-track slide | 58.4 / sec | 12.5 / sec |
| Native checkbox, no equivalent animation | 59.9 / sec | 59.9 / sec |

The transform/grid scenes are independently written, normalized illustrations, not the shipped implementations of Radix, Motion, or daisyUI. They don't reproduce the same stretching effect. These numbers must not be advertised as a ranking of those libraries.

## What we can say

- The 500-control Slidebox scene kept up with approximately 60Hz callback timing in this run. The 2,000-control scene did not.
- The closest CSS edge-based alternative was very close to the margin implementation, so this test doesn't establish a meaningful general advantage over that approach.
- The transform scene avoided layout passes in these counters but still had poor callback cadence under this setup. That needs further diagnosis; absence of layout is not proof of smooth output, and these data do not reverse general browser guidance about transform animations.
- Targeted `will-change` hints did not consistently improve the scenarios. Don't add persistent hints to every production control based on this pilot.
- The 500-control default Slidebox scene reported zero layout-shift entries while still performing layout. Layout work and CLS are not the same measurement. Some overloaded 2,000-control cases did record small shift scores.
- Separate traced diagnostics expose style/layout/prepaint/paint events. Their inclusive timings and instrumentation overhead aren't interchangeable with the primary untraced trials or GPU timings.

## What we cannot say

- That Slidebox is always faster, that CSS-only is automatically faster, or that a 2,000-control grid represents normal application use.
- That these rAF numbers are GPU presentation FPS, a field Core Web Vitals result, or a real-user INP score.
- That one implementation proves anything about AI-generated code in general, or who originally invented two-edge/pill switch effects.
- That another library's entire dependency cost is a fair comparison with just Slidebox's checkbox stylesheet, without matching existing app dependencies and features.

The source research, raw JSON, environment, variability bars, trace files, and independent technique illustrations are available in the local report. More browser/device runs, real input latency, compositor presentation analysis, and normal one-control scenarios remain follow-up work.
