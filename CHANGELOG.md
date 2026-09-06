# Changelog

All notable changes to toonstrip, newest first. Versions are repository versions; the
npm packages are versioned independently, so each entry lists the package versions it
shipped. Written for users; the engineering history behind each entry is in `WORKLOG.md`.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 0.15.6 — 2026-09-06

**Packages:** `@toonstrip/asset-packager` 0.2.5; everything else unchanged since 0.15.5.
(0.2.4 was published with an unresolved `workspace:*` dependency on
`@toonstrip/core` — plain `npm publish` doesn't resolve the workspace
protocol the way `pnpm publish` does, the same mistake 0.2.1 made. Broken
for anyone installing it standalone; skip straight to 0.2.5.)

### Fixed

- `toonstrip-pack template`'s character-sheet guide and default prompt text
  described a "shoulders to waist" bust, which doesn't match this format's
  Comic Chat origins — the real ported roster (`@toonstrip/pack-comic-chat`'s
  `dan`/`anna`, etc.) is a full standing body, head composited on separately,
  feet cut off by the canvas edge. The guide now draws a full figure
  (shoulders, arms, legs, feet) instead of a waist-cropped torso, and
  `docs/asset-image-spec.md` §3 is corrected to match.
- The same guide was dead-symmetric (a plain circle for the head, a
  bilaterally-symmetric body outline) with no visual cue for which way the
  character faces, even though the renderer mirrors a figure's own art
  horizontally to face the other way in a two-shot (`drawFigure`'s `mirror`
  transform) rather than redrawing or re-angling anything. A model
  reproducing a symmetric guide has every reason to draw a symmetric,
  camera-facing character, which then can't be mirrored convincingly. The
  guide (and the auto-generated prompt text) now bias toward a 3/4,
  screen-right-facing pose: a profile notch on the face, an asymmetric
  near/far body outline on the torso.
- The torso guide gave zero headroom above the shoulder line, so any of the
  tool's own default gesture poses (`torso-WAVE`, `POINTOTHER`, ...) had
  nowhere to put a raised or extended arm without it clipping the cell edge.
  The guide (and prompt text) now leave real margin above the shoulders and
  to the sides for that.

### Added

- Sheet-sourced characters are now auto-corrected for scale instead of only
  warned about. Each kind's `NEUTRAL` cell is rescaled toward the middle of
  the pack's fill window (was: left alone unless clearly outside it, which
  let a character balanced right on the window's edge tip a sibling pose
  outside it independently), then every other pose of that kind is rescaled
  to match `NEUTRAL` if it drifted more than 12% (was: warned and left for a
  person to notice and re-prompt an image model to fix). Both scale about
  the bottom-centre of the drawing — where the actual join lives for both
  kinds (a face's neck-stub base, a torso's feet) — so correcting scale
  can't pull a torso's feet away from the bottom edge it's required to
  touch. Enlarging backs off (analytically first, with a short empirical
  refinement for resampling bleed) to whatever the drawing's own headroom
  actually allows rather than clipping past it or giving up on any
  enlargement at all when the ideal target isn't reachable. A correction
  over 50% still gets a diagnostic, reworded from "this pose won't
  composite right, fix it" to "auto-corrected, worth a glance."
- The sheet slicer's "drawing runs into the gutter" check now runs after
  scale normalization instead of on the raw slice — a slice that ran into
  the gutter only because the drawing was oversized is exactly what the
  scale correction above fixes, so checking before that ran was flagging a
  problem already about to be resolved.

## 0.15.5 — 2026-09-06

**Packages:** `@toonstrip/asset-packager` 0.2.3; everything else unchanged since 0.15.4.

### Fixed

- `toonstrip-pack template`'s reference sheets no longer bake instructional
  guide text (`"centre square is kept"`, `"horizon"`, `"chin rule — base of
  neck stub sits here"`, etc.) into the cell content area at readable
  contrast. Image models generating from the reference would sometimes
  reproduce that text verbatim as if it were scene content, even though the
  prompt explicitly says not to — text is a much easier thing for a model to
  copy than "ignore this per an instruction." The graphical guides (dashed
  horizon/centre-line, cell bounding boxes) are unchanged; only the spelled-out
  captions inside the content area are gone. The cropped id-label header band
  is unaffected.

## 0.15.4 — 2026-09-05

**Packages:** `@toonstrip/astro` 0.1.12; everything else unchanged since 0.15.3.

### Fixed

- `@toonstrip/astro` no longer crashes an Astro static build (`astro build`) with
  `ReferenceError: HTMLElement is not defined`. If you're on `@toonstrip/astro` 0.1.11 or
  earlier, upgrade to 0.1.12.

## 0.15.3 — 2026-09-05

**Packages:** `@toonstrip/core` 0.1.8, `@toonstrip/cli` 0.2.4, `@toonstrip/element`
0.1.10, `@toonstrip/vue` 0.1.2, `@toonstrip/react` 0.1.3, `@toonstrip/next` 0.1.2.

### Fixed

- A server-side rendering crash (`ReferenceError: HTMLElement is not defined`) is fixed in
  `@toonstrip/element`, and inherited by `@toonstrip/react`, `@toonstrip/vue`, and
  `@toonstrip/next` — all now safe to import with no DOM present (SSR, static builds,
  tests).
- A few versions published earlier the same day (`@toonstrip/react` 0.1.1,
  `@toonstrip/cli` 0.2.2/0.2.3, `@toonstrip/element` 0.1.9, `@toonstrip/vue` 0.1.1) failed
  to import at all and are deprecated on npm. Upgrade past them to the versions above.

## 0.15.2 — 2026-09-05

**Packages:** `@toonstrip/next` 0.1.2 (deprecated), `@toonstrip/react` 0.1.3,
`@toonstrip/cli` 0.2.4.

### Changed

- **`@toonstrip/next` is deprecated.** Its `"use client"` `<ComicStrip>` now lives
  directly in `@toonstrip/react`, and its SSR placeholder helper is `renderPlaceholder`
  from `@toonstrip/cli`. Existing installs keep working — `next` is now a compatibility
  re-export, not removed — but new Next.js projects should import from `react`/`cli`
  directly.

### Fixed

- Internal cleanup across the rendering core, CLI, and asset packager (dead code,
  duplicate helpers, a faster schema validator). No user-visible behavior change.

## 0.15.1 — 2026-09-04

**Packages:** `@toonstrip/asset-packager` 0.2.0 published.

### Added

- New docs page for `@toonstrip/asset-packager`: the full `init` → `validate` → `build
  --preview` loop, both single-file and sheet inputs, and the CLI/library API.

## 0.15.0 — 2026-09-03

**Packages:** `@toonstrip/asset-packager` 0.2.0 (built, not yet published); everything
else unchanged (`@toonstrip/schema` 0.1.3, `@toonstrip/core` 0.1.7,
`@toonstrip/element` 0.1.8, `@toonstrip/astro` 0.1.11, `@toonstrip/cli` 0.2.1,
`@toonstrip/react` 0.1.0, `@toonstrip/vue` 0.1.0, `@toonstrip/next` 0.1.0,
`@toonstrip/pack-comic-chat` 0.1.1).

### Added

- **Build a pack from one image instead of many.** `@toonstrip/asset-packager` now takes
  **sheets**: a single image holding a grid of labelled cells, sliced into many pack
  assets. A character sheet carries a character's poses; a backdrop sheet carries whole
  scenes — as many backdrops as the grid holds, from one prompt. The grid is whatever
  shape you declare, and several sheets of different shapes can live in one pack.
- **Why it matters for generated art.** A sheet is one generation pass, so a character's
  hair, line weight and head size cannot drift between poses the way they do across
  separate generations — and because every cell shares one scale, the packager aligns
  each pose to the character's neutral cell and corrects a pose drawn a few pixels off,
  instead of deriving a slightly wrong join from that pose alone.
- **`toonstrip-pack template`** writes the reference sheet to hand an image model, and
  prints both the `source.json` fragment for it and a prompt skeleton to fill in.
- **Flat backgrounds are accepted on sheets.** Few image models can emit real
  transparency, so a sheet arriving on plain white is keyed out per cell (a white shirt
  stays white — keying floods in from the edges), along with printed labels and painted
  gutters.
- **New diagnostics, each naming its cell:** a blank cell an id points at, more ids than
  cells, a drawing running into the gutter, a pose drawn at a different scale from
  neutral, two near-identical backdrop scenes, and a grid too dense to carry the pack's
  cell size.
- **Sheets and files mix.** Where both describe the same asset the individual file wins,
  so one weak cell can be regenerated on its own — using the sheet as its reference — and
  dropped in without touching `source.json`.
- Documented in `docs/asset-sheets.md`; the agent skill now teaches the sheet workflow and
  the two-reference prompt pattern alongside the per-pose one.

## 0.14.0 — 2026-09-03

**Packages:** unchanged (`@toonstrip/schema` 0.1.3, `@toonstrip/core` 0.1.7,
`@toonstrip/element` 0.1.8, `@toonstrip/astro` 0.1.11, `@toonstrip/cli` 0.2.1,
`@toonstrip/react` 0.1.0, `@toonstrip/vue` 0.1.0, `@toonstrip/next` 0.1.0,
`@toonstrip/pack-comic-chat` 0.1.1). `@toonstrip/asset-packager` 0.1.0 built, not yet
published.

### Added

- **Build an asset pack from plain PNGs.** `@toonstrip/asset-packager` (the
  `toonstrip-pack` command) turns a directory of one-pose-per-file transparent PNGs into
  a valid pack: it checks the images, packs the sprite sheets, works out where each head
  joins its neck, and writes `pack.json` and the per-character manifests. Adding a
  character no longer means hand-writing a rect table. It runs entirely offline — no
  model, no network; it only ever reads finished images, whether they came from an image
  model, Procreate or Aseprite.
- **The asset image specification.** `docs/asset-image-spec.md` in the repository
  states the rules an input PNG has to follow — naming, canvas, where to place the
  drawing, what has to stay consistent between a character's poses — tightly enough that
  an image-generation prompt can hit them.
- **A join preview.** `toonstrip-pack build --preview joins.png` composites each
  character's neutral face and torso and marks the derived join, so a head that lands off
  the neck is visible before you ship the pack. A wrong join still produces a
  *structurally valid* pack, so this is the check that matters.
- **The agent skill now covers art, not just documents.** `skills/toonstrip/SKILL.md`
  teaches an AI coding agent how to write per-pose generation prompts that satisfy the
  spec, then run the packager and act on its errors and warnings.

## 0.13.0 — 2026-09-03

**Packages:** unchanged (`@toonstrip/schema` 0.1.3, `@toonstrip/core` 0.1.7,
`@toonstrip/element` 0.1.8, `@toonstrip/astro` 0.1.11, `@toonstrip/cli` 0.2.1,
`@toonstrip/pack-comic-chat` 0.1.1). `@toonstrip/next` 0.1.0 built, not yet published.

### Added

- **A Next.js wrapper.** `@toonstrip/next` wraps `@toonstrip/react`'s `<ComicStrip>`
  behind an App Router-safe client boundary, so it drops straight into a Server
  Component. A minimal App Router example (`examples/next-app`) ships alongside it.
  Documented at [Next.js reference](https://toonstrip.danielkimdev.com/docs/next-reference/).
- **Server-rendered placeholders.** `@toonstrip/next/server`'s `renderPlaceholder` renders
  a real PNG of your strip on the server, so a Next.js page shows the actual strip
  content immediately — in "view source", and with JavaScript disabled — instead of a
  blank shell, then swaps to the live canvas on hydration with no layout shift.

### Fixed

- **`@toonstrip/element` no longer throws when imported on a server.** This was already
  the practical blocker for using `@toonstrip/react` or `@toonstrip/vue` in any
  server-rendering framework; it's now safe to import them there.

## 0.12.0 — 2026-09-03

**Packages:** unchanged (`@toonstrip/schema` 0.1.3, `@toonstrip/core` 0.1.7,
`@toonstrip/element` 0.1.8, `@toonstrip/astro` 0.1.11, `@toonstrip/cli` 0.2.1,
`@toonstrip/pack-comic-chat` 0.1.1). `@toonstrip/vue` 0.1.0 built, not yet published.

### Added

- **A Vue wrapper.** `@toonstrip/vue`'s `<ComicStrip>` component mounts
  `@toonstrip/element`'s `<comic-strip>` custom element and updates it reactively on a
  `document`/`packs` change — no remount, same pattern as `@toonstrip/react`. A minimal
  Vite + Vue example (`examples/vue-vite`) ships alongside it. Documented at
  [Vue reference](https://toonstrip.danielkimdev.com/docs/vue-reference/).

## 0.11.0 — 2026-09-03

**Packages:** unchanged (`@toonstrip/schema` 0.1.3, `@toonstrip/core` 0.1.7,
`@toonstrip/element` 0.1.8, `@toonstrip/astro` 0.1.11, `@toonstrip/cli` 0.2.1,
`@toonstrip/pack-comic-chat` 0.1.1). `@toonstrip/react` 0.1.0 built, not yet published.

### Added

- **A React wrapper.** `@toonstrip/react`'s `<ComicStrip>` component mounts
  `@toonstrip/element`'s `<comic-strip>` custom element via a ref and updates it on a
  `document`/`packs` prop change without remounting. A minimal Vite + React example
  (`examples/react-vite`) ships alongside it. Documented at
  [React reference](https://toonstrip.danielkimdev.com/docs/react-reference/).

## 0.10.0 — 2026-09-03

**Packages:** unchanged (`@toonstrip/schema` 0.1.3, `@toonstrip/core` 0.1.7,
`@toonstrip/element` 0.1.8, `@toonstrip/astro` 0.1.11, `@toonstrip/cli` 0.2.1,
`@toonstrip/pack-comic-chat` 0.1.1). Docs and examples only.

### Added

- **No build step at all.** A new example (`examples/vanilla-html`) embeds a live strip
  in a single `.html` file — no `package.json`, no bundler, opens straight from disk or
  any static file server. See the new "No build step at all" section on the
  [Plain HTML](https://toonstrip.danielkimdev.com/docs/plain-html/) doc.
- **An agent skill.** `skills/toonstrip/SKILL.md` teaches an AI coding agent the
  `ComicStripDocument` shape, the emotion-wheel angles, and the default pack's real
  character/backdrop ids, so it stops guessing and validates what it writes before
  handing it back. Documented at
  [Agent skill](https://toonstrip.danielkimdev.com/docs/agent-skill/).

## 0.9.0 — 2026-09-03

**Packages:** unchanged (`@toonstrip/schema` 0.1.3, `@toonstrip/core` 0.1.7,
`@toonstrip/element` 0.1.8, `@toonstrip/astro` 0.1.11, `@toonstrip/cli` 0.2.1). Site only.

### Changed

- **Playground layout.** The strip now previews full width along the bottom of the
  screen, with the visual configuration on the left and the JSON editor on the right
  above it. Drag either divider to resize, and the proportions are remembered for your
  next visit. The whole editor fits one screen: each section scrolls on its own instead
  of the page scrolling. The JSON pane collapses to a slim bar when you want the width.
- **Panels are tabs.** The configuration side leads with a Strip tab for asset packs,
  presets and a summary of the document, followed by one tab per panel. Clicking a panel
  in the preview jumps to its tab, and the tab you are editing stays outlined in the
  preview.
- **Rebuilt controls.** Backdrop and character pickers, camera and pose selectors, the
  speaker and balloon menus, the width slider and the Presets and Export menus were all
  rebuilt on a consistent component set, with clearer focus states and full keyboard
  operation. Phones keep the Configure / JSON / Preview tabs and the slide-up preview.

### Fixed

- Removing a panel no longer leaves the editor pointing at a panel that is gone.

## 0.8.9 — 2026-09-02

**Packages:** `@toonstrip/core` 0.1.7, `@toonstrip/element` 0.1.8, `@toonstrip/astro` 0.1.11,
`@toonstrip/cli` 0.2.1 (all published)

### Fixed

- Korean balloon text rendered in a brush script on Windows (Gungseo) and in arbitrary
  fallbacks elsewhere. The comic font stack now names Noto Sans KR, then the platform
  Korean sans faces, ahead of the generic; Latin text is unchanged.
- The element now waits for `document.fonts` before first paint and repaints when a
  face finishes loading late, so a page-declared webfont reaches the canvas.

### Added

- `toonstrip render --font <file>` registers a font file (for example Noto Sans KR)
  before drawing. `COMIC_FONT_FAMILY` and `TITLE_FONT` exported from `@toonstrip/core`.
- The site declares Noto Sans KR (Korean subset, fetched only when drawn) and the
  kitchen sink has a Korean strip check.

## 0.8.8 — 2026-09-02

**Packages:** `@toonstrip/cli` 0.2.0 (published)

### Added

- The site is live at [toonstrip.danielkimdev.com](https://toonstrip.danielkimdev.com):
  intro, docs, playground, and this changelog. Every `@toonstrip/*` README links to it.

## 0.8.7 — 2026-09-02

**Packages:** `@toonstrip/cli` 0.2.0 (published 2026-09-02 with 0.8.8)

### Added

- `toonstrip render <doc.json> --out strip.png`: render a Comic Strip Document to one PNG
  in Node, with the element's column policy and figure selection. `--width`, `--scale`,
  `--pack <dir>` (repeatable), `--transparent`, `--background`. Also exported as
  `renderDocument()`.

### Changed

- `@toonstrip/cli` now depends on `@toonstrip/core`, `@toonstrip/schema`, and
  `@napi-rs/canvas`.

## 0.8.6 — 2026-09-02

**Packages:** no npm release (site only)

### Added

- Per-route JavaScript budgets enforced in CI, an Open Graph image rendered from the hero
  strip, and the site's end-to-end tests running in CI.

## 0.8.5 — 2026-09-02

**Packages:** no npm release (site only)

### Added

- Public changelog at `/changelog` with an Atom feed, generated from this file.

## 0.8.4 — 2026-09-02

**Packages:** no npm release (site only)

### Added

- The playground: edit a strip as a form, as JSON, or by watching the result. Emotion
  wheel, camera presets, character and backdrop pickers, undo/redo, presets, share by
  URL, PNG export, and copy-out Astro and HTML snippets.

## 0.8.3 — 2026-09-02

**Packages:** no npm release (site only)

### Added

- Documentation site: twelve pages from install to schema reference, every example shown
  as code beside the strip it renders, plus `/llms.txt` for agents.

## 0.8.2 — 2026-09-02

**Packages:** no npm release (site only)

### Added

- The introduction page for toonstrip.danielkimdev.com: live hero strip with a width
  control, 30-second install, six use-case strips, the character roster.

## 0.8.1 — 2026-09-02

**Packages:** no npm release (site only)

### Added

- Site component library and the `CodeAndStrip` block used throughout the docs.

## 0.8.0 — 2026-09-02

**Packages:** no npm release (site only)

### Added

- `site/`: the source of toonstrip.danielkimdev.com, an Astro site that dogfoods
  `@toonstrip/astro`. Deployed by Cloudflare Pages from this repository.

### Fixed

- CI now builds the workspace before running tests. Every run since 0.4.0 had failed on
  a clean runner because the packages resolve each other through built `dist/` entry
  points.

## 0.7.11 — 2026-09-02

**Packages:** `@toonstrip/core` 0.1.6, `@toonstrip/element` 0.1.7, `@toonstrip/astro` 0.1.10

### Fixed

- Balloon text, padding, margins, and tail geometry now scale with the panel's actual
  size instead of being fixed pixel values computed for a 400 px panel. Narrow embeds
  (blog columns, phones) no longer read as cramped, and two-speaker panels fit their
  balloons side by side from 400 px down to 260 px.

## 0.7.10 — 2026-09-02

**Packages:** shipped with 0.7.11

### Fixed

- Two-speaker panels far too often fell back to vertically stacked balloons. The layout
  now reserves a horizontal corridor per speaker before sizing any balloon, so the first
  balloon can no longer take the room the second one needs.

## 0.7.9 — 2026-09-02

**Packages:** shipped with 0.7.11

### Fixed

- A stacked speech balloon could sit over the *other* character's head. Fallback layout
  now keeps a balloon within its own speaker's side of the panel.

## 0.7.8 — 2026-09-01

**Packages:** `@toonstrip/core` 0.1.5, `@toonstrip/element` 0.1.6, `@toonstrip/astro` 0.1.9

### Fixed

- Stacked balloons in multi-balloon panels were capped at two-thirds of the panel width
  for no layout reason; they now use the full width, so text wraps to fewer lines at
  real embed sizes.

## 0.7.7 — 2026-09-01

**Packages:** `@toonstrip/core` 0.1.4, `@toonstrip/element` 0.1.5, `@toonstrip/astro` 0.1.8

### Fixed

- Panel seeding used a plain space to join speaker and text, which could make two
  different panels lay out identically. Restored the collision-proof delimiter.

## 0.7.6 — 2026-09-01

**Packages:** `@toonstrip/core` 0.1.3, `@toonstrip/element` 0.1.4, `@toonstrip/astro` 0.1.7

### Fixed

- A speaker's first balloon was often needlessly narrow, wrapping to extra lines and
  pushing its neighbour's balloon into a head. Balloons now prefer the available width.

## 0.7.5 — 2026-09-01

**Packages:** `@toonstrip/element` 0.1.3, `@toonstrip/astro` 0.1.6

### Fixed

- `@toonstrip/element` and `@toonstrip/astro` were still pinned to the schema version
  from before 0.7.4's fix. Installing `@toonstrip/astro` alone now gets the CSP-safe
  validator.

## 0.7.4 — 2026-09-01

**Packages:** `@toonstrip/schema` 0.1.3, `@toonstrip/astro` 0.1.5

### Fixed

- Strips were blank on sites with a strict Content Security Policy because the
  validator compiled the JSON Schema at runtime with `new Function`. The validator is
  now precompiled at build time; no `unsafe-eval` needed.

### Changed

- `@toonstrip/astro` no longer injects `ajv` into Vite's `optimizeDeps`.

## 0.7.3 — 2026-09-01

**Packages:** `@toonstrip/schema` 0.1.2, `@toonstrip/astro` 0.1.4

### Fixed

- Published the 0.7.2 fixes.

## 0.7.2 — 2026-09-01

**Packages:** shipped in 0.7.3

### Fixed

- `<ComicStrip client:visible />` never hydrated: the server-rendered placeholder had
  zero height, so the browser never reported it as visible. The placeholder now
  reserves space.
- The bundled validator failed to import `ajv` under Vite.

## 0.7.1 — 2026-09-01

**Packages:** all seven `@toonstrip/*` packages at 0.1.0

### Added

- First npm release: `@toonstrip/schema`, `@toonstrip/core`, `@toonstrip/element`,
  `@toonstrip/astro`, `@toonstrip/pack-comic-chat`, `@toonstrip/pack-example`,
  `@toonstrip/cli`.

## 0.7.0 — 2026-09-01

**Packages:** unreleased

### Added

- Documentation: the document format, the asset pack contract with a worked walkthrough
  for adding a character, and embedding in Astro. Root README and contributing guide.
- `@toonstrip/pack-example`: a second, wholly original one-character pack proving the
  pack contract is not tied to the default art.

## 0.6.0 — 2026-09-01

**Packages:** unreleased

### Added

- `@toonstrip/astro`: the `toonstrip()` integration (copies packs into `public/`) and
  the `<ComicStrip>` component, with `client:visible` deferring all JavaScript and
  fetches until the strip scrolls into view.
- `examples/astro-blog`: a minimal Astro site embedding a strip in a post.

## 0.5.0 — 2026-09-01

**Packages:** unreleased

### Added

- `@toonstrip/element`: the `<comic-strip>` custom element. One canvas per panel,
  responsive column layout, device-pixel-ratio-aware, off-screen panels released,
  Shadow DOM isolation, and a generated `aria-label` per panel.

## 0.4.0 — 2026-09-01

**Packages:** unreleased

### Added

- `@toonstrip/pack-comic-chat`: the default asset pack. Fifteen characters and three
  backdrops from the original Microsoft Comic Chat, redistributed under MIT with
  attribution.
- `@toonstrip/cli`: `toonstrip pack validate <dir>`.

## 0.3.0 — 2026-09-01

**Packages:** unreleased

### Added

- `@toonstrip/core`: the rendering engine. Figures composited from face and torso
  sprites, emotion-wheel nearest-neighbour pose selection, six camera presets, speech,
  thought, and caption balloons with placement, and the responsive column policy.
  Framework-agnostic; runs in the browser and in Node.

## 0.2.0 — 2026-09-01

**Packages:** unreleased

### Added

- `@toonstrip/schema`: the `ComicStripDocument` v1 types, JSON Schema, and validator.
- pnpm workspace, MIT licence, CI.

## 0.1.0 — 2026-09-01

**Packages:** unreleased

### Added

- Repository created from the `grues-in-comic` comic renderer, with the game, chat, and
  AI-inference halves left behind.
