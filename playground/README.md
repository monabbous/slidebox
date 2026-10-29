# Slidebox Lab

One-page playground for the elastic CSS checkbox switch.

## Run

Open `playground/index.html` in a browser or serve the directory with `npx serve playground`. No build step or dependencies.

## Controls

- Track width, thumb spacing, press deformation and transition duration.
- Linear, Sine, Quad, Cubic, Quart, Quint, Expo, Circ, Back, Elastic and Bounce easing families, with In, Out and In-Out directions.
- Browser default, CSS system colors, nabous.dev colors and a custom palette. Native range, checkbox and radio inputs appear alongside Slidebox.
- CSS, Tailwind CSS v4 `@utility` and variables exports.

Elastic and Bounce use sampled CSS `linear()` curves, preserving their rebound instead of approximating them with one cubic Bézier.

The custom Slidebox uses `AccentColor` when the browser-default palette is selected. Native inputs use `accent-color: auto`. Browser rendering can differ.

Range input changes temporarily set `--_duration: 0s`, apply geometry, and restore the chosen duration after two animation frames.

Easing formulas: [easings.net](https://easings.net/).
