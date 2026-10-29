# Slidebox Lab

An elastic CSS switch with a playground for geometry, colors, and motion.

[Preview the interactive playground online](https://htmlpreview.github.io/?https://github.com/monabbous/slidebox/blob/main/index.html)

![Slidebox Lab demo: default geometry, 200ms ease-in-out](assets/slidebox-demo.webp)

The animation uses the default width (2), thumb spacing (0.33), deformation (0.1), and a 200ms `ease-in-out` transition.

## npm package

The published CSS package keeps the name [`@monabbous/slidebox`](https://www.npmjs.com/package/@monabbous/slidebox).
The package includes the switch stylesheet at `dist/css/slidebox.css` and a Sass-compatible entrypoint at `scss/slidebox.scss`. The playground is not included in npm.

```bash
npm install @monabbous/slidebox
```

Import `@monabbous/slidebox/dist/css/slidebox.css` in a stylesheet or through your bundler, then use `<input class="slidebox" type="checkbox">`. The package is built from the component rules in `style.css` using `npm run build`.

## Manual npm releases

The release workflow is [Publish to npm](.github/workflows/publish-npm.yml). It is triggered **only** through GitHub Actions > Run workflow on `main`, with a `patch`, `minor`, or `major` choice.

The manifest starts at `0.3.0`, so the first `patch` dispatch will release `0.3.1` (once npm credentials are configured). The workflow builds and tests the package, creates a `chore(release): vX.Y.Z` commit and tag, pushes both to `main`, then publishes to npm.

Before the first release:

1. In GitHub Settings > General > Default branch, change `master` to `main`.
2. Add a granular npm publish token as the repository Actions secret `NPM_TOKEN`, scoped to `@monabbous/slidebox`, with permission to publish. Never commit the token.
3. Ensure GitHub Actions has permission to write repository contents.
4. Manually dispatch the release workflow on `main`.

The workflow does not run on pushes or tags. A failed npm publish after the Git tag has been pushed requires fixing the publish failure for that version before choosing a new bump. The old library is preserved in `legacy/`.

## Run locally

Clone this repository, then serve its root directory:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`. The lab uses plain HTML, CSS, and JavaScript, without a build step.

## Playground

- Adjust track width, thumb spacing, press deformation, and transition duration.
- Change easing family and direction (In, Out, or In-Out), including Elastic and Bounce.
- Compare Slidebox against native controls in light and dark schemes.
- Choose browser-default, CSS system, nabous.dev, or custom colors.
- Copy complete CSS, Tailwind v4 `@utility` CSS, or configuration variables.

Chromium currently lacks support for the `AccentColor` CSS color keyword. In browser-default mode, the custom thumb uses a blue approximation in light mode and `SelectedItem` in dark mode, while native controls retain `accent-color: auto`. Browsers that support `AccentColor` use it automatically.

Controls can be adjusted without triggering transition animations. The selected duration is restored after two animation frames.

The easing functions follow [easings.net](https://easings.net/). Elastic and Bounce use sampled CSS `linear()` timing functions.

## Original Slidebox package

The original Sass package, compiled CSS, package manifests, and example are preserved in [`legacy/`](legacy/). See the [legacy README](legacy/README.md) for the previous installation instructions.

[Source](https://github.com/monabbous/slidebox) · [nabous.dev](https://nabous.dev)
