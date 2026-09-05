# WORKLOG.md

Persistent project history. Append entries; do not edit past entries.

---

## v0.15.0 — M15: sheet input for `@toonstrip/asset-packager`

**Date:** 2026-09-03

### Changes

M15 (added to `TOONSTRIP_DEV_PLAN.md` as a table row + §15 before implementation, then
corrected the same session: grid dimensions are declared per sheet, any rows x columns —
the 3x3 in the original sketch was only an example). The motivation is that M14 can only
*detect* identity drift and anchor error after the fact, while one generation pass
prevents both: a sheet is one character in one style, and its cells share one scale.

New in `packages/asset-packager` (0.1.0 -> 0.2.0, still unpublished):

- `src/grid.ts` — grid maths and raster surgery: `gridFor` (declare either dimension,
  derive the rest, trailing cells unused), alpha/uniformity projection profiles,
  `boundaries` (nominal even division, each internal boundary pulled to the emptiest
  line within a window — a sheet with no visible gutters keeps the nominal split, the
  correct fallback rather than a failure), crop/`padToSquare`/`resizeRaster`,
  `keyBackground` (border-connected flood fill, so a white shirt survives),
  `sceneSignature`/`sameScene` (16x16 difference hash + mean colour; an 8x8 average hash
  alone was too coarse for band-structured backdrops — two different scenes collided at
  distance 0 in the fixture), `flatness` for blank-cell detection.
- `src/register.ts` — silhouette-disagreement alignment, coarse then fine. This is the
  thing per-pose input cannot do: a pose drawn a few pixels off is corrected against the
  NEUTRAL cell rather than deriving its own join. Verified both ways — a unit test
  recovers known shifts exactly, and the fixture's deliberate per-cell jitter (7,-5 /
  -6,4 / 5,6) comes out with every pose's socket within a pixel of NEUTRAL's.
- `src/sheet.ts` — one slicer, two kinds. Character sheets take a `layout` (rows of part
  names, `null` to skip); backdrop sheets take `ids` in reading order plus an optional
  column count. Per cell: label-band crop, `inset` trim (a slice boundary lands in the
  *middle* of a painted gutter stroke, so half of it would otherwise read as art),
  keying, square padding (sideways when the cell is tall, upward-only when wide, so a
  torso stays flush with the bottom and the floating-torso check keeps meaning what it
  says), normalisation to one cell size, then registration.
- `src/template.ts` + `toonstrip-pack template` — the reference sheet to prompt with,
  plus the `source.json` fragment and a prompt skeleton printed to stdout. Guides are
  drawn pale and named as guides in the prompt text; the slicer crops and keys
  regardless.
- Wiring: `expandSheets` in `analyze.ts` slices declared sheets into the same
  `SourcePart`/`SourceBackdrop` values the per-pose path produces, so validation,
  packing, join derivation and `--preview` cannot tell the inputs apart. A per-pose file
  overrides a sheet cell of the same name (the hybrid workflow). Sheet images are
  excluded from pose/backdrop discovery so a sheet is never mistaken for an asset.
  `measure.ts` accepts an in-memory raster; `validate.ts` skips the square/min-input
  errors for sliced cells (the slicer reports cell-size problems instead, against
  `spec.cell`); `pack.ts` applies each part's registration, rescaled the same way its
  raster was — an early cut mixed cell-space and cell-size pixels.
- `fixtures/source-sheets` + `scripts/make-sheet-fixture.mjs`: a sheet pack drawn with
  plain canvas calls that imitates real model output — opaque white ground, painted
  gutter strokes, printed label bands, per-cell jitter — plus two backdrop sheets of
  *different* shapes (2x2 interiors, 3x2 carrying five exteriors with a cell to spare),
  since nothing may assume a square grid. 18 new tests (33 in the package), including
  the CLI-validator gate and a build-and-render check.
- M15 exit criterion verified by hand as well: both backdrop sheet shapes sliced into
  exactly their declared ids, the character sheet built from five cells, `toonstrip pack
  validate` passed, and `toonstrip render` produced a correct three-panel strip with
  full-bleed sliced backdrops. Join preview inspected by eye.
- Docs: `docs/asset-sheets.md` (when to prefer a sheet, template workflow, both
  declaration shapes, every option, errors vs warnings, mixing with files, an honest
  note on the resolution cost of a dense grid), plus pointers from
  `docs/asset-image-spec.md`, README, CONTRIBUTING and the package README. The agent
  skill gains a "Sheets" section with the two-reference prompt pattern and how to read
  cell-named diagnostics.

### Status

Repo 0.15.0. M0-M15 of `TOONSTRIP_DEV_PLAN.md` done. npm packages unchanged (schema
0.1.3, core 0.1.7, element 0.1.8, astro 0.1.11, cli 0.2.1, packs 0.1.1, react/vue/next
0.1.0); `@toonstrip/asset-packager` 0.2.0 built and tested, not yet published. Next: a
site docs page for the packager (per-pose + sheets) and publishing it, then S9 Korean
locale per `SITE_DEV_PLAN.md` §13.

---

## v0.14.0 — M14: `@toonstrip/asset-packager`

**Date:** 2026-09-03

### Changes

New milestone, added to `TOONSTRIP_DEV_PLAN.md` as M14 + §14 before implementation: the
gap between "I have drawings" and "I have a pack". §6 fixed the pack format and M5 proved
a human can hand-author one, but the sprite sheet, the rect table and the face/torso join
were still hand-written per pack (`pack-example/scripts/generate.mjs` was a one-off, not a
tool). With image models now the likely source of new art, that gap was the practical
barrier to dev-plan requirement 5.

- `packages/asset-packager` (`@toonstrip/asset-packager` 0.1.0, bin `toonstrip-pack`):
  `init` scaffolds a source pack, `validate` checks one, `build` emits the §6 output tree
  (`pack.json`, `characters/<id>/{<id>.json,sheet.png}`, `backdrops/<id>.png`, `NOTICE`,
  `README.md`, plus `--npm` for a `pack-example`-shaped loader skeleton). Offline and
  deterministic — no model call and no network anywhere in the package, keeping §0's "no
  AI content generation" boundary intact. Depends on `@toonstrip/core` for the emotion
  tables/types and `@napi-rs/canvas` for pixels (the decoder already in the repo).
- Input format (the authoring side, new): `source.json` plus
  `characters/<id>/<kind>-<EMOTION>[@intensity][-variant].png` and `backdrops/<id>.png`.
  One square transparent PNG per pose; intensity defaults to 1 (0 for NEUTRAL, which is
  what separates it from HAPPY on the wheel); variants are what the renderer's round-robin
  `PoseCycle` cycles through. Unrecognised filenames are skipped with a warning, so
  reference sketches can live in the same directory.
- Join derivation is the one place this can emit a valid-but-wrong pack, so it is layered:
  an `anchors` entry in `source.json` wins, else an opaque `#ff00ff` marker pixel in the
  art (found and erased before packing, so it never reaches the sheet), else the
  convention — face joins at bottom-centre of its drawing, torso at top-centre of its.
  Derived **once per character from its NEUTRAL pose** and reused in canvas space for
  every other pose, which is why the spec asks for the head and body to stay put across
  poses: a raised arm moves a torso's alpha box but must not move its neck.
  `--preview` composites each character's NEUTRAL pair and crosses the derived join, the
  only check that catches a floating or buried head (no validator can).
- Validation splits errors (unbuildable: non-square, undersized, opaque background, blank,
  unknown emotion, intensity out of range, missing NEUTRAL, missing backdrop, out-of-canvas
  anchor) from warnings (builds but likely wrong: fill outside the per-kind window, >35%
  semi-transparent pixels, clipping, a torso floating above the bottom edge, a single face
  pose, non-square/low-res backdrop, skipped filename). A model-generated batch normally
  lands entirely in warnings, which is the list a reviewer actually needs.
- `fixtures/source` (drawn by `scripts/make-fixture.mjs` with plain canvas calls, no model):
  two characters × 4 faces + 3 torsos + 1 backdrop, one using the convention path and one
  the marker path. 15 vitest tests, including the load-bearing one — build the fixture, then
  run `@toonstrip/cli`'s own `validatePack` over the output, the same gate a hand-authored
  pack goes through.
- M14 exit criterion verified end-to-end by hand as well: built the fixture, `toonstrip pack
  validate` passed, and `toonstrip render` produced a correct two-panel strip (both
  characters, correct expressions, a WAVE gesture, balloons) from PNGs that carried no rect
  table of their own. Join preview inspected: heads sit on necks on both anchor paths.
- Docs: `docs/asset-image-spec.md` (the input contract — naming, canvas, placement,
  cross-pose consistency, marking the join, `source.json`, errors vs warnings, how to check
  your work), a pointer at the top of `docs/packs.md` for readers who would rather not
  hand-write a rect table, plus README/CONTRIBUTING entries.
- `skills/toonstrip/SKILL.md`: extended rather than forked into a second skill. New section
  teaches the other direction of the same contract — how to turn a character description
  into per-pose generation prompts that satisfy the spec (a fixed style block repeated
  verbatim across a batch, one pose clause varying), then how to run the packager and read
  its diagnostics, with the explicit instruction to look at `joins.png` before claiming a
  pack works. The skill authors prompts; the package never sees one.

### Status

Repo 0.14.0. M0–M14 of `TOONSTRIP_DEV_PLAN.md` done. npm packages unchanged (schema 0.1.3,
core 0.1.7, element 0.1.8, astro 0.1.11, cli 0.2.1, packs 0.1.1, react/vue/next 0.1.0);
`@toonstrip/asset-packager` 0.1.0 built and tested, not yet published.

Also added, planned but unimplemented: **M15 + §15**, sheet input for the packager — one
generated image holding a grid of assets (a character sheet, or a 3×3 grid of nine whole
backdrops) sliced into many pack assets, `toonstrip-pack template` to emit the reference
sheet the model is prompted with, cell registration against the NEUTRAL cell, and
cross-cell consistency/duplication warnings. The motivation is that a single generation
pass is what actually prevents identity drift across a character's poses, which M14 can
only detect after the fact; the slicer sits in front of M14's pipeline and leaves the
per-pose path unchanged. Next: M15, then a site docs page for the packager + publishing
it, then S9 Korean locale per `SITE_DEV_PLAN.md` §13.

---

## v0.13.0 — M12: `@toonstrip/next`; M13: General SSR Placeholder Support

**Date:** 2026-09-03

### Changes

M12/M13 shared prerequisite (`packages/element`):

- `comic-strip-element.ts` no longer throws when imported with no DOM present. Two
  guards: `class ComicStripElement extends HTMLElement` (evaluated at module load, so it
  threw a bare `ReferenceError` in Node before anything else ran) now extends a fallback
  no-op class when `HTMLElement` is undefined — never instantiated server-side, since SSR
  renders `<comic-strip>` by tag name and never calls `new ComicStripElement()`.
  `registerComicStripElement` now no-ops when `customElements` is undefined instead of
  throwing. Verified by building and importing `dist/index.js` in a Node process with
  `globalThis.window` deleted — import succeeds; only explicit instantiation (which no
  real SSR path does) still throws, as expected.
- M13's placeholder mechanism, in the same file: a `<slot name="placeholder">` in the
  shadow template, styled to show by default and hide once the host carries a `data-live`
  attribute (`.strip` is the inverse — hidden until `data-live`). `#rebuild()` sets
  `data-live` once panel slots are sized and inserted (not once painted — an off-screen
  panel may never paint under the existing IntersectionObserver visibility gating, so
  gating the swap on paint would leave the placeholder up indefinitely for it); `#fail()`
  also sets it, so an error notice isn't hidden behind a stale placeholder. New test in
  `comic-strip-element.test.ts` asserts a slotted placeholder `<img>` is present with no
  `data-live` before `.document` is set, and that `data-live` appears once the live strip
  is built.

M12 (`TOONSTRIP_DEV_PLAN.md` §13.4, dev-plan-designed to depend only on M10):

- `packages/react/src/ComicStrip.tsx`: added an optional `placeholder: { src, width,
  height }` prop, rendered as a light-DOM `<img slot="placeholder">` child of the
  `comic-strip` host (via `createElement`'s children argument) — this lives in `react`,
  not `next`, since `@toonstrip/next` wraps `react` rather than reimplementing anything
  (dev plan §13.4's explicit instruction), and any other SSR-capable React framework can
  reuse it without a `next`-specific dependency.
- `packages/next` (new): `src/index.ts` is a `"use client"` re-export of `react`'s
  `<ComicStrip>` — the RSC-protocol boundary Next requires around anything using
  `useRef`/`useEffect`. Verified the directive survives `tsc`'s emit (present as the
  first line of `dist/index.js`) and that importing `dist/index.js` in a DOM-less Node
  process doesn't throw (relies on the `element` guard above).
- Exit criterion ("no server-side document/window/customElements errors, no
  hydration-mismatch warning") verified against a real `next build` + `next start` of the
  new `examples/next-app` (below) via Playwright: zero console/page errors on either the
  no-JS or hydrated pass.

M13 (`TOONSTRIP_DEV_PLAN.md` §13.4, the "reuse §8's headless-canvas render path" item):

- `packages/cli/src/render.ts`: `RenderResult` gained `cssWidth`/`cssHeight` (the
  pre-`scale` layout dimensions) alongside the existing `width`/`height` (post-`scale`
  PNG pixel dimensions) — needed so a placeholder `<img>`'s size attributes describe its
  CSS box, not its (by default 2x) backing-store pixel count; using the pixel count
  there was the first version of this that shipped, and it doubled the strip's on-screen
  size until caught by the Playwright layout-shift check below.
- `packages/next/src/server.ts` (new entry point `@toonstrip/next/server`, separate from
  the package root so `@napi-rs/canvas` never reaches a client bundle): `renderPlaceholder(doc,
  options)` calls `@toonstrip/cli`'s `renderDocument` and returns `{ src: "data:image/png;base64,…",
  width: cssWidth, height: cssHeight }`. `@toonstrip/cli` is imported via a
  `webpackIgnore`d dynamic `import()` rather than a static one: Next's
  `serverExternalPackages` opt-out doesn't reliably apply when the direct importer is a
  symlinked local workspace package rather than a `node_modules` one (confirmed by
  reading `next/dist/build/handle-externals.js`'s resolution logic and by reproducing the
  webpack failure — `@napi-rs/canvas`'s per-platform binary `require()`s got statically
  bundled and failed to parse as JS — with `serverExternalPackages` set and not fixing
  it), so the import is left untouched for webpack and resolved by Node at request time
  instead. That resolution happens from the *bundled output file's* location, which is
  why the consuming app needs `@toonstrip/cli` as its own direct dependency, not only
  transitively through `@toonstrip/next` (documented in both docs pages below).
- `examples/next-app` (new): App Router example. `app/page.tsx` is an async Server
  Component calling `renderPlaceholder(doc, { width: 640 })` and passing the result into
  `<ComicStrip placeholder={…}>`. `next.config.mjs` sets `serverExternalPackages:
  ["@napi-rs/canvas", "@toonstrip/cli"]`. `scripts/copy-pack-assets.mjs` mirrors the
  other examples' pattern for the client-side pack fetch.
- Exit criterion ("shows the correct strip content in view source / with JS disabled,
  then upgrades to the live canvas once hydrated, with no visible layout shift") verified
  against a `next build && next start` of the example via Playwright: with
  `javaScriptEnabled: false`, the placeholder `<img>` renders at its real size and no
  `<canvas>` exists; with JS enabled, `data-live` and a shadow-DOM `<canvas>` appear,
  the placeholder's computed `display` becomes `none`, and the host element's
  `getBoundingClientRect()` is bit-for-bit identical before and after hydration (all four
  deltas 0) once the `cssWidth`/`cssHeight` fix above landed — before that fix, height
  differed by exactly 2x (the `scale` bug).
- Docs: `docs/next.md` (repo-level) and `site/src/content/docs/next-reference.mdx`
  (site-level, `order: 12` in Integrate — schema-reference/accessibility/faq/agent-skill
  bumped one each). Stale "no SSR guard" notes in `docs/react.md`, `docs/vue.md`, and
  their site equivalents corrected to reflect the `element`-level fix above (Vue/Nuxt
  benefits from it too, though no Nuxt wrapper exists yet). `packages/react/src/index.ts`
  now also exports the `ComicStripPlaceholder` type. `README.md`'s package table,
  dependency line, and docs list updated; `CONTRIBUTING.md`'s file map gained the
  previously-undocumented `packages/vue`/`examples/vue-vite` plus the new `next` entries.
- Full workspace `pnpm -r build` and `pnpm -r test` verified clean (16 packages) after
  every change, including the site build producing `/docs/next-reference/`.

### Status

`@toonstrip/next` built and tested; not yet published to npm (same as `react`/`vue`,
still pending a publish decision — see `HANDOFF.md`). M0–M13 of `TOONSTRIP_DEV_PLAN.md`
done.

---

## v0.12.0 — M11: `@toonstrip/vue`

**Date:** 2026-09-03

### Changes

- `packages/vue`: `<ComicStrip>`, a thin wrapper around `packages/element`'s
  `<comic-strip>` custom element (dev plan §13.3), same pattern as `packages/react`.
  `ComicStrip.ts` is a `defineComponent` whose `setup()` returns a render function
  (`h("comic-strip", { ref })` — a render function rather than an SFC `<template>` for
  this one tag, the same reason `@toonstrip/react` uses `createElement` instead of JSX:
  it sidesteps needing `compilerOptions.isCustomElement` configured just for
  `comic-strip`). An `onMounted` hook sets the initial `document`/`packs`, and a `watch`
  per prop pushes subsequent changes onto the element via the template ref. `class`/
  `style` aren't declared as props — Vue's default single-root attribute inheritance
  forwards them to the rendered root automatically. No rendering logic of its own,
  matching the restraint the dev plan calls out for `packages/astro`/`packages/react`.
  Side-effect `import "@toonstrip/element"` registers the element eagerly at module load,
  same as `packages/react` — an SSR guard is deferred to a future Nuxt wrapper, not built
  yet, following `@toonstrip/next`'s (M12) eventual pattern if demand shows up.
- Tests (`packages/vue/test/ComicStrip.test.ts`, vitest + jsdom + `@vue/test-utils`, no
  vitest.config.ts needed since no JSX/SFC compilation is involved — same as
  `packages/element`'s bare setup): mounts and forwards `document`/`packs`; calls
  `wrapper.setProps()` with a new `document` and asserts the same root DOM node is reused
  (`===`) rather than remounted, with its `.document` updated to the new value. Same
  fixture-document/fetch-stubbing approach as `packages/react`'s suite.
- `examples/vue-vite`: a Vite + Vue app with a toggle button swapping between two
  hand-written `ComicStripDocument`s (`src/strips.ts`), `<script setup lang="ts">` SFC.
  `scripts/copy-pack-assets.mjs` is the same script `examples/react-vite` uses, copying
  `@toonstrip/pack-comic-chat`'s files into `public/packs/comic-chat/` as a
  `predev`/`prebuild` step.
- M11's exit criterion ("embeds a strip and updates it reactively") verified two ways:
  the unit test's DOM-node-identity assertion, and live in a real Chrome tab — tagged the
  mounted `<comic-strip>` with a scratch `__scratch` property via devtools' console,
  clicked the demo's toggle button, confirmed the tag survived (`sameNode: true`) and the
  panel count changed (2 → 1) to match the new document.
- Docs: `docs/vue.md` (repo-level, mirrors `docs/react.md`) and
  `site/src/content/docs/vue-reference.mdx` (site-level, mirrors `react-reference.mdx`,
  `order: 11` in the Integrate section — schema-reference/accessibility/faq/agent-skill
  bumped one each to make room). Cross-linked from `react-reference.mdx`'s callout and
  `plain-html.mdx`'s "From a framework" section. `README.md`'s package table, dependency
  line, and docs list updated.
- Full workspace `pnpm build` and `pnpm test` verified clean after the change, including
  the site build producing the new `/docs/vue-reference/` route.

### Status

Package built and tested; not yet published to npm (same as `@toonstrip/react`, still
pending a publish decision — see `HANDOFF.md`).

---

## v0.11.0 — M10: `@toonstrip/react`

**Date:** 2026-09-03

### Changes

- `packages/react`: `<ComicStrip>`, a thin wrapper around `packages/element`'s
  `<comic-strip>` custom element (dev plan §13.3). `ComicStrip.tsx` mounts the element via
  a ref (`React.createElement("comic-strip", { ref, className, style })` — plain
  `createElement`, not JSX, since `comic-strip` has no `JSX.IntrinsicElements` entry) and
  pushes `document`/`packs` onto it as DOM properties from two `useEffect`s, one per prop.
  No rendering logic of its own, matching the restraint the dev plan already calls out for
  `packages/astro`. Side-effect `import "@toonstrip/element"` registers the element eagerly
  at module load — fine for a client-rendered app; an SSR guard is deferred to
  `@toonstrip/next` (M12), per the dev plan's own sequencing note.
- Tests (`packages/react/test/ComicStrip.test.tsx`, vitest + jsdom + a
  `@vitejs/plugin-react` vitest config for JSX transform): mounts and forwards
  `document`/`packs`; re-renders with a new `document` and asserts the same
  `<comic-strip>` DOM node is reused (`===`) rather than remounted, with its `.document`
  updated to the new value. Both fixture documents use `dark: true` panels with no bodies,
  so the element's cast loader never needs a real pack fetch — `fetch` is still stubbed to
  fail instantly (avoids a real, slow network attempt) and the resulting `console.error`
  from the element's own `#fail()` path is silenced.
- `examples/react-vite`: a Vite + React app (no CRA — deprecated) with a toggle button
  swapping between two hand-written `ComicStripDocument`s (`src/strips.ts`).
  `scripts/copy-pack-assets.mjs` copies `@toonstrip/pack-comic-chat`'s files into
  `public/packs/comic-chat/` as a `predev`/`prebuild` step — the Vite equivalent of what
  `packages/astro`'s integration does at `astro:config:setup`, since Vite has no
  integration-hook system to run this automatically.
- M10's exit criterion ("embeds a strip and updates it on prop change without a full
  remount") verified two ways: the unit test's DOM-node-identity assertion, and live in a
  real Chrome tab — tagged the mounted `<comic-strip>` with a scratch `__marker` property
  via devtools' console, clicked the demo's toggle button, confirmed the tag survived
  (`sameNode: true`) and the panel count changed (2 → 1) to match the new document.
- Docs: `docs/react.md` (mirrors `docs/astro.md`'s shape) and
  `site/src/content/docs/react-reference.mdx` (Integrate section, order 10 — bumped
  schema-reference/accessibility/faq/agent-skill 10→11→12→13→14 to make room), cross-linked
  from `plain-html.mdx`'s "From a framework" section. `README.md`/`CONTRIBUTING.md`
  package tables and the `schema → core → element → astro`/`react` dependency line
  updated. Root `.gitignore` gained `examples/react-vite/public/packs/` (generated,
  same treatment as the Astro examples' `_toonstrip/`).

### Status

M10 done. `packages/react@0.1.0` built and tested but **not published** — npm publish
waits for Daniel's go, same pattern as v0.8.9's unpublished core/element/astro/cli bumps.
Site build verified clean locally (`pnpm --filter toonstrip-site run build`); the new
`/docs/react-reference/` page confirmed in the build output and in generated `llms.txt`.
Next: M11 `@toonstrip/vue`, reusing this session's wrapper + example-app + testing pattern
rather than reinventing it (`HANDOFF.md` Next Actions).

---

## v0.8.9 — Korean text in balloons: Noto Sans KR font stack + font-ready element

**Date:** 2026-09-02

### Changes

- **Root cause.** `packages/core/src/balloon.ts` (and the title font in `render.ts`) set
  `"Comic Sans MS", "Comic Neue", ui-rounded, cursive`. Neither comic face has Hangul, so
  each Hangul glyph fell through to the generic `cursive`, which Windows maps to Gungseo
  (a brush script) and other platforms to their own cursive default. Noto Sans KR was
  never named, and on macOS/Android it is not installed under that name anyway. On top
  of that, `<comic-strip>` painted as soon as the pack images arrived; a canvas draws
  with whatever is loaded at that instant and never repaints, so a page-declared webfont
  could be missed even when present.
- `COMIC_FONT_FAMILY` (core): comic faces first, then `"Noto Sans KR", "Apple SD Gothic
  Neo", "Malgun Gothic", "Noto Sans CJK KR"`, then `ui-rounded, cursive`. Latin glyphs
  still resolve to Comic Sans. `TITLE_FONT` exported alongside `BALLOON_FONT`.
- Element: `ensureFonts()` awaits `document.fonts.load()` for both fonts with the
  document's text (so unicode-range subsets fetch only what is drawn) before the first
  paint; a `loadingdone` listener repaints painted panels. `#relayout` now delegates to
  a shared `#repaint`.
- CLI: `--font <file>` (repeatable) → `GlobalFonts.registerFromPath`.
- Site: Noto Sans KR via the fonts API (`korean` subset, declared not preloaded);
  `strips/korean.json` on the kitchen sink; FAQ entry.
- Verified with system Chrome on Windows: Hangul in Noto Sans KR, Latin in Comic Sans,
  `document.fonts.check('13px "Noto Sans KR"', '한글')` true on the kitchen sink.

### Status

Versions bumped (core 0.1.7, element 0.1.8, astro 0.1.11, cli 0.2.1), **not published**:
the cascade (core → element → astro, then `danielkimdev-astro` bump) and the
`grues-in-comic` port (same two font-stack lines, needs an ADR 0008 divergence note per
`UPSTREAM_SYNC.md`) wait for Daniel's go.

---

## v0.8.8 — M7 S8: launch

**Date:** 2026-09-02

### Changes

- Daniel created the Cloudflare Pages project `toonstrip` via the GitHub integration
  (settings from NOTES.md "M7 S0"; `wrangler.toml` at the repo root supplies the output
  dir) and attached the custom domain. `https://toonstrip.danielkimdev.com` is live.
  Deploy procedure: push to `main` deploys production; any other branch push produces a
  preview URL. No manual step.
- Published `@toonstrip/cli@0.2.0` (`pnpm publish`, 6 tests green first).
- Every `packages/*/README.md` links to the site; cli README no longer says "one command".
- CHANGELOG 0.8.8; 0.8.7's "unpublished" note resolved.

### Status

M7 exit criterion met: subdomain live, presents the project, playground usable without
installing anything. Still open from the plan: Cloudflare Web Analytics toggle in the
dashboard (CSP already allows the beacon), Daniel's copy pass (S6), a link from
`danielkimdev.com`. Deferred by design: per-page OG images, Pagefind, short-link Worker.

---

## v0.8.7 — M7 S7: `toonstrip render` (static PNG fallback)

**Date:** 2026-09-02

### Changes

- `packages/cli/src/render.ts` + `bin.ts`: `toonstrip render <doc.json> --out strip.png
  [--width 1200] [--scale 2] [--pack <dir>]... [--transparent] [--background]`. Loads
  packs from directories (default: the installed `@toonstrip/pack-comic-chat`), rejects
  duplicate ids across packs and unknown ids (no silent fallback), validates the document,
  lays panels out with `layoutStrip` capped at the panel count, freezes figures per panel
  in document order like the element, composites into one PNG via `@napi-rs/canvas`.
  Exported as `renderDocument()`; dev plan §8 delivered.
- `@toonstrip/cli` 0.2.0 (not yet published): new deps `@toonstrip/core`,
  `@toonstrip/schema`, `@napi-rs/canvas`; dev dep on `pack-comic-chat` for tests. 3 new
  tests (column policy + dimensions, unknown id, invalid doc). README section.
- Two `as unknown as` casts bridge `@napi-rs/canvas` types to the DOM `Cast`/`Canvas
  RenderingContext2D` types `@toonstrip/core` declares (vitest passed without them; `tsc`
  did not).
- Docs updated where they said a renderer was "planned" (astro-reference, faq,
  accessibility). CHANGELOG 0.8.6 + 0.8.7.
- Not done from S7's optional list: per-docs-page OG images at build (would put
  `@napi-rs/canvas` in the Pages build); the static `og.png` from S6 stands.

### Status

Root build + test clean (cli 6 tests). Smoke: `render` of a one-panel doc → 800×680 PNG,
correct. Next: S8 launch (needs the Pages project), publish `@toonstrip/cli@0.2.0`.

---

## v0.8.6 — M7 S6: polish (budgets, OG image, CI)

**Date:** 2026-09-02

### Changes

- `scripts/check-budgets.mjs`: per-route gzipped JS totals, walking each built page's
  module scripts, island `component-url`/`renderer-url`, and every static/dynamic import
  reachable from them (so the lazily imported element counts). Budgets from
  `SITE_DEV_PLAN.md` §8. Actuals: `/` 8.8 KB, docs 2.1 KB, `/playground` 134 KB
  (CodeMirror), all well under 60/40/450.
- `scripts/build-og.mjs` (`pnpm og`): renders `public/og.png` (1200×630) through
  `@toonstrip/core` in Node with `@napi-rs/canvas` — the hero strip on paper with the
  wordmark. Committed, regenerated by hand when the hero strip changes. Note: the first
  attempt inherited a comic-style fallback font for UI text; the script now names a
  system UI stack explicitly.
- `ci.yml`: new `site` job — build, budgets, `playwright install chromium`, e2e.
- `site` scripts: `test` (strip validation), `test:budgets`, `test:e2e`, `og`.

### Status

Root `pnpm build` + `pnpm test` clean (all packages + site strip validation); budgets
pass; 6/6 e2e. Remaining S6 item is Daniel's: final copy pass in his own voice
(`SITE_DEV_PLAN.md` §10 S6). Next: S8 launch once the Pages project exists (S7 optional).

---

## v0.8.5 — M7 S5: public changelog

**Date:** 2026-09-02

### Changes

- Root `CHANGELOG.md` (Keep a Changelog form, newest first, a **Packages** line per entry
  because npm versions are not lockstep), backfilled for every WORKLOG version 0.1.0 →
  0.8.5, written for users in 1–4 lines each.
- Site loads it as a one-entry content collection (`glob` loader with `base: "../"`), so
  Astro renders the Markdown; `src/data/changelog.ts` parses versions/dates/packages out
  of the body for the sticky version list and the Atom feed at `/changelog.xml` (24
  entries, well-formed). Heading anchors match Astro's slugger (`085--2026-09-02`).
- `/changelog` page: version nav + "This site runs" badges from `lib/version.ts`.
- `CONTRIBUTING.md` "Releasing": add a CHANGELOG entry before `pnpm publish`.
- `.gitignore`: `site/test-results/`, `site/playwright-report/` (test-results had been
  committed in v0.8.4; untracked now).

### Status

axe clean on `/changelog` both themes. Next: S6 polish.

---

## v0.8.4 — M7 S4: playground

**Date:** 2026-09-02

### Changes

- `/playground` per `SITE_DEV_PLAN.md` §6: one Preact island (`@astrojs/preact`,
  `@preact/signals`) with three views of one document. `lib/playground/state.ts` holds
  the signals, bounded undo/redo (50), all form mutators (panel/body/line add/remove/
  move/duplicate, pack toggle), `applyJson` (parse → `validateDocument` → replace only
  when valid; ajv instance paths mapped to editor lines by `json-position.ts`), presets,
  URL-hash boot (`lib/share.ts`) then `localStorage` autosave then first preset.
- Components: `PanelForm` (backdrop thumbnails, camera segmented control, room title,
  dark, character picker with sprite crops, per-body `EmotionWheel` + numeric fields +
  pose + requested, lines with speaker/balloon/text), `EmotionWheel` (SVG slider,
  pointer drag, arrow keys, `aria-valuetext` "SAD, intensity 0.6"), `JsonEditor`
  (CodeMirror 6, lint gutter, problem list that focuses the line, token-based highlight
  style so both themes pass AA), `Preview` (real `<comic-strip>`, width slider + presets
  with column readout from `layoutStrip`, dark surface, undo/redo, presets menu, share,
  export menu: PNG / JSON / Astro snippet / HTML snippet), `Playground` (tabs + bottom
  sheet below 900 px, Ctrl/Cmd+Z).
- `lib/playground/export.ts`: PNG export re-renders every panel through `@toonstrip/core`
  with the element's own figure-freeze order (`selectFigures` per panel, cycles copied),
  so it does not depend on which canvases the element currently has painted.
- Playwright: `playwright.config.ts` (preview server, `PLAYWRIGHT_CHROMIUM_PATH`),
  `tests/e2e/playground.spec.ts`: preset renders, form→JSON→preview sync, JSON edit →
  form + invalid JSON keeps last strip, share-link round trip, keyboard-only authoring
  of a 2-panel/2-character strip with caption + thought balloon, PNG export > 20 KB.
- `site` `test` script now runs `validate-strips.mjs`; `test:e2e` is separate.

### Status

6/6 e2e pass; axe clean on `/playground` light + dark, desktop + 390 px. Next: S5
changelog, then S6 polish.

---

## v0.8.3 — M7 S3: docs

**Date:** 2026-09-02

### Changes

- Content collection `docs` (`src/content.config.ts`, glob loader over MDX; frontmatter
  `title`/`description`/`order`/`section`), `lib/docs-nav.ts` (sorted + grouped),
  `layouts/Docs.astro` (sidebar | article | ToC; prev/next; "Edit this page"; ToC
  highlight via IntersectionObserver; sidebar is a `<details>` that a media-query script
  opens on wide layouts because a closed `<details>` renders no children even with
  `display: contents`), `pages/docs/[...slug].astro`, `/docs/` index.
- 12 pages per `SITE_DEV_PLAN.md` §5.1: getting-started, writing-a-strip,
  emotions-and-poses, cameras-and-panels, balloons, responsive-layout, asset-packs,
  plain-html, astro-reference, schema-reference, accessibility, faq. Every example is a
  `CodeAndStrip` over a JSON file in `content/strips/` (11 new strips: emotion wheel ×9,
  intensity ×3, poses ×3, cameras ×6, balloons, long text, panel options, pip, mixed
  packs, first strip, two speakers), all passing `validate-strips.mjs`.
- `lib/schema-ref.ts` + `SchemaReference.astro`: field tables generated from
  `packages/schema/src/schema.json` (types/required from the schema; one-line
  descriptions maintained in the site; a new schema field appears with an empty cell).
- `/llms.txt` (index) and `/llms-full.txt` (all docs as Markdown, imports/JSX stripped).
- Shiki themes changed to `github-light-default` / `github-dark-default`: the non-default
  variants' orange (`#e36209`) and comment grey fail AA at code size on the site's
  surfaces. Schema tables wrapped in a focusable scroll region (axe
  `scrollable-region-focusable`). Docs asides labelled (axe `landmark-unique`).
- Docs article widened to 58rem so galleries get two strip columns; prose stays at 68ch.

### Status

18 routes build. axe sweep: zero violations on every route, light desktop and dark
390 px. Next: S4 playground (needs element paint-all/export API, NOTES "M7 S1"), S5
changelog.

---

## v0.8.2 — M7 S2: intro page

**Date:** 2026-09-02

### Changes

- `/` per `SITE_DEV_PLAN.md` §4: hero with the strip inside `WidthSlider` (first
  interaction = watching columns change), 30-second install (pm tabs + config + page
  snippet, with the `quickstart` strip rendered as the result, sticky beside the code),
  "How it works" cards (JSON, sprite thumbnails, canvas tags), six use-case strips full
  width with title/text/"Open in playground" beneath, "Bring your own characters" roster
  (all 15 + `pip`), and the PNG/SVG/toonstrip comparison table.
- Seven hand-written strips in `site/src/content/strips/` (`quickstart`, `tldr`,
  `tutorial`, `release-notes`, `objection`, `transcript`, `cms`); no AI involved.
  `scripts/validate-strips.mjs` validates every strip against `@toonstrip/schema` and
  checks character/backdrop ids exist in the served packs and every speaker is on stage.
- `lib/roster.ts` (build-time read of both packs' manifests) + `Sprite.astro` (CSS crop
  of the neutral face from the sheet: thumbnails without canvases).
- Dark Shiki theme switched to `github-dark-default` (github-dark's comment grey failed
  AA on the site's raised surface). Comparison table's empty corner header got hidden text.

### Status

axe clean: `/` light desktop + dark 390 px; `/kitchen-sink` both. 16 canvases on `/`,
no console errors. Next: S3 docs (parallel-able with S4 playground).

---

## v0.8.1 — M7 S1: site shell components

**Date:** 2026-09-02

### Changes

- `site/src/styles/components.css`: buttons (primary/secondary/ghost/danger/icon/dense),
  chips, badges, cards, stage, section rhythm, grids — DESIGN.md §5 as shared classes.
- Components: `CodeBlock` (Shiki dual theme via `astro:components` `Code`, label, copy
  button with one delegated handler), `PackageManagerTabs` (pnpm/npm/yarn, remembered
  in `localStorage`, arrow-key tabs), `Callout` (note = comic caption box; tip/warning/
  danger conventional), `demo/CodeAndStrip` (one JSON object shown as code *and* rendered
  live, "Open in playground" link via `lib/share.ts`, `collapse` shows first panel with a
  `<details>` toggle, `layout` stacked|side), `demo/WidthSlider` (range + presets +
  "900 px · 2 columns" readout from `layoutStrip`, dashed container outline).
- `lib/share.ts`: isomorphic URL-hash encode/decode (`lz-string`, `#d=…&p=…`,
  16 KB cap); default import because lz-string is CJS (named import broke SSR build).
- `/kitchen-sink` page (Astro skips `_`-prefixed pages, hence no underscore); excluded
  from sitemap and robots, `noindex`.
- `scripts/check-page.mjs`: loads a route from the preview server, scrolls the page,
  reports canvas count, aria-labels, console errors, and axe violations; `--shot`,
  `--at <selector>` (viewport shot), `--dark`, `--width`; honours
  `PLAYWRIGHT_CHROMIUM_PATH`.
- a11y fixes from axe: `--ink-3` light darkened to `#66625A` (caption contrast; DESIGN.md
  updated), callouts are `<div>`s not `<aside role=alert>` (landmark/role violations).
- DESIGN.md §5.4 updated: `CodeAndStrip` default is stacked (strip on top, full width).

### Status

axe: zero violations on `/`, `/kitchen-sink` light desktop and dark 390 px. Strips
render in `CodeAndStrip` and `WidthSlider` (readout matches the element's columns).
Next: S2 intro page.

---

## v0.8.0 — M7 S0: site scaffold (`site/`)

**Date:** 2026-09-02

### Changes

- New workspace package `site/` (`toonstrip-site`, private): Astro 7 static, integration
  wired with both packs, MDX + sitemap, Shiki dual theme, Astro fonts API (Bricolage
  Grotesque / DM Sans / JetBrains Mono per `DESIGN.md` §3), `devToolbar` off (same reason
  as `examples/astro-blog`).
- `DESIGN.md` §2–§4 tokens landed verbatim in `site/src/styles/tokens.css` (light + dark
  via `data-theme`), base styles in `global.css`. Shell components: `ThemeScript`,
  `ThemeToggle`, `Header`, `Footer`, `Base` layout. `lib/version.ts` reads package
  versions from the workspace at build time for the badge/footer.
- Placeholder pages for all four surfaces (`/`, `/docs/`, `/playground/`, `/changelog/`)
  plus 404; the intro page already renders the hand-written hero strip
  (`content/strips/hero.json`) with `client:load`.
- `public/`: `robots.txt`, `_headers` (immutable `/_astro/*`, 1-day `/_toonstrip/*`, CSP
  without `unsafe-eval`), `favicon.svg`.
- Repo root: `wrangler.toml` (`pages_build_output_dir = "site/dist"`), `.node-version`
  = 22, `packageManager` = pnpm 11.1.1 in `package.json`, `site` added to
  `pnpm-workspace.yaml`, `.gitignore` for `site/public/_toonstrip/` and `site/.astro/`.
- `ci.yml`: pnpm version now comes from `packageManager`; Node from `.node-version`.

### Status

`pnpm build` builds packages then site (5 routes). Verified in headless Chromium: hero
strip renders 3 canvases with correct `aria-label`s, zero console errors, light and dark
screenshots. **Pages project not yet connected** — dashboard step for Daniel (NOTES.md
"M7 S0"). Next: S1 (shell components, `CodeAndStrip`, `WidthSlider`, kitchen sink).

---

## v0.7.11 — Scale every layout constant to the actual panel size

**Date:** 2026-09-02

### Changes

- Follow-up to v0.7.10, same session: user asked directly for the residual fix flagged
  there — every balloon-layout constant (font size, line height, chrome/padding,
  `MIN_HOOK_HEIGHT`, corridor floors, margins, tail geometry) was a fixed CSS px value,
  computed once at native `UNIT` size (400×340) and applied unchanged no matter what size
  `renderPanel` actually rendered at. Since a panel is only ever native size or *smaller*
  (`layoutStrip` never stretches one up — see the session's earlier "why two sizes"
  discussion), any real embed narrower than native read its own fixed-size text and chrome
  as relatively *larger* than native did, which is what made v0.7.10's already-tight
  vertical budget degrade further the smaller a real embed got.
- Fixed by computing one scale factor, `uiScale = width / UNIT.width`, once in
  `renderPanel` and threading it through every function that used one of these constants,
  each of which now takes an optional `scale = 1` parameter (default keeps native/`UNIT`
  behavior identical, so nothing that doesn't pass a scale changes):
  - `balloon.ts`: added `balloonFont(scale)` alongside the existing native `BALLOON_FONT`;
    `chromeFor`, `measureBalloon`, `measureAtWidth`, `splitHeight`, `goalWidth`, `drawBalloon`
    all scale their padding/line-height/threshold constants, and the cosmetic tail/wave
    geometry (`roundedSpeech`, `pushWaves`, `bubbleTrail`) scales too for visual consistency
    — `cloud`'s scallop density needed no change, it already derives from the (already-
    scaled) box dimensions rather than a fixed px constant.
  - `balloon-layout.ts`: `canvasMetrics`, `layoutBalloons` and everything it calls
    (`layoutBalloon`, `getCloudEstimate`, `getInterveningBBox`, `queryRouteRgn`,
    `speakerCorridors`, `forceFitBalloon`) now scale `MIN_HOOK_HEIGHT`, `MIN_ROUTE_WIDTH`,
    `WIDTH_FUDGE`, `TOP_BORDER`, and v0.7.10's `MIN_CORRIDOR_WIDTH`.
  - `render.ts`: `drawBalloons` computes `ctx.font` from `balloonFont(scale)` instead of the
    fixed `BALLOON_FONT`, and passes `scale` into `headGeometry`, `balloonRect`,
    `drawLocationTitle`, `stackBalloons`, `speakerCorridor` (v0.7.9's fallback corridor), and
    `clearOfFaces` — all of which now scale their own margin/gap/bulge constants.
- Verified with a sweep script driving the real screenshot dialogue from v0.7.10 through
  `renderPanel` (not just `layoutBalloons` directly, so the whole chain — font, driver,
  fallback — is exercised) at widths from 400 down to 260 (65% of native): **4/4 panels fit
  at every width in that range**, where before this fix the fit rate degraded the smaller
  the panel got (v0.7.10 alone: 4/4 at native down to 3/4 at the real 363×309 embed).
  Rendered and eyeballed 400/363/260px versions of the reported panel — text, chrome, and
  tails all scale down together with no overlap at any size, including the 260px extreme.
- Added two regression tests: `measureBalloon` at `scale = 0.5` comes out at half the
  native height (`balloon.test.ts`), and the real 2-speaker panel from v0.7.10's test still
  fits `layoutBalloons` at `scale = 0.65` (`balloon-layout.test.ts`).

### Verify

- `pnpm build` (whole workspace) / `pnpm test` — 30 tests (2 new), clean.
- Sweep script (temporary, not committed): `renderPanel` at widths 400→260, 4/4 fit
  uniformly across the whole range (previously degraded below native).
- Rendered the reported panel at 400/363/260px and eyeballed each — proportional, no
  overlap even at the extreme.
- Existing `test/output/panel-*.png` fixtures (driver path, generated at `layoutStrip(1200)`
  ≈ 0.983 scale, not exactly native) still render clean — confirms the near-native default
  case is unaffected.

### Status

Published together with v0.7.9/v0.7.10 in one cascade: `@toonstrip/core@0.1.6` →
`@toonstrip/element@0.1.7` → `@toonstrip/astro@0.1.10`, all live on npm. Port to
`grues-in-comic` tracked separately — see its own `HANDOFF.md`/`WORKLOG.md`.

---

## v0.7.10 — Root-cause the fallback rate: pre-allocate speaker corridors in the driver

**Date:** 2026-09-02

### Changes

- Follow-up to v0.7.9, same session: user asked to find *why* real panels kept landing on
  `stackBalloons` (the fallback) instead of `layoutBalloons` (the driver) and fix that,
  not just the fallback's own bugs. Measured it directly: a script drove `layoutBalloons`
  with the screenshot's real 2-speaker dialogue at a sweep of widths. Result at the
  renderer's own native `UNIT` size (400×340, `scale=1.0`) — no real-embed shrink involved
  at all — the driver already refused **2 of 4** real panels. Below native it fell off a
  cliff: **0 of 4** fit at every width from 393 down to 300, including the real 363×309
  production embed.
- Root cause, found by instrumenting `layoutBalloon`'s refusal points: `getCloudEstimate`
  sizes the *first* balloon in draw order against the whole free rect, and its width roll
  is deliberately skewed wide (v0.7.6, to stop a narrow balloon wrapping tall into its own
  speaker's head). With two speakers, that wide first estimate leaves the second balloon no
  room to sit beside it — `getInterveningBBox` can only push it entirely *below* — and two
  stacked balloons blow through `BALLOON_HEADROOM`'s tight 44%-of-panel-height budget far
  more easily than two side-by-side ones. The scale-down to real embed sizes then compounds
  this on top of an already-marginal baseline, rather than being the sole cause: every
  layout constant here (font, line height, chrome, `MIN_HOOK_HEIGHT`) is a fixed CSS px
  value that doesn't shrink with the panel, so any real-embed width below native (routine,
  per `layoutStrip`'s responsive column policy — panels never scale *up*) tips already-thin
  margins straight to refusal.
- Fixed the dominant cause (order-dependent width estimation) with `speakerCorridors`
  (`balloon-layout.ts`): computed once per `layoutBalloons` call, it bounds every
  non-caption speaker's balloon — even the first — to the horizontal room between its own
  head and the midpoint to the nearest other speaker's, before `getCloudEstimate` ever
  rolls a width. This is the driver-side counterpart to v0.7.9's `speakerCorridor` in
  `stackBalloons`, now applied where it has the most leverage: it stops the greedy,
  sequential squeeze from ever needing to fall back to vertical stacking in the common
  two-speaker case, rather than trying to recover after the fact. Threaded the resulting
  `bounds` through `getCloudEstimate` (replacing `freeRect` as the width ceiling and the
  straddle-roll clamp) and through the post-wrap re-centring in `layoutBalloon`. A caption
  or a bodiless speaker gets no corridor and lays out against the full free rect exactly as
  before; a single-speaker panel likewise sees no behavior change (no "other" to bound
  against). The existing squeeze machinery (`getInterveningBBox`/`queryRouteRgn`/
  `adjustRouteRgns`) is untouched and still runs as a safety net.
- Verified with the same sweep script: native `UNIT` size went from 2/4 to **4/4**; the
  real 363×309 embed went from 0/4 to **3/4**. The remaining scale-sensitivity (component 2
  above — fixed-px constants not scaling with panel size) is not addressed by this fix and
  is now the dominant residual cause of any fallback below ~350px wide; left as a follow-up
  (see `HANDOFF.md`) rather than folded in here, since it touches `balloon.ts`/`render.ts`
  constants much more broadly and needs its own verification pass.
- Added a regression test (`balloon-layout.test.ts`): the exact real dialogue that used to
  force vertical stacking, asserted to now fit with both balloons side by side.

### Verify

- `pnpm build` / `pnpm test` — 28 tests (1 new), clean.
- Sweep script (temporary, not committed) over widths 300–400 driving `layoutBalloons`
  directly with the real screenshot dialogue: native 2/4→4/4, real embed 0/4→3/4, graceful
  degradation below that instead of a hard 0% cliff.
- Rendered the previously-refused panel at 363×309 with the real `pack-comic-chat` assets:
  now takes the driver path (`stacked: false`), balloons side by side, no overlap.
- `test/output/panel-1.png` (existing 2-speaker driver-path fixture) unchanged.

### Status

Published together with v0.7.9/v0.7.11 in one cascade: `@toonstrip/core@0.1.6` →
`@toonstrip/element@0.1.7` → `@toonstrip/astro@0.1.10`, all live on npm. Port to
`grues-in-comic` tracked separately — see its own `HANDOFF.md`/`WORKLOG.md`.

---

## v0.7.9 — Fix `stackBalloons` straddle overlapping a neighbour's head/tail

**Date:** 2026-09-02

### Changes

- User reported (screenshot, real deployed strip) panel 1's second balloon still overlapping
  a head — this time not the speaker's own (v0.7.6/v0.7.8's bug), but the *other* on-stage
  character's. Reproduced locally: `dan`+`tiki`, two speakers, at the real 363×309 embed size
  (`packages/core/examples/render-fixture.ts`-style script against `pack-comic-chat`) —
  `layoutBalloons` refuses the panel (same as v0.7.8) and falls back to `stackBalloons`.
- Root cause: in `stackBalloons` (`render.ts`), a straddling *speech* balloon's x is centred
  on its own speaker's head with **no check against any other face box** — `clearOfFaces` was
  only ever called from the *thought*-aside branch. `dan`'s balloon and `tiki`'s balloon don't
  collide with each other (they're vertically separated), but `tiki`'s balloon, measured at the
  full `cap = width - 20` and then centred on `tiki`'s head, was wide enough that its left edge
  landed inside `dan`'s face box — confirmed via a geometry dump: balloon x-span
  `[135.18, 353.0]` vs. `dan`'s face box `[88.15, 159.05]`, overlapping y `[135.96, 149]`. Since
  the tail root already sits inside the overlap, the tail was effectively zero-length into the
  wrong head instead of reaching its own.
- Fixed by adding `speakerCorridor` (`render.ts`): for a straddling speech balloon, bounds its
  horizontal room to the midpoint between its own head and the nearest *other* head on either
  side (floored at `MIN_CORRIDOR_WIDTH = 80`px so two close heads still leave a balloon
  buildable), and measures + clamps the balloon's x *inside* that corridor before it's ever
  drawn — rather than measuring at the full panel width and only then trying to reposition.
  This is the same corridor idea `layoutBalloons` already uses, sized down for this fallback's
  strict-vertical-stack (no need for the driver's order-dependent squeeze, since corridors here
  are static, derived from face positions alone). Confining each straddling balloon to its own
  corridor structurally prevents both reported overlaps at once: it can't cover a neighbour's
  head (bounded by the midpoint), and its tail can't cross a neighbour's tail (tail root stays
  inside the same bounded span). Left the thought-aside and caption branches as they were —
  already defended by `clearOfFaces`, and out of scope for the reported bug.
- Verified against the real screenshot's exact dialogue (all 4 panels, EN) rendered through
  `renderPanel` at 363×309 with the real `pack-comic-chat` `dan`/`tiki` assets, before and
  after: panel 1 (the reported one, `thought`+`speech`) went from a visible overlap to clean;
  panels 2–4 (`speech`+`speech`) had no overlap either way and are unaffected. The existing
  `test/output/panel-*.png` fixture (driver path, `UNIT` 400×340) is pixel-identical — this fix
  only touches the fallback branch.

### Verify

- `pnpm build` / `pnpm test` — 27 tests, clean, no assertions needed updating.
- Geometry dump (temporary script, not committed) of `dan`/`tiki` face boxes and balloon boxes
  before/after, at the real 363×309 size, confirming the overlap numerically and its absence
  after the fix.
- Rendered all 4 real-dialogue panels to PNG and eyeballed each — no head or tail overlap.
- Confirmed the identical bug exists in `grues-in-comic`'s `web/src/comic/render.ts`
  `stackBalloons` (same structure, same missing `clearOfFaces` call on the speech-straddle
  branch) — not yet ported; see `HANDOFF.md` Next Actions.

### Status

Published together with v0.7.10/v0.7.11 in one cascade: `@toonstrip/core@0.1.6` →
`@toonstrip/element@0.1.7` → `@toonstrip/astro@0.1.10`, all live on npm. Port to
`grues-in-comic` tracked separately — see its own `HANDOFF.md`/`WORKLOG.md`.

---

## v0.7.8 — v0.7.6's fix wasn't enough: widen the `stackBalloons` fallback too

**Date:** 2026-09-01

### Changes

- User reported the deployed `danielkimdev-astro` strip still looked "random and mostly narrow"
  after v0.7.6. Verified directly against the real deployed page: its actual embed size is
  363×309 (read off the live canvas), not the 400×340 `UNIT` size used by local dev/test
  fixtures. At that real size, `layoutBalloons` (the driver v0.7.6 fixed) refuses most panels of
  the real 2-speaker strip and falls back to `stackBalloons` — confirmed by instrumenting the
  driver's refusal points and rendering the exact blog content through it. v0.7.6's roll fix
  never reaches this fallback, and — confirmed by toggling the fix on/off against real render
  output — made one previously-fitting panel *worse*: a wider first balloon has a bigger
  horizontal footprint, more likely to block the second balloon and push it further down out of
  the driver's vertical budget.
- Root cause in the fallback itself: `stackBalloons`' `cap` (`render.ts`) dropped to
  `width * 0.66` whenever a panel held more than one balloon, and `balloon.ts`'s `goalWidth`
  (what this fallback's `measureBalloon` actually calls) only pushed halfway to its ceiling
  (`WIDTH_BIAS = 0.5`). Rendered the real blog content at 363×309 with the old constants and
  saw the first panel's balloon visibly overlap its own speaker's head — the actual mechanism
  behind what the user reported.
- Neither narrowing was load-bearing: `stackBalloons` lays balloons out in a strict vertical
  sequence (`y` only grows below), so — unlike the driver's side-by-side corridors — there was
  never a horizontal collision either cap was preventing. Changed `cap` to `width - 20`
  unconditionally (`render.ts`) and `WIDTH_BIAS` to `0.85` (`balloon.ts`). Verified against all 8
  real balloons (EN + KO) from the actual blog post at the actual 363×309 size before and after —
  every panel clean, no overlaps, dan's panel-1 head-overlap specifically fixed.
- Ported the identical fix to `grues-in-comic` (named divergence, its ADR 0008 "2026-09-01b") —
  see its `WORKLOG.md` v0.33.6.
- Publish cascade: core 0.1.5, element 0.1.6, astro 0.1.9.

### Verify

- `pnpm build` / `pnpm test` after each bump — clean.
- Rendered the real blog document (EN + KO, all 4 panels, both `@toonstrip/pack-comic-chat`
  characters) through `renderPanel` at the real 363×309 production size — this was the only way
  the original diagnosis (v0.7.6) turned out to be verifiable as incomplete; a passing unit-test
  suite at `UNIT` size did not catch it.

### Status

v0.7.8 is live on npm.

---

## v0.7.7 — Fix a weaker panelSeed delimiter than grues-in-comic's

**Date:** 2026-09-01

### Changes

- Found while sweeping `toonstrip` against `grues-in-comic`'s comic engine for other
  enhancements to sync (after v0.7.6's balloon-width fix): `panelSeed`
  (`packages/core/src/balloon-layout.ts`) joined `speaker`/`text` with a plain ASCII
  space — `` `${speaker} ${text}` `` — while `grues-in-comic`'s original hashes the same
  fields with NUL/SOH control-byte delimiters. A space is content either field could
  itself contain, so two different panels could collide on the same seed (speaker
  `"a b"` + text `"c"` vs. speaker `"a"` + text `"b c"`); control bytes can't appear in
  either field, so grues-in-comic's join was already unambiguous.
- This was a transcription loss from the M1 port, not a deliberate simplification: NUL
  and SOH bytes are invisible in every normal view (editor, terminal, `git diff`,
  `grep` without `-a`), so the M1 port had no way to see the delimiter wasn't a plain
  space and reproduced what it looked like.
- Fixed with the same collision-proof delimiter, but written as the literal escape
  sequence `\x00`/`\x01` in source (evaluates to the same NUL/SOH characters at
  runtime as grues-in-comic's raw bytes) rather than an embedded raw byte — greppable
  and won't silently read as binary to plain-text tooling the way the raw-byte version
  did.
- Publish cascade: core 0.1.4, element 0.1.5, astro 0.1.8 (same
  `workspace:*`-resolves-at-publish-time reason as v0.7.5/v0.7.6).

### Verify

- `pnpm build` / `pnpm test` after each bump — all clean; no test pins an exact seed or
  hash value, so none needed updating.
- Confirmed via raw byte dump that the fix landed as the 4-character escape sequence
  text, not a raw invisible byte.

### Status

v0.7.7 is live on npm.

---

## v0.7.6 — Fix narrow first-balloon width causing head overlap

**Date:** 2026-09-01

### Changes

- Bug flagged from the `danielkimdev-astro` example strip: in several panels the left
  character's balloon used only about half the panel's available width, wrapping to more
  lines than needed; the taller balloon then squeezed the right character's balloon down
  into their head. A fourth panel's first balloon happened to use the full width and had
  no overlap.
- Root cause in `getCloudEstimate` (`packages/core/src/balloon-layout.ts`): the width
  goal was `minWidth + random() * (maxWidth - minWidth)`, a uniform roll that picked
  "barely wider than the compact area estimate" as often as "use the free rect." The
  PRNG is seeded from panel content (`panelSeed`), so it's not really random per render —
  some speaker/text combinations just hash to a low roll every time.
- Changed the roll to `minWidth + (1 - random() ** 2) * (maxWidth - minWidth)`: skewed
  toward `maxWidth`, so a wide balloon is now the common outcome and a narrow one the
  rare exception, while keeping some visual variety instead of always maxing out.
- Same `workspace:*`-resolves-at-publish-time issue as v0.7.5: bumped and published
  `@toonstrip/core` 0.1.2 → 0.1.3, `@toonstrip/element` 0.1.3 → 0.1.4 (picks up the new
  `core`), `@toonstrip/astro` 0.1.6 → 0.1.7 (picks up the new `element`).

### Verify

- `pnpm build` / `pnpm test` after each bump — all packages clean, `balloon-layout.test.ts`
  unaffected (no test asserts exact widths).
- `npm view @toonstrip/element@0.1.4 dependencies` / `npm view @toonstrip/astro@0.1.7
  dependencies` — both resolve to the newly published upstream versions.

### Status

v0.7.6 is live on npm. `danielkimdev-astro` still needs to bump to `@toonstrip/astro@0.1.7`
and rebuild — tracked in `HANDOFF.md`.

---

## v0.7.5 — Follow-up: `element`/`astro` still pinned to pre-fix `schema`

**Date:** 2026-09-01

### Changes

- v0.7.4 fixed `@toonstrip/schema`'s CSP `unsafe-eval` bug and published `schema@0.1.3`
  / `astro@0.1.5`, but missed that `@toonstrip/element@0.1.2` — the package that actually
  calls `validateDocument()` at runtime (`comic-strip-element.ts`) — was still on the
  npm registry pinned to `@toonstrip/schema@0.1.1`. `workspace:*` gets rewritten to a
  real version at *that package's own* publish time, not retroactively: bumping
  `schema` doesn't change what an already-published `element@0.1.2` resolves to.
  Confirmed by a clean `npm install` in `danielkimdev-astro` re-pinned to `astro@0.1.5`:
  `npm ls` showed `@toonstrip/schema@0.1.1` still in the tree under `element`/`core`,
  alongside the new `0.1.3` under `astro` directly — two copies, the buggy one still
  reachable from the actual call site.
- Bumped and published `@toonstrip/element` 0.1.2 → 0.1.3 (`pnpm publish`; confirmed via
  `npm view` its `@toonstrip/schema` dependency now resolves to `0.1.3`), then
  `@toonstrip/astro` 0.1.5 → 0.1.6 (same reason one level up: astro's published
  `element` dependency was still pinned to `0.1.2`). `@toonstrip/core`'s dependency on
  `schema` is type-only (erased at compile, confirmed no runtime import in its `dist/`
  output) — left unpublished, no behavioral effect.

### Verify

- `pnpm build` / `pnpm test` after each bump — 58 tests, clean build.
- `npm view @toonstrip/astro@0.1.6 dependencies` — `{ element: '0.1.3', schema: '0.1.3'
  }`, confirming the full chain now resolves to the fix with no stale copies.

### Status

v0.7.5 is live on npm — this time with every package in the `<ComicStrip>` call chain
actually resolving to the fixed `schema`. `danielkimdev-astro` re-pinning to
`astro@^0.1.6` tracked in its own `HANDOFF.md`.

---

## v0.7.4 — Fix `@toonstrip/schema` validator needing `unsafe-eval` under CSP

**Date:** 2026-09-01

### Changes

- Bug report from `danielkimdev-astro`: `<comic-strip>` rendered fine in `astro dev` but
  was blank on the deployed production site (danielkimdev.com). Root cause:
  `@toonstrip/schema`'s `validateDocument()` called `ajv.compile()` at runtime, which
  compiles the JSON Schema into a validator function via `new Function(...)` — this
  needs `'unsafe-eval'` in the page's Content-Security-Policy. `astro dev` sends no CSP
  header at all, so it worked there; the deployed site's `_headers` CSP has no
  `unsafe-eval`, so the call threw and hydration died silently, leaving only the SSR
  placeholder box.
- Fixed in `@toonstrip/schema`: the validator is now precompiled at build time via ajv's
  "standalone" code-generation mode (`scripts/generate-validator.mjs`, run as a
  `prebuild`/`pretest` hook) instead of compiled from `schema.json` at runtime. Standalone
  mode alone wasn't quite enough — our schema's `minLength` keywords pull in ajv's
  `ucs2length` runtime helper, which standalone mode emits as a bare CJS `require(...)`
  even with `code.esm: true` (a documented ajv limitation: https://ajv.js.org/standalone.html).
  A raw `require()` has no meaning in this package's `"type": "module"` output — Node's
  native ESM loader has no `require` in scope — so the generator also bundles the
  standalone output through esbuild, which inlines the helper into one dependency-free
  ESM file. `ajv` itself moved from a real runtime dependency to devDependency-only
  usage (still listed in `dependencies` for its `ErrorObject` type, but never imported by
  the shipped code path).
- Removed `@toonstrip/astro`'s now-dead `vite.optimizeDeps.include: ["ajv"]` workaround
  (added in v0.7.2 specifically to force Vite dev to pre-bundle `ajv`'s CJS import) —
  nothing imports `ajv` at runtime anymore, so the config injection was pure dead weight
  (confirmed: leaving it in produced a `Failed to resolve dependency: ajv` Vite build
  warning).
- Bumped and published `@toonstrip/schema` 0.1.2 → 0.1.3 (`npm publish`) and
  `@toonstrip/astro` 0.1.4 → 0.1.5 (`pnpm publish`, `workspace:*` deps rewritten to real
  semver — confirmed via `npm view @toonstrip/astro@0.1.5 dependencies`). `core`/`element`
  unchanged, no bump needed.

### Verify

- `pnpm test` — 58 tests pass across all 7 packages, including `@toonstrip/schema`'s
  existing 4 validator tests (accept/reject cases unchanged, same behavior via the
  precompiled path).
- `pnpm build` — clean, including `examples/astro-blog`; no more `ajv` Vite warning.
- End-to-end production repro: built `danielkimdev-astro` against the fixed packages
  (via `pnpm pack` tarballs, `npm install --no-save` before publishing), served the
  static `dist/` through `wrangler pages dev` (applies the real `_headers` CSP, no
  `unsafe-eval`), and drove it with a headless Playwright script — before the fix, this
  reproduced the exact reported bug (`pageerror`: "Evaluating a string as JavaScript
  violates the following Content Security Policy directive... 'unsafe-eval' is not an
  allowed source"); after the fix, zero CSP/eval errors and all 4 panel canvases painted
  with real non-zero dimensions.

### Notes

- Ajv's own docs recommend exactly this generate-then-bundle pattern for CSP-restricted
  environments; there's no ajv option that skips the runtime helper split entirely.
- This also closes the "no ESM/browser build for unbundled consumers" open issue from
  v0.7.2 — since the shipped validator is a single self-contained ESM file with zero
  imports, it now works identically for bundled and unbundled consumers.

### Status

v0.7.4 is live on npm. Next: re-pin `danielkimdev-astro` to `@toonstrip/schema@0.1.3` /
`@toonstrip/astro@0.1.5` and re-verify the deployed site once redeployed — tracked in
`danielkimdev-astro`'s own `HANDOFF.md`.

---

## v0.1.0 — Repository Initialization

**Date:** 2026-09-01

### Changes

- `git init`, initial commit of `TOONSTRIP_DEV_PLAN.md` and `.gitignore`
- Created private GitHub repo `dkdev24/toonstrip`, pushed `main`
- Added `HANDOFF.md`, `WORKLOG.md`, `AGENTS.md`, `CLAUDE.md` for cross-session agent workflow
- Recorded kickoff decisions from the dev plan: project name **toonstrip**, license
  **MIT**, default asset pack includes original Comic Chat backdrop bitmaps, demo/docs
  site at toonstrip.danielkimdev.com via Astro

### Status

Repo scaffolding complete; no application code ported yet — next session starts M0.

---

## v0.2.0 — M0: Repo Bootstrap (schema, workspace, CI)

**Date:** 2026-09-01

### Changes

- pnpm workspace (`pnpm-workspace.yaml`, root `package.json`, workspaces
  `packages/*`, `examples/*`)
- `LICENSE` (MIT)
- `.github/workflows/ci.yml`: pnpm install + `pnpm test` on push/PR to `main`
- `packages/schema`: v1 `ComicStripDocument` TS types (§3 — `Panel`, `Body`, `Line`,
  `CameraPreset` matching `grues-in-comic`'s `SHOTS`/`CameraPreset` table exactly),
  a matching JSON Schema (draft-07, `additionalProperties: false` throughout), and an
  ajv-based runtime validator (`validateDocument`, `ComicStripValidationError`) —
  structural validation only, does not yet resolve ids against asset packs (§6, M2+)
- 4 vitest tests covering accept/reject paths; `pnpm test`, package build (`tsc`), and
  the compiled `dist/index.js` all verified working under Node

### Notes

- `packages/schema/tsconfig.json` uses `moduleResolution: "bundler"` (not `NodeNext`):
  ajv ships no `exports` map in its `package.json`, which makes its `.d.ts` resolve to a
  non-constructable type under `NodeNext`. Bundler resolution fixes the type-check
  without changing emitted output — relative imports still carry explicit `.js`
  extensions for correct Node ESM runtime behavior.
- npm org claim (`toonstrip` unscoped + `@toonstrip` org) still outstanding — user-side,
  not done this session; the dev plan flagged both as unclaimed as of 2026-09-01 and
  wants them claimed before M6 (npm publish).

### Status

M0 exit criteria met (`pnpm test` runs clean on this checkout). Next: M1, porting the
rendering core from `grues-in-comic` into `packages/core`.

---

## v0.3.0 — M1: Rendering Core (`packages/core`)

**Date:** 2026-09-01

### Changes

- `packages/core` (`@toonstrip/core`), depending on `@toonstrip/schema` and
  `@napi-rs/canvas`. Ported from `grues-in-comic` (`web/src/comic/*.ts`, `art/src/*.ts`),
  adapted to `@toonstrip/schema` types instead of the Zork-coupled `mapper.ts` types:
  - `cast-manifest.ts` — the pack contract (`CastManifest`/`PackedAvatar`/`PackedPart`/
    `SheetRect`/`PackedBackdrop`), ported verbatim as types-only (no decode dependency)
  - `emotion.ts` — emotion wheel constants (`EMOTION_NAMES`, `EMOTION_ANGLES`,
    `emotionAngle`, `isGesture`, `NEMOTIONS`), trimmed to the runtime subset (dropped the
    `.avb` binary-format constants, which are M2's decoder concern)
  - `pose.ts` — nearest-neighbour pose selection (`nearestByAngle`, `nearestGated`,
    `selectComplexPose`, `selectPose`, `selectBody`), ported near-verbatim
  - `figure.ts` — `Cast`/`Figure`/`figureFor`/`drawFigure`/`PoseCycle`; dropped the
    `fetch`-based browser `loadCast`/`loadRoster` loaders (M1 is Node-only per the
    milestone table; a caller builds a `Cast` object directly for now)
  - `balloon.ts` — balloon measurement, greedy wrap, force-fit split, and the
    hand-drawn (wavy-spline) speech/thought/caption drawing, ported verbatim; balloon
    kind now uses the schema's own `"speech"|"thought"|"caption"` instead of the
    original's internal `CBWoodring*` class names
  - `balloon-layout.ts` — the multi-balloon route-region layout driver (deterministic
    PRNG seeded from panel content), ported verbatim
  - `layout.ts` — `layoutStrip`/`columnsFor`/`cellFor`, ported verbatim (already fully
    generic, no Zork coupling)
  - `render.ts` — `renderPanel` and the six-shot camera table (`SHOTS`), ported and
    adapted: `Body.pose` gestures mapped to emotion-wheel sentinel angles via a new
    `emotionOptionsFor` helper (see `NOTES.md`)
  - `web/src/comic/backdrop.ts` was **not** ported — confirmed its only generic content
    was the Zork `ROOM_BACKDROPS` room-graph, already covered by the dev plan's "drop
    this" instruction; nothing else in that file was worth keeping
- `packages/core/test/fixtures/cast.ts`: a synthetic two-character cast (procedurally
  drawn shapes, not real art) exercising the same `figureFor`/`drawFigure`/pose-selection
  code path a real pack will
- 26 vitest tests across 5 files (pose selection, layout, balloon measurement/wrap,
  multi-balloon layout incl. force-fit and determinism, and a fixture-based 3-panel
  render producing real PNGs, plus a dark-panel check)
- `packages/core/examples/render-fixture.ts`: standalone Node script (run via
  `node --experimental-strip-types` against the built `dist`) — the milestone's "only
  caller," no web component yet
- `pnpm build` and `pnpm test` verified clean across the whole workspace (30 tests total)

### Notes

- Several porting decisions (gesture-to-angle mapping, balloon-kind naming, dropping
  `backdrop.ts` entirely, deferring cast-loading) are logged in `NOTES.md` under "M1" for
  review — none are drop-in ports, all are reasoned judgment calls made to keep moving
  without a human in the loop this session.
- M1 intentionally ships with placeholder/fixture art only; M2 supplies the real roster.

### Status

M1 exit criteria met: a fixture 3-panel document renders to PNG via `@napi-rs/canvas`
with real figures, balloons, and a backdrop. Next: M2, the default asset pack.

---

## v0.4.0 — M2: Default Asset Pack (`packages/pack-comic-chat`, `packages/cli`)

**Date:** 2026-09-01

### Changes

- `packages/pack-comic-chat` (`@toonstrip/pack-comic-chat`), zero runtime dependencies:
  - Ported the full 15-character roster (`dan`, `anna`, `bolo`, `denise`, `kevin`,
    `lynnea`, `margaret`, `rebecca`, `tiki`, `sage`, `kwensa`, `hugh`, `maynard`,
    `scotty`, `tongtyed`) directly from `grues-in-comic`'s already-decoded, already-packed
    `web/assets/comic/roster/` — per-character sprite sheets and pose manifests, no
    re-decoding needed
  - Decoded and converted the 3 original Comic Chat client backdrop bitmaps (`field`,
    `pastoral`, `room8bs` — 4bpp RLE4-compressed Windows DIBs, 315x315) to PNG via a new,
    minimal, self-contained decoder (`scripts/convert-backdrops.mjs`, build-tool only,
    not part of the published pack) — fresh conversion work, `grues-in-comic` never
    decoded these itself
  - `pack.json` (name, version, license, characters, backdrops) plus
    `characters/<id>/{sheet.png,<id>.json}` and `backdrops/<id>.png`, matching the dev
    plan's §6 pack layout
  - `src/index.ts`: `loadPackJson()`/`loadCastManifest()`, a thin `node:fs` loader
    assembling a `CastManifest`-shaped object (locally typed in `src/types.ts`,
    structurally compatible with `packages/core`'s types — see `NOTES.md` "M2")
  - `NOTICE`: Microsoft Comic Chat MIT attribution + trademark disclaimer, scoped to the
    character and backdrop art actually ported (no Zork notice — nothing Zork-coupled
    ported here)
  - 5 vitest tests: roster/backdrop declaration completeness, every character has a
    NEUTRAL face, every declared file exists on disk
- Root `NOTICE` and `THIRD_PARTY.md` added, carrying the same Comic Chat attribution
  forward per dev plan §12
- `packages/cli` (`@toonstrip/cli`), zero runtime dependencies: `toonstrip pack validate
  <dir>` — validates `pack.json` shape, that every character's sheet + manifest exist,
  that every character has at least the minimum required NEUTRAL face (modeled on
  `grues-in-comic`'s `art/test/roster.test.ts` gate-2 check), and that every backdrop
  file exists with dimensions matching its `pack.json` declaration (reads the PNG IHDR
  chunk directly, no image library). 3 vitest tests, incl. a deliberately-broken pack
  fixture. Verified against the real pack (`OK: ... is a valid pack`, exit 0) and a bare
  `pack.json`-less directory (fails with a clear error).
- `packages/core`'s M1 fixture render (`test/render.test.ts`) and standalone example
  (`examples/render-fixture.ts`) now use the real pack (`dan`, `tiki`, `pastoral`)
  instead of M1's procedurally-drawn placeholder shapes, via a new
  `test/fixtures/real-cast.ts` loader — per M2's exit criteria wording exactly
- `pnpm build` and `pnpm test` verified clean across the whole workspace (45 tests total,
  up from 30); example script re-run and its output PNGs checked for real, varied pixel
  content (485/327/187 unique colors across the 3 panels, correct 400x340 dimensions)

### Notes

- Judgment calls (duplicated pack-contract types instead of a shared schema-level home,
  zero-dependency pack design, decoder scope, validate's coverage vs. `grues-in-comic`'s
  fuller gate-2 check, deferred `docs/packs.md`, Node-only absolute-path loader) are
  logged in `NOTES.md` under "M2" — none block M3, all are candidates for later cleanup.

### Status

M2 exit criteria met: `pack-comic-chat` validates via `toonstrip pack validate`, and
M1's fixture renders using it — real characters and a real backdrop — instead of ad hoc
test assets. Next: M3, the `<comic-strip>` custom element.

---

## v0.5.0 — M3: Custom Element (`packages/element`)

**Date:** 2026-09-01

### Changes

- `packages/element` (`@toonstrip/element`), zero framework deps, depending on
  `@toonstrip/core` and `@toonstrip/schema`. Ported from `grues-in-comic`'s
  `web/src/comic-view.ts` mechanism, with the turn/session/incremental-append
  machinery deliberately dropped (dev plan §0: no game/session/turn engine — a
  `ComicStripDocument` is handed over whole, not streamed panel by panel):
  - `comic-strip-element.ts` — `<comic-strip>`, a custom element with `.document`
    (property; validated via `@toonstrip/schema` at the boundary) and `.packs`
    (property, array of pack base URLs) plus a `src` attribute convenience. Canvas
    pool (one `<canvas>` per panel), `ResizeObserver`-driven relayout through
    `@toonstrip/core`'s `layoutStrip`/`columnsFor`, `devicePixelRatio`-aware backing
    store, `IntersectionObserver` visibility gating (`root: null` — the viewport, since
    unlike the source app there's no internal scroll pane), Shadow DOM style isolation,
    `role="img"` + `aria-label` per panel. Pose-cycle selection is frozen once per
    panel in document order (not per-append) so a resize repaint reproduces the same
    figures.
  - `describe.ts` — generic `describePanel()` alt-text generator (camera shot + room
    title + each line's speaker/verb/text), replacing the source's role-specific
    (`GUIDE`/`HERO`) labelling with the schema's own generic `speaker` ids.
  - `load-pack.ts` — new work (no direct port): fetches `pack.json` + character
    manifests + sheet/backdrop images from one or more registered pack base URLs,
    assembling the same `Cast` shape `packages/core`'s `renderPanel` consumes either
    way. Enforces §6's "collision = build-time error" rule for real — any id declared
    by more than one registered pack throws.
  - `demo/index.html` — plain-HTML, no-framework demo: a 4-panel document rendered
    with the real `pack-comic-chat` assets, using a browser import map (`@toonstrip/core`,
    `@toonstrip/schema` resolved to their built `dist/index.js`; `ajv` resolved to a CDN
    ESM build as a stopgap — see `NOTES.md` "M3").
- 10 new tests: `describe.test.ts` (pure alt-text logic), `load-pack.test.ts`
  (mocked `fetch`/`Image`, incl. collision and missing-id cases), and
  `comic-strip-element.test.ts` (jsdom + stubbed `ResizeObserver`/`IntersectionObserver`,
  verifying canvas-pool/ARIA wiring and column recompute on a simulated resize).
- `packages/element/scripts/verify-demo.mjs` — a real-browser (Playwright/Chromium)
  verification script, run manually against the demo page served over
  `python3 -m http.server`: confirmed live column count follows `layoutStrip`'s exact
  3/2/1 policy at three viewport widths, real non-blank canvas output with correct
  ARIA labels, and **0 axe-core violations** with 0 console errors. Caught and fixed a
  real bug along the way: `#measure()` originally used the host element's raw
  `clientWidth` (which includes the host's own CSS padding) as available width,
  over-estimating layout space — fixed to subtract computed padding, matching
  `comic-view.ts`'s own `measure()`.
- `pnpm build`/`pnpm test` verified clean across the whole workspace (65 tests total,
  up from 45).

### Notes

- `verify-demo.mjs` is manual-only (not part of `pnpm test`/CI — no browser-install step
  in `ci.yml` yet); a real Chromium download was needed this session (~270 MB) and isn't
  assumed available in CI.
- Several design decisions are logged in `NOTES.md` under "M3": the ajv/browser-build
  gap (real, not cosmetic — affects any no-bundler consumer of `<comic-strip>`), the
  `.document`/`.packs` property API shape, dropping the internal-scroll model, and the
  scope of what "port the mechanism, strip the app chrome" ended up cutting.

### Status

M3 exit criteria met, verified in a real browser: resizing changes column count live
to match `layoutStrip`'s policy, and the demo page passes an axe-core a11y check with
zero violations. Next: M4, `packages/astro` + `examples/astro-blog`.

---

## v0.6.0 — M4: Astro Integration (`packages/astro` + `examples/astro-blog`)

**Date:** 2026-09-01

### Changes

- `packages/astro` (`@toonstrip/astro`): a hand-written Astro renderer (not
  `@astrojs/lit` — it requires real `LitElement` subclasses, which `packages/element`'s
  zero-framework-deps `HTMLElement` subclass isn't; see `NOTES.md` "M4") wrapping
  `packages/element`'s `<comic-strip>`:
  - `src/tag-name.ts` — the SSR-safe `ComicStrip = "comic-strip"` constant, kept isolated
    from anything that touches browser globals
  - `src/renderer/server.ts` — `check()`/`renderToStaticMarkup()`: matches the tag
    constant, emits an inert placeholder (`<comic-strip></comic-strip>`); real rendering
    only ever happens client-side
  - `src/renderer/client.ts` — the directive-gated hydrate function: dynamically
    `import()`s `@toonstrip/element` (registering the custom element) only when the
    client directive's condition fires, then sets `.document`/`.packs`
  - `src/integration.ts` — `toonstrip({ packs: [...] })`: registers the renderer, and
    copies each named `@toonstrip/pack-*` package's `pack.json`+`characters/`+
    `backdrops/` into the site's `public/_toonstrip/<pack name>/` at
    `astro:config:setup` time, resolving the pack-name-vs-URL question left open in
    M3's notes (§7's `packs={['comic-chat']}` is a name; `packages/element`'s `.packs`
    API is untouched, still base URLs — `client.ts` maps name → `/_toonstrip/<name>/`
    by convention)
- `examples/astro-blog`: a real, runnable Astro site — `astro.config.mjs` wires
  `toonstrip({ packs: ['@toonstrip/pack-comic-chat'] })`; one blog post
  (`src/pages/blog/comic-strips-in-astro.astro`) embeds a hand-written 3-panel
  `ComicStripDocument` (`src/content/tldr-strip.json`, validated against
  `@toonstrip/schema`, no AI involved per §0's non-goal) via
  `<ComicStrip document={doc} packs={['comic-chat']} client:visible />`, placed well
  below the fold specifically so the defer behavior is observable
- `examples/astro-blog/scripts/verify-client-visible.mjs`: real headless-Chromium
  verification (Playwright) against both a live `astro dev` server and the production
  `astro build` output — confirms zero `@toonstrip/element` network activity and zero
  rendered canvases before the strip scrolls into view, and exactly 3 real canvases
  (matching the document's 3 panels) after
- 2 new unit tests (`packages/astro/test/server.test.ts`, the renderer's pure
  `check`/`renderToStaticMarkup` functions); 50 tests passing workspace-wide

### Notes

- Two real bugs were found only by running a browser, not by build/typecheck: an SSR
  crash from mixing the tag-name constant with the class-defining module, and a
  Vite-externalization crash from `packages/astro`'s single entry re-exporting both the
  browser-safe component constant and the Node-only integration. See `NOTES.md` "M4"
  for both and their fixes (module splitting; dynamic `node:*` imports inside the hook
  body instead of static top-level imports).
- `addRenderer`'s `serverEntrypoint`/`clientEntrypoint` must be bare package specifiers
  (`@toonstrip/astro/dist/renderer/*.js`), not `new URL(...).href` — the latter works in
  `astro dev` but breaks `astro build`'s static-output "built path" resolution.
- `devToolbar: { enabled: false }` was required in `examples/astro-blog`'s config for
  headless verification to work at all in this session's sandboxed environment (the
  toolbar's own entrypoint request never resolves here) — flagged in `NOTES.md` "M4" as
  worth revisiting for real, non-sandboxed use before M6.
- `examples/astro-blog/public/_toonstrip/` (the integration's copied pack assets) is
  gitignored — regenerated by `astro dev`/`astro build` every run, not source.

### Status

M4 exit criteria met, verified for real (not simulated) in headless Chromium against
both a live Astro dev server and a production build: the blog post renders the embedded
strip with real assets, and `client:visible` genuinely defers `@toonstrip/element`'s
load and render until the strip scrolls into view. Next: M5, docs + a second example
pack.

---

## v0.7.0 — M5: Docs, Contribution Guide, Second Example Pack

**Date:** 2026-09-01

### Changes

- `docs/schema.md` — the `ComicStripDocument` v1 shape, an emotion-wheel cheat sheet for
  hand-authoring, `validateDocument` usage, and what a validation error looks like
- `docs/packs.md` — the full asset pack contract: directory layout, `pack.json` shape,
  the `PackedAvatar`/`PackedPart` manifest shape, the minimum-pose requirement, backdrop
  shape, licensing/attribution convention, `toonstrip pack validate`, how a pack is
  loaded at runtime in Node vs. the browser vs. Astro (pack names vs. URLs vs. npm
  specifiers, reconciled across M2–M4's actual implementations), and a step-by-step
  "add a new character" walkthrough
- `docs/astro.md` — `@toonstrip/astro`'s actual API (the `toonstrip({ packs })`
  integration, `<ComicStrip>`'s `document`/`packs` props, why `client:visible` really
  defers loading), using `examples/astro-blog` as the worked example
- Root `README.md` and `CONTRIBUTING.md` (neither existed before) — package overview,
  dependency direction, workspace setup, and a pointer to the packs walkthrough for
  anyone adding a character or a new pack
- `packages/pack-example` (`@toonstrip/pack-example`) — a second, small, wholly original
  asset pack: one character ("Pip", simple procedurally-drawn shapes generated by
  `scripts/generate.mjs`, no AI image generation) with a NEUTRAL+HAPPY face pair and
  NEUTRAL/WAVE/SHRUG torsos, plus one original backdrop ("meadow"). Proves the pack
  contract isn't secretly coupled to `pack-comic-chat`'s decoded-Comic-Chat origin.
  `packages/core/test/pack-example.test.ts` renders a real panel from it through the
  same `renderPanel` path the default pack uses.
- `pnpm build`/`pnpm test` verified clean across the whole workspace (56 tests total,
  up from 50)

### Notes

- `docs/packs.md`'s "add a character" walkthrough was self-tested while being written —
  `pack-example` was built by literally following the steps, including running
  `toonstrip pack validate` and a real render, before the doc was finalized. This
  surfaced one real gap (logged in `NOTES.md` "M5"): `pack validate` only checks for a
  required NEUTRAL face, not for a torso, so a pack with faces and no torsos passes
  validation and then silently renders nothing.
- The second-pack proof is a unit test, not a second full example site — the milestone
  directive allowed "even if only via a test," and a second Astro page didn't seem worth
  the added scope yet.
- Judgment calls and open items are in `NOTES.md` "M5"; `HANDOFF.md`'s Open Issues has
  the short list most worth a maintainer's attention before M6.

### Status

M5 exit criteria met: the docs' own "add a character" walkthrough was followed for real
to build and validate `packages/pack-example`, and it renders. M0–M5 are now all
complete; only M6 (npm publish, gated on claiming the npm org) remains.

---

## v0.7.1 — M6 (partial): npm Publish

**Date:** 2026-09-01

### Changes

- User claimed the `toonstrip` package name and `@toonstrip` org on npm; registration
  itself done from the npm CLI this session (`npm login`-based auth, not the website).
- Added `publishConfig.access: public` to all 7 `@toonstrip/*` package.json files —
  required for a scoped package's first publish (npm defaults scoped packages to
  private otherwise).
- Fixed a Windows-only bug in `packages/cli/test/pack-validate.test.ts`: it built its
  fixture path via `new URL(...).pathname`, which yields `/C:/Users/...` on win32 and
  breaks `path.join`; switched to `fileURLToPath`. Test-only, no effect on published
  code. All 56 tests pass.
- `pnpm build` across the whole workspace, then published in dependency order:
  `@toonstrip/schema` → `core` → `element` → `pack-comic-chat`/`pack-example` → `cli` →
  `astro`, all at `0.1.0`.
- npm publish required 2FA; the account's existing `~/.npmrc` token was a granular
  access token without "bypass 2FA" enabled, which `--otp` can't satisfy (OTP flags only
  work with classic login sessions). User generated a new granular token with bypass-2FA
  enabled via npmjs.com, which unblocked publishing.
- Recorded the `pnpm approve-builds esbuild` decision in `pnpm-workspace.yaml`
  (`allowBuilds: { esbuild: true }`) so future `pnpm install` doesn't prompt.

### Notes

- M6's full exit criteria also requires deploying `examples/astro-blog` to
  **toonstrip.danielkimdev.com** — not done this session, still open.
- A future publish for any package needs a token with bypass-2FA (or interactive
  `npm login` + `--otp`) — plain granular tokens will 403.

### Status

npm packages are live and installable (`npm install @toonstrip/core` etc. work from a
clean machine). User confirmed `examples/astro-blog` renders correctly locally but is a
bare integration test, not a presentable site — the toonstrip.danielkimdev.com deploy
criterion was split out into a new **M7** milestone (a properly designed intro site with
a live playground) rather than tacked onto M6. `TOONSTRIP_DEV_PLAN.md` §7/§10 updated:
M6 now closes on npm publish alone; M7 covers the site design, playground, and deploy.
M6 is now fully closed.

---

## v0.7.2 — Fix `<ComicStrip>` never hydrating under `client:visible` in Astro

**Date:** 2026-09-01

### Changes

Both bugs surfaced from the consuming side, not from this repo: Daniel embedded a live
`<ComicStrip>` demo in a `danielkimdev-astro` blog post (published `@toonstrip/astro`
0.1.3 / `@toonstrip/schema` 0.1.1) and it silently rendered nothing in `npm run dev`.
Diagnosed and fixed here, in the site's session, working across both repos.

- **`packages/astro/src/renderer/server.ts`**: the SSR placeholder was a bare
  `<comic-strip></comic-strip>` — zero size until `@toonstrip/element` upgrades it.
  Chromium never reports a zero-area `IntersectionObserver` target as intersecting, so
  `client:visible` (which hydrates on exactly that signal) could never fire, on any page
  using that directive, no matter how long a reader scrolled. Fixed by giving the
  placeholder an inline `style="display:block;min-height:340px"` (a one-row guess at
  final size — the element re-measures and repaints for real once it upgrades).
  `test/server.test.ts` updated to assert a non-zero `min-height` instead of the old
  empty tag.
- **`packages/astro/src/integration.ts`**: this is the M3 ajv/browser gap flagged in
  `NOTES.md` ("`@toonstrip/schema`'s ajv dependency has no ESM/browser build"), hit here
  for the first time by a *bundled* (Vite) consumer rather than the plain-HTML case
  `NOTES.md` describes. `<ComicStrip>` is only ever reached client-side through an
  astro-island's fully runtime-computed `import(url)` — a specifier Vite's dev-server
  dependency crawl can't discover ahead of time, since it isn't a static string literal
  anywhere in the site's own source. Everything reachable only from there (this
  renderer, `@toonstrip/element`, `@toonstrip/schema`, and schema's CJS `ajv`
  dependency) was invisible to that crawl and got served unbundled — which throws for
  `ajv` specifically (`"does not provide an export named 'default'"` or, depending on
  the exact miss, `ReferenceError: exports is not defined`), since a CJS package with no
  `"exports"`/`"module"` field needs a bundler's interop pass to expose a `default`
  export at all. Fixed by having the integration call
  `updateConfig({ vite: { optimizeDeps: { include: ["ajv"] } } })` in
  `astro:config:setup`, so every Astro/Vite consumer gets `ajv` correctly pre-bundled
  automatically — no per-project Vite config needed on the consumer's side.
- `packages/schema/src/validate.ts`: no code change, but investigated two alternative
  fixes here first (named `{ Ajv }` import, a dynamic top-level `await import("ajv")`) —
  both failed differently under Vite's raw/unbundled serve path, which turned out not to
  synthesize *any* usable export shape for an undiscovered CJS dependency, named or
  default. That ruled out an import-style fix entirely and pointed at the integration's
  `optimizeDeps` fix above as the only complete answer. Left a comment on the existing
  `import Ajv from "ajv"` pointing at `integration.ts` for why it works.

### Verify

- `pnpm --filter @toonstrip/schema --filter @toonstrip/astro --filter @toonstrip/element
  --filter @toonstrip/core run test` — all 43 tests pass (2 new/updated in
  `packages/astro/test/server.test.ts`).
- End-to-end in `danielkimdev-astro` (the consuming site): built `dist`, copied into its
  `node_modules`, confirmed via Chrome (claude-in-chrome) that `ajv` is auto-discovered
  and pre-bundled by Vite from installing `@toonstrip/astro` alone (no site-level
  `vite.optimizeDeps` needed), the SSR placeholder carries the new non-zero
  `min-height`, and — using `client:load` in place of `client:visible` for the check
  itself, since the automated browser tab used for testing stayed backgrounded
  (`document.visibilityState` stuck `"hidden"`, which Chrome's `IntersectionObserver`
  never fires callbacks for regardless of target size, making `client:visible` itself
  unverifiable in that specific harness) — hydration completed cleanly with a populated
  shadow root and no console errors.

### Notes

- Not yet published to npm — these fixes exist only in this repo's working tree as of
  this session. `danielkimdev-astro` verified them by copying built `dist/` output
  directly into its `node_modules`, not through a real npm install.
- `NOTES.md`'s M3 ajv gap is only *partially* closed: this fixes the Vite/Astro-bundled
  consumer. The plain-HTML, no-bundler case that note originally describes (`ajv`
  unresolvable by a bare-specifier `<script type="module">` import map) is untouched —
  still needs either a pre-bundled `dist/browser.js` with `ajv` inlined, or swapping
  `ajv` for a validator with a real ESM/browser build, per that note's original framing.

### Status

Fixes are code-complete and test-verified in this repo; not published. Next npm publish
of `@toonstrip/astro` and `@toonstrip/schema` should include these before Daniel's blog
post ships without its own site-level workarounds (it currently has none — verified
clean — because it's testing directly against this repo's unpublished `dist/`).

---

## v0.7.3 — Publish v0.7.2 Fixes; Column-Layout Bug Report Investigated

**Date:** 2026-09-01

### Changes

- Bumped `@toonstrip/schema` 0.1.1 → 0.1.2 and `@toonstrip/astro` 0.1.3 → 0.1.4 (the two
  packages v0.7.2 touched; `core`/`element` unchanged, no bump needed) and published
  both — `schema` via `npm publish` (plain `ajv` dependency, no workspace refs), `astro`
  via `pnpm publish` so its `workspace:*` deps on `@toonstrip/element`/`@toonstrip/schema`
  resolve to real semver in the published `package.json` (`pnpm pack` confirmed
  `"0.1.2"`/`"0.1.2"` in the tarball before publishing; a plain `npm publish` would have
  shipped the literal string `"workspace:*"`, the exact bug v0.1.2's changelog already
  fixed once for other packages).
- Investigated a second bug report surfaced from `danielkimdev-astro`: "column count is
  fixed, the two-column strip clips on narrow screens." Read `layout.ts`'s `columnsFor`/
  `layoutStrip` — panel width is always derived as a share of the measured available
  width (`Math.min(share, UNIT.width)`), so a hardcoded/overflowing column count isn't
  possible by construction. Verified directly: mounted a fresh `<comic-strip>` in a
  320px-wide container and confirmed it renders 1 column with `scrollWidth` exactly
  matching the host width (no overflow). No bug found in this repo.

### Verify

- `pnpm test` — 58 tests pass across all 7 packages.
- `pnpm build` — clean, including `examples/astro-blog`.
- `pnpm pack --pack-destination` + tarball inspection for `@toonstrip/astro` before
  publish, confirming `workspace:*` → real version rewrite.
- Fresh-mount column test (see above) in a live Chrome tab via `danielkimdev-astro`'s
  dev server, both for the reported bug and to confirm `@toonstrip/element@0.1.2`'s
  `ResizeObserver`-driven relayout does eventually run correctly on an existing mount
  once the tab gets a real paint — it just doesn't fire promptly in a backgrounded
  automated tab, same `document.visibilityState` limitation v0.7.2's Verify section
  already hit.

### Notes

- The consuming session's actual root cause for the column-mismatch complaint (EN vs KO
  panels differing) was `danielkimdev-astro`'s own prose CSS: a `max-width: 72ch` reading
  measure resolves to a different pixel width per body font (Latin vs Pretendard for
  Korean), landing Korean under this package's 2-column width threshold. Fixed on that
  side with a fixed-pixel breakout wrapper; nothing in this repo needed to change for it.

### Status

v0.7.2 is now live on npm. `danielkimdev-astro` still needs to bump its own
`package.json`/lockfile off the manual `dist/` copy and re-verify with a real
`npm install` — tracked in `HANDOFF.md`.

## v0.8.10 — Site Content Fixes; M8 through M13 Roadmap Added to Dev Plan

**Date:** 2026-09-02

### Changes

- Use cases section on the intro page trimmed from 7 to 5 items: removed "Release notes"
  and "Objection and answer" cards and their now-unused `releaseNotes`/`objection`
  imports (`site/src/pages/index.astro`).
- Added a "Where it came from" section after "Why not an image?" on the intro page,
  crediting `grues-in-comic` (grues.danielkimdev.com) as the project's origin. An early
  draft wrongly attributed pose/emotion selection to an AI layer; corrected to say it is
  the original Comic Chat engine's own text-to-affect logic, ported with no runtime LLM
  involved.
- Fixed a "missing character" bug on `/docs/emotions-and-poses/` and
  `/docs/cameras-and-panels/`: `requested` defaults to `false` on a body with no
  matching-character line (§3, `TOONSTRIP_DEV_PLAN.md`), and every panel in
  `emotions.json`, `intensity.json`, and `cameras.json` spoke through a `caption`
  channel instead of the body's own character, so the character silently never
  rendered. Added `requested: true` to the affected bodies, and fixed one silent body
  with the same issue in `panel-options.json`'s `roomTitle` panel.
- Swapped the emotion-wheel example character from `anna` to `sage`, and the intensity
  example from `dan` to `tiki`. Rendering both through `@toonstrip/cli` confirmed
  Anna's SCARED/SAD and ANGRY/SHOUT faces read as nearly identical at intensity 0.8,
  and that Dan has zero SAD-labelled faces at all (nearest-neighbour was silently
  falling back to his ANGRY face, exactly the "sad looks angry" bug reported). Checked
  all 15 default-pack characters' face manifests for angle/intensity coverage: `sage`
  has real, distinct art near intensity 0.8 for all 8 named emotions, and `tiki` is the
  only character with three visually distinct SAD faces (used at 0.6/0.8/1.0, replacing
  0.2/0.5/0.9).
- Added §13 to `TOONSTRIP_DEV_PLAN.md`: M8 through M13, covering vanilla HTML/"any SSG"
  docs, an AI-agent authoring skill, `@toonstrip/react`/`@toonstrip/vue`/`@toonstrip/next`
  wrappers, and general SSR support, with dependency order and sizing. Sequenced before
  the Korean locale (S9) for the same reason as the playground UI renewal: each item
  adds new site docs or examples that would otherwise need duplicating across `/ko/`.

### Verify

- `node site/scripts/validate-strips.mjs` — all strips pass, including the four edited.
- `pnpm --filter @toonstrip/cli build` then `toonstrip render` on `emotions.json`,
  `intensity.json`, and throwaway candidate documents, output inspected panel by panel
  to confirm the new characters' faces are actually visually distinct before committing
  to them, rather than trusting the face manifest's angle/intensity numbers alone.

### Status

Site content and docs only; no `@toonstrip/*` package versions bumped, nothing
published to npm.

## v0.9.0 — Playground UI Renewal: shadcn/ui on preact/compat, New Three-Pane Shell

**Date:** 2026-09-03

### Changes

- Wrote `PLAYGROUND_UI_PLAN.md` from Daniel's brief (preview full width at the bottom,
  visual configuration left / JSON right above it, per-section scroll with no page
  scroll, tabbed configuration, shadcn/ui) and executed its five steps in one session.
- Step 1, spike: `@astrojs/preact` with `compat: true`; Tailwind v4 through
  `@tailwindcss/vite`, scoped to the island by `@source` rules in
  `site/src/styles/playground-ui.css`, theme names mapped onto `tokens.css`, dark mode
  keyed to `[data-theme="dark"]`. Eleven components under `site/src/components/ui/`
  checked on `/kitchen-sink` (`UiSpike.tsx`, kept as the ui design check). Findings:
  Radix Tabs, Select, ToggleGroup, Popover, DropdownMenu, Tooltip, Dialog, ScrollArea
  and Slot work on compat (Radix moves focus in a `setTimeout`, so tests settle after
  arrow keys). Radix Slider does not: its thumb index is memoised before Preact's
  passive effects register the collection, so the thumb stays `display:none`; replaced
  by a native range input. react-resizable-panels v4 reported wrong sizes and ignored
  drag and keyboard on compat; replaced by a 150-line two-pane split with the same
  component names. Any `asChild` child must be a `forwardRef` component under Preact
  (a plain function component receives the trigger ref as its instance). `tslib` is an
  optional peer of react-remove-scroll that pnpm never links; aliased to its ESM build.
  Radix packages go in `noExternal` for the prerender environment so the react alias
  applies during SSR too. Playground JS 134.5 KB gzipped after the spike, 191.5 KB after
  step 4, budget 450 KB.
- Step 2, shell: `Playground.tsx` is a vertical `ResizablePanelGroup` (Configure | JSON
  over Preview), ratios and the JSON-collapsed flag persisted to `localStorage`; tabs
  plus a bottom `Sheet` under 900 px. The shell clips with `overflow-hidden`: the form's
  own scroll container was not enough to stop the document growing. ui wrappers accept
  Preact's `class` prop as well as `className`.
- Step 3, Configure tabs: Strip tab (packs, preset `Select`, reset, summary) plus one tab
  per panel; footer with move/duplicate and a `Popover`-confirmed Remove; `stripTab`
  signal in `state.ts`; `removePanel` clamps the selection; a preview canvas click
  selects that panel. The old `.pg-panels/.pg-panel` list CSS had hidden all but one
  tab until the class names were dropped.
- Step 4, controls: backdrop grid, camera and pose `ToggleGroup`, character `Popover`
  grid, speaker/balloon `Select`, `Input`/`Textarea`/`Checkbox`, width `Slider` with a
  preset `ToggleGroup`, Undo/Redo with `Tooltip`, Presets and Export `DropdownMenu`.
  `playground.css` cut from 675 to 176 lines (CodeMirror theme, stage, emotion wheel,
  toast). Tailwind utilities are emitted unlayered because the site's unlayered element
  rules would otherwise beat every layered utility; a scoped base reset stands in for
  preflight (range and checkbox inputs excluded from `appearance: none`).
- e2e: two tests added ("shell:" three viewports, split drag, collapse; "configure
  tabs:" tab ↔ preview sync, add/remove, preset load). The two tests that had failed
  before this work used `Control+A` in CodeMirror; `ControlOrMeta+A` fixes them on
  macOS. 8/8 green. axe reports only CodeMirror's `.cm-scroller` (pre-existing).
- Docs: `DESIGN.md` §6.1 and §6.2, `SITE_DEV_PLAN.md` §3 and §6.1 rewritten to the new
  layout; `CHANGELOG.md` 0.9.0.

### Status

Site 0.9.0, npm packages unchanged. Next: `PLAYGROUND_UI_PLAN.md` is complete; M8-M13
per `TOONSTRIP_DEV_PLAN.md` §13, then S9 Korean on the new markup.

## v0.9.1 — Fix Overlapping Labels in ToggleGroup; Drop the `UiSpike` Kitchen-Sink Spike

**Date:** 2026-09-03

### Changes

- `site/src/components/ui/toggle-group.tsx`: `ToggleGroupItem` combined `flex-1`
  (flex-basis 0) with an explicit `min-w-8`, which overrides the browser's automatic
  content-based minimum size and let items shrink narrower than their `whitespace-nowrap`
  text — the Camera segmented control and the Phone/Tablet/Desktop/Fill width presets
  rendered with overlapping labels and no visible boundary between options. Dropped
  `min-w-8` so items keep their content-based floor, added a small gap and an idle
  `bg-card`/`hover:bg-muted` state so unselected segments read as distinct buttons.
  Fixes both call sites (`PanelForm.tsx` camera/pose, `Preview.tsx` width presets) since
  they share this component. Verified in the local dev server, light and dark.
- Removed `UiSpike.tsx` and its `<h2>`/mount block from `kitchen-sink.astro`: the
  step-1 shadcn-on-preact/compat spike had done its job once steps 2-4 shipped the real
  playground UI, and it was adding ~75 KB JS to that page for no remaining reason
  (open issue from `HANDOFF.md`, v0.9.0 session).
- Local install had a broken `tslib` (declared in `site/package.json` and the lockfile,
  but not physically present under `node_modules/.pnpm` on this machine, breaking
  every site build). Unrelated to the above — confirmed by reproducing on a clean
  `main` with the changes stashed out. Fixed with a full `node_modules` wipe and
  reinstall; not a code change.

### Status

Site 0.9.1, npm packages unchanged.

## v0.10.0 — M8 Vanilla-HTML/No-Build-Step Example; M9 Agent Skill

**Date:** 2026-09-03

### Changes

M8 (`TOONSTRIP_DEV_PLAN.md` §13.1):

- `examples/vanilla-html/index.html`: a single `.html` file with no `package.json` and
  no bundler config, embedding a live 3-panel strip. Imports `@toonstrip/element` from
  `esm.sh`, which resolves the package's own bare `@toonstrip/core`/`@toonstrip/schema`
  imports into a working ESM graph — `unpkg` serves package files as-is and would leave
  those imports unresolved in a plain `<script type="module">` with no import map.
  Points `packs` at `unpkg` (a raw file server with CORS enabled) for the pack's static
  `pack.json`/sprite sheets/backdrops, which need no such resolution. Verified rendering
  correctly (three panels, correct figures/poses/balloons/backdrops, no console errors)
  served from a local static file server via a real Chrome tab; the extension's `file://`
  navigation is blocked by tool policy, not evidence against the `file://` claim — a
  top-level `file://` page fetching `https://` resources with `Access-Control-Allow-Origin: *`
  has no same-origin restriction in Chrome.
- `docs/vanilla-html.md`: new root doc explaining the esm.sh-vs-unpkg split in full and
  when to prefer self-hosting over CDN imports for production use.
- `site/src/content/docs/plain-html.mdx`: added a "No build step at all" section
  pointing at the new example, so the live docs site covers the same ground as the repo
  doc without duplicating it.
- `README.md`: added `examples/vanilla-html` and `skills/toonstrip` to the packages
  table, and `docs/vanilla-html.md` to the documents list.

M9 (`TOONSTRIP_DEV_PLAN.md` §13.2):

- `skills/toonstrip/SKILL.md`: a distributable skill teaching an AI coding agent the
  `ComicStripDocument` v1 shape, the exact emotion-wheel angles (`EMOTION_ANGLES` in
  `packages/core/src/emotion.ts`, restated as a lookup table so an agent hits named
  points instead of guessing), the three exposed gesture poses, the default
  `pack-comic-chat` pack's real 15-character/3-backdrop id list (so an agent never
  invents an id that doesn't exist), and the `toonstrip render`-to-validate workflow —
  with an explicit instruction to always run it rather than hand back an unverified
  document.
- Self-tested against the dev plan's own M9 exit criterion: wrote a two-panel document
  (`kevin`/`lynnea`, `field` backdrop, a `wave` pose, HAPPY/SAD angles from the skill's
  table) using only the skill's guidance, ran `node packages/cli/dist/bin.js render …
  --pack packages/pack-comic-chat`, and it rendered correctly on the first attempt — no
  schema errors, no unresolved ids, output visually confirmed (waving figure, correct
  expressions, both balloon texts legible).
- `pnpm -r build` run once this session (to produce `dist/` for the self-test above); no
  runtime code changed, so no npm package versions bumped.
- `site/src/content/docs/agent-skill.mdx` (Reference, order 13): documents the skill for
  site readers — what it teaches, how to install it into an agent's skills directory
  (e.g. Claude Code's `.claude/skills/`), and how to verify a document it produced.
  Cross-linked from a new FAQ entry. No manual wiring needed for `llms.txt`/`llms-full.txt`
  since both are generated from the docs content collection. Verified: `pnpm --filter
  toonstrip-site build` succeeds and `/docs/agent-skill/` renders correctly (sidebar
  placement, Callout, code blocks, cross-links) in a real Chrome tab served from
  `site/dist`.

### Status

Site/repo 0.10.0. M0–M9 of `TOONSTRIP_DEV_PLAN.md` done. npm packages unchanged (schema
0.1.3, core 0.1.7, element 0.1.8, astro 0.1.11, cli 0.2.1, packs 0.1.1). Next: M10
(`@toonstrip/react`) and M11 (`@toonstrip/vue`) per §13.3.

## v0.15.1 — Asset-Packager Docs Page; `@toonstrip/asset-packager` Published

**Date:** 2026-09-04

### Changes

- `site/src/content/docs/asset-packager.mdx`: new Reference page (order 17) for
  `@toonstrip/asset-packager`. Covers the full loop (`init` → `validate` → `build
  --preview` → `toonstrip pack validate`), both input paths (one PNG per pose, and sheet
  input via `template` + a `sheet`/`backdropSheets` declaration in `source.json`), the
  file-overrides-cell rule, the three join-resolution routes and why `--preview` matters,
  the errors-vs-warnings split, the `analyze`/`buildPack` library API, and licensing.
  Deep detail stays in the repo docs (`docs/asset-image-spec.md`, `docs/asset-sheets.md`),
  linked from the page rather than duplicated.
- `site/src/content/docs/asset-packs.mdx`: a tip at the end of "Adding a character, step
  by step" pointing at the new page, so the hand-written-manifest path names the tool
  that removes it.
- Published **`@toonstrip/asset-packager` 0.2.0** to npm (public). 33 tests green before
  publish; the published tarball was fetched back and its `@toonstrip/core` workspace dep
  confirmed rewritten to `0.1.7`. The registry read endpoint 404'd for several minutes
  after a successful publish (negative CDN cache); a re-publish attempt returning "cannot
  publish over the previously published versions: 0.2.0" is what confirmed it landed.

### Status

Site/repo 0.15.1. M0–M15 of `TOONSTRIP_DEV_PLAN.md` done. 11 packages on npm (schema
0.1.3, core 0.1.7, element 0.1.8, astro 0.1.11, cli 0.2.1, packs 0.1.1, react/vue/next
0.1.0, asset-packager 0.2.0). Next: S9 Korean locale per `SITE_DEV_PLAN.md` §13.

---

## v0.15.2 — `PONYTAIL_AUDIT.md` worked (35/46), `@toonstrip/next` deprecated and published

**Date:** 2026-09-05

### Changes

Worked the repo-wide over-engineering audit (`PONYTAIL_AUDIT.md`, 46 ranked findings from
the prior session) autonomously: 35 of 46 items landed (4 partial), skipping/flagging the
rest with reasons. ~700 generated lines and 7 deps fully dropped (2 more moved to
devDeps, 4 demoted), ~866 hand-written lines net removed, one published package
deprecated. Commits `5413998`, `6c48463`, `232d49e` (dead-code/dedup across
site/core/packager/CLI — see `PONYTAIL_AUDIT.md`'s Progress table for the full per-item
ledger), `f91aa64` (#1: `@toonstrip/schema`'s ajv+esbuild standalone-compile validator
replaced with `scripts/embed-schema.mjs` baking `schema.json` into a TS literal plus a
~50-line hand-rolled recursive checker — same `instancePath`/`message` contract,
verified byte-for-byte against ajv's old output), and `9668530`/`68e61db` (#4:
`@toonstrip/next` deprecated — `@toonstrip/react`'s `<ComicStrip>` now carries its own
`"use client"` directive and `@toonstrip/cli` exports `renderPlaceholder` directly;
`next` kept as a backward-compatible re-export shim, not deleted, since it was already
published; `examples/next-app` migrated to the new imports and verified end-to-end,
including a real browser check of the SSR placeholder).

Published the #4 fix: `@toonstrip/react` and `@toonstrip/cli` first (so `next`'s
`workspace:*` deps resolve to real versions), then `@toonstrip/next`. First attempt used
plain `npm publish`, which does not understand pnpm's `workspace:*` protocol and shipped
it as a literal, unresolvable string — `react@0.1.1` and `cli@0.2.2` went out broken.
Caught it via `npm view <pkg>@<version> dependencies`, which also revealed this same
defect was already live and pre-existing on `react@0.1.0` and `vue@0.1.0` (from an
earlier session) — not introduced today, but from the same root cause: publishing with
plain `npm` instead of `pnpm publish` in a pnpm workspace. Fixed by re-publishing with
`pnpm publish` (which correctly rewrites `workspace:*` to the real resolved version) as
`react@0.1.2` and `cli@0.2.3`, then `next@0.1.1`; deprecated the two broken versions via
`npm deprecate` with a message pointing to the fix. Verified the whole chain with a real
`npm install @toonstrip/next @toonstrip/react @toonstrip/cli` in a clean, non-workspace
directory — no `workspace:*` strings anywhere, correct versions resolved.

That clean-room check surfaced a second, separate, pre-existing bug:
`@toonstrip/element@0.1.8` (live on npm, unchanged today) predates its own SSR guard —
the fix (`ElementBase = typeof HTMLElement !== "undefined" ? HTMLElement : class {}`)
landed in commit `f6d25ba` (M12/M13) but element's version was never bumped/published
after. Any real npm install of `@toonstrip/next` (or `react`/`vue`) crashes with
`HTMLElement is not defined` server-side, because the monorepo's own dev/test always
passes (workspace linking uses local dist, which has the fix) while the published
package chain does not. Not fixed this session — flagged in `HANDOFF.md` for a
follow-up publish, since it wasn't part of what was asked and deserves its own
confirmation.

`react@0.1.0`/`vue@0.1.0`'s pre-existing `workspace:*` breakage was reported but also
left unfixed pending a decision on scope (only `react`/`cli`/`next` were asked for).

### Status

Site/repo 0.15.2. Same 11 packages on npm; versions moved: cli 0.2.3, react 0.1.2, next
0.1.1 (all correctly resolved). `@toonstrip/element@0.1.8` and `@toonstrip/vue@0.1.0` are
known-broken/known-unsafe for real consumers — see `HANDOFF.md`'s Open Issues. 11/46
`PONYTAIL_AUDIT.md` items remain (schema republish not needed — its ajv removal is
local-only until `@toonstrip/schema` itself is republished, which wasn't requested
either).

---

## v0.15.3 — Fix element/vue's `workspace:*` bug, then a self-caused core/cli/element regression

**Date:** 2026-09-05

### Changes

Fixing v0.15.2's flagged Open Issues (`@toonstrip/element@0.1.8` predating its own SSR
guard, `@toonstrip/vue@0.1.0`'s broken literal `workspace:*` dependency) surfaced a second,
more serious incident, this one self-inflicted in this same session.

`@toonstrip/element@0.1.9` was published (fixing the SSR guard, per v0.15.2). But
v0.15.2's ponytail-audit work had already hoisted a `copyCycles` helper into
`@toonstrip/core`'s public exports (batch 3, commit `6c48463`) and pointed
`@toonstrip/cli`/`@toonstrip/element`'s own source at it — without publishing a new
`@toonstrip/core` first. `@toonstrip/core` was still live at `0.1.7`, which does not have
that export. Result: **`@toonstrip/element@0.1.9` and the already-live
`@toonstrip/cli@0.2.3` both crashed immediately on import for every consumer** —
`SyntaxError: The requested module '@toonstrip/core' does not provide an export named
'copyCycles'` — not an SSR-specific issue, a total module-load failure. `@toonstrip/vue@0.1.1`
(published moments earlier, depending on the broken `element@0.1.9`) inherited the same
crash transitively. All three were immediately deprecated via `npm deprecate` with a
message pointing at the pending fix, as soon as caught.

Fixed by publishing the correct dependency chain in order, verifying real code execution
(not just successful `import`) at each link before moving to the next:

- `@toonstrip/core` 0.1.7 → **0.1.8** (has `copyCycles`; also carries the rest of the
  ponytail audit's core-side changes — `#18` layout.ts, `#37` balloon.ts, `#38`'s
  `normalizeAngle`, `#39`'s dead-field removals, `#23`'s type-only `Emotion` re-export)
- `@toonstrip/cli` 0.2.3 → **0.2.4**, `@toonstrip/element` 0.1.9 → **0.1.10** (both
  repointed at core 0.1.8; verified by actually calling `renderDocument` and importing
  `element` with no DOM present, not just checking the import succeeded)
- `@toonstrip/vue` 0.1.1 → **0.1.2**, `@toonstrip/react` 0.1.2 → **0.1.3** (both repointed
  at the fixed element 0.1.10 — this is also what finally gives `react` real SSR safety,
  since it had been pointing at the original guard-less `element@0.1.8` all along)
- `@toonstrip/next` 0.1.1 → **0.1.2** (repointed at the fixed `react`/`cli`)

Verified the whole tree with a real `npm install` of all six packages in a clean,
non-workspace directory, then actually exercised the code (not just imports): `element`/
`react`/`vue`/`next` all import with no DOM present, `cli.renderDocument` renders a real
PNG, `next/server`'s `renderPlaceholder` produces a real placeholder. All green.

**Deprecated, broken, superseded:** `react@0.1.1`, `cli@0.2.2` (v0.15.2's incident),
`cli@0.2.3`, `element@0.1.9`, `vue@0.1.1` (this incident). `react@0.1.0`/`vue@0.1.0`
(pre-existing, from an earlier session) were superseded but not separately deprecated
under their own notice beyond what v0.15.2 already did for `react@0.1.0`.

**Not done, flagged:** `@toonstrip/astro@0.1.11` (live) still depends on the original
guard-less `element@0.1.8` — same SSR-crash exposure as `react`/`vue` had, for Astro's own
(SSR-first) consumers. Not fixed this session; wasn't part of what was asked, and Astro
integration testing needs its own verification pass before publishing a fix.

### Status

Site/repo 0.15.3. 11 packages on npm, all internally consistent: schema 0.1.3
(unchanged), core 0.1.8, element 0.1.10, astro 0.1.11 (**still on old element — flagged**),
cli 0.2.4, react 0.1.3, vue 0.1.2, next 0.1.2, packs 0.1.1, asset-packager 0.2.0. Full
clean-room verification passed: no `workspace:*` strings anywhere, real code paths
exercised (render a PNG, import with no DOM), not just successful imports.
