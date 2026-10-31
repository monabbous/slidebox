# Slidebox

An elastic CSS switch built on a native checkbox. No JavaScript, extra elements, or runtime dependencies required.

![Slidebox switch animation](assets/slidebox-demo.webp)

[Try the playground](https://htmlpreview.github.io/?https://github.com/monabbous/slidebox/blob/main/index.html) · [npm](https://www.npmjs.com/package/@monabbous/slidebox)

## Install

```sh
npm install @monabbous/slidebox
```

Choose **one** integration below: CSS, Sass, Less, or Tailwind. You don't need to import the plain CSS when using a mixin or the Tailwind plugin.

## Plain CSS

Import the stylesheet through your bundler:

```js
import "@monabbous/slidebox/dist/css/slidebox.css";
```

Add the class to a checkbox and give it an accessible label:

```html
<label>
  <input class="slidebox" type="checkbox" role="switch" name="notifications">
  Enable notifications
</label>
```

Use normal checkbox attributes: `checked`, `disabled`, `required`, `name`, and `value`. Read or change its state with your framework's normal checkbox binding. `role="switch"` is optional; omit it for checkbox semantics.

### Set defaults and override individual switches

Public custom properties inherit, so you can set site-wide defaults on `:root`, section defaults on a parent, or overrides on a single input:

```css
:root {
  color-scheme: light dark;
  --slidebox-size: 24px;
  --slidebox-on: #7c3aed;
  --slidebox-duration: 250ms;
}

.settings {
  --slidebox-width: 2.4;
}

.slidebox.compact {
  --slidebox-size: 18px;
  --slidebox-spacing: 0.25;
}
```

`color-scheme: light dark` lets the system colors follow the user's theme. Use `light` or `dark` to force a scheme.

## Controls

The same names work as CSS properties (`--slidebox-NAME`), Sass map keys, Less arguments (`@NAME`), and Tailwind plugin options/utilities.

| Control | Default | Meaning |
| --- | --- | --- |
| `size` | `54px` | Switch height; width and thumb geometry scale with it. Use a CSS length. |
| `width` | `2` | Track width divided by height. Use a unitless number greater than 1. |
| `spacing` | `.33` | Space around the thumb as a fraction of the height. Use a number from 0 to less than 1. |
| `deform` | `.1` | Elastic press deformation and motion delay ratio. Use a number from 0 to less than 1; 0 removes the deformation. |
| `duration` | `200ms` | Animation duration, including a time unit. |
| `easing` | `ease-in-out` | Any CSS timing function, including `cubic-bezier()` and `linear()`. |
| `track` | `Field` | Track background color. |
| `border` | `ButtonBorder` | Track border color. |
| `off` | `FieldText` | Unchecked thumb color. |
| `on` | System accent, when supported | Checked thumb color; falls back to `light-dark(#0b75ff, SelectedItem)`. |

Custom colors do not override forced-colors accessibility mode. Reduced-motion users get effectively instant transitions. Logical margins support both LTR and RTL layouts. Keep the browser's focus outline, or provide a visible `:focus-visible` style yourself.

## Sass mixin

Use Dart Sass's module system. Configure shared defaults with `$defaults`, then override any control per mixin call:

```scss
@use "@monabbous/slidebox/scss/mixins" as slidebox with (
  $defaults: (
    size: 24px,
    on: #7c3aed,
    duration: 250ms
  )
);

.toggle {
  @include slidebox.slidebox();
}

.toggle-large {
  @include slidebox.slidebox((size: 36px, width: 2.5));
}
```

```html
<label><input class="toggle" type="checkbox"> Enable notifications</label>
```

Importing the mixin does not emit CSS until you include it. Configure the module once, before any other module loads it. Your Sass bundler must resolve npm imports (with the Sass CLI, add `--load-path=node_modules`).

For the ready-made `.slidebox` class instead of a mixin:

```scss
@use "@monabbous/slidebox/scss/slidebox";
```

## Less mixin

Import the mixin, then use named arguments. Create a wrapper mixin for project defaults:

```less
@import "@monabbous/slidebox/less/slidebox.less";

.app-switch(@size: 24px; @on: #7c3aed; @duration: 250ms) {
  .slidebox(@size: @size; @on: @on; @duration: @duration);
}

.toggle { .app-switch(); }
.toggle-large { .app-switch(@size: 36px); }
.toggle-wide { .slidebox(@size: 24px; @width: 2.5; @spacing: 0.25); }
```

The import emits no CSS on its own. Use semicolons between arguments, especially when passing timing functions containing commas. Your Less bundler must resolve npm imports; with the Less CLI, add `--include-path=node_modules`.

## Tailwind CSS

The plugin is included in the same npm package and supports Tailwind v3.4 and v4. Install Tailwind separately using its normal setup.

### Tailwind v4

Register the plugin in your Tailwind stylesheet. The options block sets project defaults; omit it to keep Slidebox's defaults:

```css
@import "tailwindcss";
@plugin "@monabbous/slidebox/tailwind/index.cjs" {
  size: 24px;
  on: #7c3aed;
  duration: 250ms;
}
```

### Tailwind v3

Register it in `tailwind.config.cjs`:

```js
module.exports = {
  content: ["./src/**/*.{html,js,ts,jsx,tsx,vue,svelte}"],
  plugins: [
    require("@monabbous/slidebox/tailwind/index.cjs")({
      size: "24px",
      on: "#7c3aed",
      duration: "250ms",
    }),
  ],
};
```

### Utilities and overrides

Add `slidebox` for the component, then control it with `slidebox-NAME-[VALUE]` utilities:

```html
<label>
  <input
    type="checkbox"
    class="slidebox slidebox-size-[28px] slidebox-width-[2.5] slidebox-spacing-[0.25] slidebox-deform-[0.15] slidebox-duration-[300ms] slidebox-on-violet-600 dark:slidebox-on-violet-400"
  >
  Enable notifications
</label>
```

- All controls accept arbitrary values: `slidebox-track-[#222]`, `slidebox-easing-[cubic-bezier(0.4,0,0.2,1)]`, etc.
- `track`, `border`, `off`, and `on` expose your Tailwind color palette, such as `slidebox-on-emerald-500`.
- `duration` and `easing` also expose Tailwind's transition theme, such as `slidebox-duration-300` and `slidebox-easing-linear`.
- Variants work normally: `md:slidebox-size-[32px]`, `hover:slidebox-on-emerald-600`, etc.
- Use `slidebox-size-*` rather than `h-*` to resize: thumb geometry uses the switch's font size.
- Keep complete class names in source; dynamically assembled class strings may not be detected by Tailwind.

In v3, add named presets under `theme.extend.slidebox`:

```js
theme: {
  extend: {
    slidebox: {
      size: { compact: "18px", comfortable: "28px" },
      width: { wide: "2.5" },
    },
  },
},
// Now use slidebox-size-compact or slidebox-width-wide.
```

CSS custom properties work with every integration. Avoid setting a control both through plugin/mixin defaults and an inherited variable: a value assigned directly to the switch wins over inheritance. Use a utility or a selector targeting that switch to override it.

## Development

```sh
npm ci
npm run build
npm test
npm pack --dry-run
```

The build extracts component rules from `style.css` and generates CSS, Sass, Less, and Tailwind rules. Tests compile both mixins and the plugin with Tailwind v3 and v4. The lab itself is plain HTML/CSS/JavaScript; serve the repository with `python3 -m http.server 8080` and open `http://localhost:8080`.

Releases use the manual [Publish to npm](.github/workflows/publish-npm.yml) workflow on `main`, with npm trusted publishing through the `production` environment. Choose a version bump for a new release, or enable `publish_existing_version` to retry the current version without a bump or new tag.

The original implementation is preserved in [`legacy/`](legacy/).
