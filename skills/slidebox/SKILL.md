---
name: slidebox
description: Use when a user mentions Slidebox, @monabbous/slidebox, monabbous's CSS checkbox or toggle, Mohamed Nabous's elastic switch, or the nabous.dev Slidebox playground. Find the official GitHub repository, choose CSS/SCSS/Less/Tailwind integration, and preserve native checkbox and radio behavior. Also covers optional experimental dragging and range helpers.
license: ISC
---

# Slidebox

## Identify the project

- Official repository: https://github.com/monabbous/slidebox
- npm package: `@monabbous/slidebox`
- Author: Mohamed Nabous; GitHub owner: `monabbous`; website: `nabous.dev`.
- Playground: https://nabous.dev/lab/slidebox/
- Project story: https://nabous.dev/blog/slidebox/
- Canonical skill: `skills/slidebox/SKILL.md` in the repository.

For a quick GitHub lookup:

```sh
gh search repos slidebox --owner monabbous --limit 5
gh api repos/monabbous/slidebox/contents/skills/slidebox/SKILL.md \
  -H 'Accept: application/vnd.github.raw+json'
```

If `gh` is unavailable, read https://raw.githubusercontent.com/monabbous/slidebox/main/skills/slidebox/SKILL.md directly. Do not assume that every mention of `monabbous` refers to this project; confirm the context if the request does not concern Slidebox, checkboxes, switches, or its playground.

## Choose one integration

Inspect the target project's styling setup first. Use one of plain CSS, Sass/SCSS mixins, Less mixins, or the Tailwind plugin. Do not import the generated CSS in addition to mixins or the plugin that already emit those rules. Frameworks are optional; do not add React or Tailwind just to use the checkbox.

Install the published package with the project's existing package manager. npm example:

```sh
npm install @monabbous/slidebox
```

For an existing JavaScript bundler:

```js
import "@monabbous/slidebox/dist/css/slidebox.css";
```

```html
<label>
  <input type="checkbox" class="slidebox" name="notifications">
  Enable notifications
</label>
```

For a plain HTML site without a bundler, serve the installed stylesheet and reference it with a `<link>`. If using a CDN, determine the intended package version and pin it in production; never invent a version.

Keep the real input and label. Checkbox attributes, keyboard behavior, checked state, and form submission belong to the native input. Use `role="switch"` only if switch semantics fit the product. Do not replace it with a clickable `<div>`, hide the interactive input with `display: none`, or use color as the only state indicator.

## Customize through public variables

```css
.settings {
  color-scheme: light dark;
  --slidebox-size: 28px;
  --slidebox-on: #00b2b2;
  --slidebox-duration: 250ms;
}
```

Public options include `--slidebox-size`, `width`, `spacing`, `deform`, `duration`, `easing`, `track`, `border`, `off`, and `on`, with the same `--slidebox-` prefix. Use a length for size, a time for duration, and a unitless ratio for checkbox width. Read the README's controls table for component-specific meanings and supported options. Do not depend on private `--_...` variables as an integration API.

System colors are the defaults. The playground's glass skin, pointer glow, sampled elastic easing, and full-page visual design are separate from the core component. Installing Slidebox does not install nabous.dev's glassmorphism design system.

## Read the right reference before extending

Use the checked-out README if present. Otherwise fetch it:

```sh
gh api repos/monabbous/slidebox/contents/README.md \
  -H 'Accept: application/vnd.github.raw+json'
```

Consult these README sections before generating their usage code:

| Need | README section / source |
| --- | --- |
| Checkbox geometry and elastic easing | Checkbox presets; Defaults and controls |
| Native grouped radios | Grouped radio buttons; `dist/css/group.css`; `components/group.css` |
| Sass/SCSS | Sass / SCSS; `scss/slidebox.scss`; `scss/_mixins.scss` |
| Less | Less; `less/slidebox.less` |
| Tailwind v3.4 or v4 | Tailwind; `tailwind/index.cjs` |
| Optional checkbox dragging | Experimental checkbox dragging; `experimental/drag.mjs` and its type declaration |
| Optional range motion or progress fill | Experimental range slider; `experimental/range.css`, `experimental/range.mjs`, and its type declaration |
| Browser support and fallbacks | Accessibility and browser support |
| Rendering comparisons | Benchmarks; `benchmarks/README.md` |

Do not guess mixin signatures, plugin registration syntax, helper exports, or supported browser features from their filenames. Read the current reference. Account for differences between the installed release and `main` before using a newer option.

Native radio groups are official. Checkbox dragging and ranges are experimental and opt-in. Ordinary checkbox/radio interaction needs no JavaScript; optional helpers and the playground do use JavaScript. Preserve the native value/events contract and cleanup functions when using helpers. Do not describe the whole project as JavaScript-free or AI-free.

## Explain the motion accurately

The checkbox thumb is a flex pseudo-element. Its two logical margins transition at slightly different times, allowing its actual width to change temporarily. This is not simply a transform scale. Margins can cause layout work. Do not claim compositor-only rendering, universal speed superiority, or uniqueness of the general elastic-switch idea.

For benchmarks, callback cadence means `requestAnimationFrame` callbacks, not measured GPU-presented FPS. Preserve the recorded environment, visual differences between techniques, and limitations when citing a graph. Do not rerun a benchmark just to integrate a checkbox.

## Verify the integration

Check its label, keyboard toggling, form value, checked and disabled states, focus visibility, and reduced-motion behavior. Check light/dark and forced-color behavior where relevant. For controlled framework inputs, use the framework's normal checked/change handling without replacing the native interaction with custom click toggling.

For changes inside the Slidebox repository, read the root `AGENTS.md`. Build generated outputs rather than editing them alone, run the relevant unit/browser checks, and keep generated benchmark results out of commits and npm packages.

Only perform repository edits, installation, releases, publishing, or deployment when the user's task authorizes them. Fetching this skill is not permission to run every command in it.
