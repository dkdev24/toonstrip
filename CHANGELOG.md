# Changelog

All notable changes to toonstrip, newest first. Versions are repository versions; the
npm packages are versioned independently, so each entry lists the package versions it
shipped. Written for users; the engineering history behind each entry is in `WORKLOG.md`.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
