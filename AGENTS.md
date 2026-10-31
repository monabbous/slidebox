# Slidebox agent entry point

This is `monabbous/slidebox`, published as `@monabbous/slidebox` by Mohamed Nabous.

Read [`skills/slidebox/SKILL.md`](skills/slidebox/SKILL.md) first for integration decisions and the official discovery links. Read [`README.md`](README.md) for exact APIs and examples; the skill is an entry point, not a replacement for the reference.

- Keep native inputs, labels, keyboard/form behavior, accessibility states, and reduced-motion rules.
- Keep the core CSS separate from the playground's glass skin. Experimental dragging/range helpers remain opt-in.
- `style.css` contains the marked checkbox source; `components/` contains other component sources. `scripts/build.mjs` generates the distributable integrations. `scripts/build-public.mjs` refreshes the committed runtime playground/media under `public/`.
- Run `npm run build` and `npm test` after relevant source changes. Use `npm run test:browser` for interaction/layout changes; install the development dependencies and Chromium first if needed.
- Read `benchmarks/README.md` before touching measurements. Preserve raw pilot results and their method; do not treat presentation edits as new measurements. Keep generated `benchmark-results/` out of Git and npm.
- `public/blog.md` and `public/lab/` are fetched at request time by nabous.dev. Website rendering/deployment code lives in the separate `monabbous/nabous.dev` repository.
- Do not commit private editorial notes, browser profiles, credentials, or original personal recordings. Do not release, publish, or deploy unless authorized.
