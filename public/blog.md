---
title: "Coming back to my six-year-old CSS checkbox"
published: true
description: "Revisiting the margin trick behind my elastic CSS checkbox, native controls, and what the benchmarks actually show."
cover_image: assets/slidebox-cover.webp
canonical_url: https://nabous.dev/blog/slidebox/
tags: css, webdev, showdev, opensource
---

## TL;DR

Slidebox styles real checkboxes and radio buttons. The checkbox's elastic stretch comes from moving its two margins at slightly different times, so its width changes without scaling the rounded ends. Ordinary checkbox and radio interaction need no JavaScript; dragging and range effects are optional experiments. There’s a [playground](https://nabous.dev/lab/slidebox/), [benchmarks](https://nabous.dev/project-assets/slidebox/benchmarks/), and an [installable coding-agent skill](#install-the-agent-skill). I’m revisiting the project six years after first sharing it.

## Contents

- [Coming back to Slidebox](#coming-back-to-slidebox)
- [The margin trick](#i-still-like-finding-the-small-trick)
- [Playground and customization](#a-playground-gave-me-a-reason-to-keep-messing-with-it)
- [Native radio groups](#the-radio-group-was-a-good-excuse-to-try-it-somewhere-else)
- [Experimental range and dragging](#the-range-is-where-im-still-experimenting)
- [Benchmarks and limitations](#i-wanted-to-measure-it-too)
- [Install the agent skill](#install-the-agent-skill)
- [Install Slidebox and make it your own](#fork-it-and-make-something-i-wouldnt-have-thought-of)

## Coming back to Slidebox

Since I started coding, I've loved reimagining things and hacking my way through HTML, CSS, and JavaScript to see how far I could get.

As CSS became more capable, I got a little obsessed with making small utilities that looked good without needing much code. Especially when I could let the browser handle the interaction and keep most of the work in CSS. I wanted things to feel sleek, and I wanted to understand what was actually making them work.

Slidebox was one of those projects. I [open-sourced it in October 2020](https://github.com/monabbous/slidebox/commit/fb31a38), then left it sitting for a long time. That made me a bit sad, honestly. It was such a pleasing little thing to play with, and I hadn't seen anyone pick it up.

Six years later, I'm playing with it again 😄

![The elastic Material-style checkbox switching on and off](https://nabous.dev/project-assets/slidebox/assets/slidebox-demo.webp)

That oversized, elastic Material-style one is my favorite.

## I still like finding the small trick

The idea behind the deformation came from me working out the effect by hand: move the margins on either side of the thumb at slightly different times.

The track is a flex container, and the thumb fills the room left between its two margins. In the off position, most of that empty space is on one side. Checking the input moves it to the other side.

The useful part is that the margins don't have to move together. One edge starts moving immediately; the other follows after a short delay. For that moment, there's more room between the margins, so the thumb gets wider. Then its trailing edge catches up.

Here's the timing part with the default values, rather than the whole component:

```css
.slidebox::after {
  flex: 1 1 auto;
  min-width: 0;
  border-radius: 100vw;

  transition:
    margin-inline-start 200ms ease-in-out,
    margin-inline-end 200ms ease-in-out;
  transition-delay: 0s, 20ms;
}

.slidebox:checked::after {
  /* The margin targets also swap sides. */
  transition-delay: 20ms, 0s;
}
```

That `100vw` radius is intentional too. I'm giving the browser a radius much larger than the thumb needs; it limits the corners to fit the current box. As the width changes, the ends stay rounded and the middle can grow into a pill shape.

With `scaleX()`, I'd be stretching the already-drawn thumb, including its rounded ends and border. That's the weird squishing I wanted to avoid. The margin trick changes the actual space the thumb occupies, so the browser redraws the shape instead of stretching it.

It's still a real checkbox underneath:

```html
<label>
  <input class="slidebox" type="checkbox" name="notifications">
  Enable notifications
</label>
```

The browser owns the checked state, keyboard behavior, and form value. For ordinary clicks, the motion comes from CSS.

I like the UI libraries that take this approach: use the browser's own behavior where it fits, then style it. It makes me happy to see that idea in other people's work too. That's the direction I wanted to keep here.

For this release, I used an LLM to help scaffold the playground and with supporting work around it. The margin idea and the hand-worked core effect were mine.

I also don't want to hand the interesting part to a model and accept the first implementation because the demo happens to run. I want to poke at it, question the amount of code, and see whether the browser already gives me a smaller way to do the thing. That's a lot of the fun for me.

## A playground gave me a reason to keep messing with it

For this version, I wanted Slidebox to be something people could actually customize, rather than a demo with one good-looking combination of numbers.

You can change the width, thumb spacing, deformation, colors, and motion. Negative spacing lets the thumb stick out beyond the track. A different easing curve can make the same checkbox feel quite different.

| Default | Material-style | Old iOS-style |
| --- | --- | --- |
| ![Default checkbox](https://nabous.dev/project-assets/slidebox/assets/checkbox-default-brand.webp) | ![Material-style checkbox](https://nabous.dev/project-assets/slidebox/assets/checkbox-material-brand.webp) | ![Old iOS-style checkbox](https://nabous.dev/project-assets/slidebox/assets/checkbox-ios-brand.webp) |

These are geometry presets, not exact replicas of those interfaces. The elastic version at the top is another combination of the same controls.

The [playground](https://nabous.dev/lab/slidebox/) puts my blue-and-teal theme beside browser colors. I wanted to see the shape and movement without mistaking the extra styling for the component itself.

If you've read my [glassmorphism post](https://dev.to/nabous/weekend-hobby-playing-with-light-glass-and-css-1h2), you'll recognize the colors and pointer glow. I want to turn that glass effect into a Tailwind npm package after this one. The early building blocks are already in the [nabous.dev GitHub repo](https://github.com/monabbous/nabous.dev/blob/master/src/styles/glassmorphism.css) if you want to try them before the package is ready.

I've also put Slidebox and the glassmorphism effect into my Omarchy setup. Getting to use these experiments in my own setup makes them feel a little less like things that only exist in a demo tab.

## The radio group was a good excuse to try it somewhere else

![Native radio buttons with a stretching selection highlight](https://nabous.dev/project-assets/slidebox/assets/radio-group.webp)

I wanted the active background to stretch toward whichever option I was pressing. Click the active one and nothing should deform. Press an earlier or later choice and it should lean that way, while the labels stay still.

At one point the deformation was pushing the text around as well. Moving that work onto a separate background layer fixed it.

The controls are still native radios with a shared name. The sliding highlight uses CSS anchor positioning where it's supported; other browsers get a highlight on the selected segment. Neither version needs JavaScript for selection.

I like this part of revisiting an old project: finding another place the same idea might be useful, without knowing all the answers before trying it.

## The range is where I'm still experimenting

![An experimental range with optional JavaScript motion and progress fill enabled](https://nabous.dev/project-assets/slidebox/assets/range-drag.webp)

The range works as a native input without JavaScript. The delayed tail and progress fill in this recording are optional JavaScript enhancements, and I'm keeping them marked experimental.

Dragging exposed a problem that clicking between values didn't: changing the native thumb's width while dragging made it shoot ahead. The native hit box now stays fixed, with a separate, non-interactive visual layer doing the deformation. The leading edge reaches its destination and the tail follows after a delay.

The fill is another option. It follows the spacing and stays inside the track. You can turn either effect on without the other.

There's also optional pointer dragging for the checkbox. You don't need it for the normal CSS switch or the radio group.

## I wanted to measure it too

Keeping the code small and leaning on native browser behavior were deliberate choices. Normal checkbox and radio interaction don't need a JavaScript runtime from Slidebox.

I tried some deliberately excessive scenes with 500 and 2,000 switches changing together. In a local headed Chromium run on my i7-11800H / RTX 3060 setup, the default margin version's median was about 59.9 animation-frame callbacks per second at 500 controls, and 15.6 at 2,000. That second scene definitely isn't a smoothness claim.

The [comparison and graphs](https://nabous.dev/project-assets/slidebox/benchmarks/) also include a staggered-edge CSS version, transform and grid slides, and runs with property-specific `will-change` hints. The edge-based version was very close to Slidebox. Other CSS approaches can produce similar stretching, so comparing only against a heavier JavaScript component wouldn't tell the whole story.

I don't have evidence that my approach is universally faster. What I like about it is the small amount of markup and setup, the native checkbox behavior, and being able to change the shape without adding a JavaScript runtime for ordinary interaction. It's a compact way to get the effect I wanted. Other small CSS implementations exist too.

These are local stress-test results, and callback cadence isn't a GPU-presented FPS counter. Margins still cause layout work; `will-change` doesn't make that disappear. I still want more browser/device testing and normal one-control measurements before making broader performance claims.

I'm also putting the benchmark tools in the source repo so people can run their own comparisons, inspect the method, and share results from different machines instead of relying on mine.

## Install the agent skill

I also wrote a [Slidebox skill for coding agents](https://github.com/monabbous/slidebox/blob/main/skills/slidebox/SKILL.md). It gives an agent the package's usage, customization options, and the distinction between the native controls and optional experiments, so it has somewhere specific to look before suggesting code.

With Node.js 22.20 or later, run this from the project where you want to use Slidebox:

```sh
npx skills add monabbous/slidebox --skill slidebox
```

Choose your supported coding agent when the installer asks. This installs the skill for that project; add `-g` if you want it available across projects. It installs instructions for your agent, not the Slidebox package itself. You can [read the skill first](https://raw.githubusercontent.com/monabbous/slidebox/main/skills/slidebox/SKILL.md), or give that URL directly to an agent that can read external instructions.

The [README's agent section](https://github.com/monabbous/slidebox#ai-agent-discovery) also has a quick GitHub CLI lookup and the OpenCode skill location. For example, ask your agent to “use @monabbous/slidebox for this settings checkbox” after installing the skill. Whether it loads automatically depends on the agent.

## Fork it and make something I wouldn't have thought of

Slidebox is on npm:

```sh
npm install @monabbous/slidebox
```

You can use vanilla HTML and CSS, Sass/SCSS or Less mixins, or the Tailwind v3.4/v4 plugin. The [README](https://github.com/monabbous/slidebox#readme) has the setup, demos, and experimental options. The package defaults use system colors; the playground's glass skin isn't forced into your app.

I'd love people to [fork it](https://github.com/monabbous/slidebox), change the motion, break the geometry, or use the idea for a completely different control. You don't have to keep my taste in colors or my favorite easing curve.

What would you try next? Is there another native control that would suit this? If you use it, I'd really like to hear where it ended up and what you changed.

Mostly, I hope it gives someone a reason to get curious and start messing with HTML and CSS again. This little checkbox has given me a reason to do that twice now.
