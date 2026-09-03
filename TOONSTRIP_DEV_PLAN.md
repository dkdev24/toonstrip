# toonstrip — Dev Plan

Seed document for **`toonstrip`**, a new, standalone open-source repository derived from
`grues-in-comic` but not living inside it. Copy this file into the new repo as
`HANDOFF.md` or `docs/DEVELOPMENT_PLAN.md` seed material and start from M0.

**Resolved at kickoff (2026-09-01):** project name **toonstrip** (npm: unscoped
`toonstrip` and the `@toonstrip` org both unclaimed as of this writing — claim both at
M0 before anyone else does); license **MIT**; default asset pack includes Comic Chat's
*original* backdrop bitmaps alongside its characters (§1, §6); demo/docs site at
**toonstrip.danielkimdev.com**, built with Astro (§7). These replace the corresponding
open items below — §11 keeps them only as a record of why.

## 0. Mission

A framework-embeddable library that renders a comic strip — panels, characters, poses,
emotions, speech/thought balloons, backdrops — from **caller-supplied data**, as a live,
responsive, canvas-based widget, not a flat pre-rendered image. Ships as an MVP Astro
integration (matches the author's own site stack) but the rendering core is
framework-agnostic so other frameworks (or plain HTML) can consume it later without a
rewrite.

**Non-goals (explicit — do not build these into the tool):**

- No AI-assisted content generation, no LLM calls, no "summarize this article" feature.
  The tool takes panels/dialogue/emotion as parameters it is handed. Producing that data
  (by hand, by script, by calling an LLM) is entirely the embedding site's business, kept
  outside this package. Downstream examples (a TL;DR generator, an AI author) belong in
  `examples/` or a *separate* repo that depends on this one — never in core.
- No affect-inference-from-text (Comic Chat's `textpose.cpp` / this project's
  `affect.ts` marker-matching). The caller decides pose and emotion per line; the tool
  never reads narration and guesses a mood.
- No game/session/turn engine. There is no `mapper.ts`, no `director.ts`, no event
  stream. A "panel" is authored data in, not a derived side effect of gameplay.
- No coupling to Zork, IR, or the importer. Nothing from `ir/`, `importer/`, or
  `engine/` crosses into the new repo.

## 1. Relationship to `grues-in-comic` — what ports, what's new, what's left behind

`grues-in-comic`'s comic pane already separates cleanly into a Zork-coupled half and a
generic half. The generic half is most of what this project needs, already built and
pixel-tested. Treat this as an **extraction + generalization**, not a rewrite from
scratch.

| Source (`grues-in-comic`) | Fate | Notes |
|---|---|---|
| `web/src/comic/render.ts` | **Port** | `renderPanel(ctx, panel, cast, w, h, opts)` — already documented as "a pure function of a Panel plus the cast: it reads no events, no engine and no session." This is the core. |
| `web/src/comic/balloon.ts`, `balloon-layout.ts` | **Port** | Balloon shapes, greedy wrap, tail placement. Framework/game-agnostic already. |
| `web/src/comic/figure.ts`, `art/src/pose.ts`, `art/src/format.ts` | **Port** | Face/torso compositing and the emotion-wheel *nearest-neighbour selection* (caller supplies an angle+intensity; this resolves it to a drawn pose). Keep the wheel math, drop nothing here — it is not the inference layer. |
| `web/src/comic/backdrop.ts` | **Port, generalized** | Keep `BackdropId`-keyed lookup shape; drop the Zork `ROOM_BACKDROPS` room-id map. A backdrop is just an id the caller names directly in panel data. |
| `web/src/comic/layout.ts` | **Port** | `layoutStrip`/`columnsFor`/`cellFor` — the responsive column-count-from-available-width policy (`MAX_COLUMNS = 3`, `MIN_PANEL_SCALE = 0.85`, `UNIT = 400×340`). This *is* "the same responsive layout as the Grues in Comic web app" the plan requires — port the module, not just the idea. |
| `web/src/comic-view.ts` | **Port, generalized into a Web Component** | Canvas-per-panel pool, `ResizeObserver`-driven relayout, `devicePixelRatio`-aware backing store, `IntersectionObserver` visibility gating, `role="img"` + `aria-label` per panel. This is the DOM glue that makes panels live canvases rather than one flat export — keep the mechanism, strip the app-specific chrome (`#loading-modal`, session resume, etc). |
| `art/src/avb.ts`, `pack.ts`, `cast-manifest.ts`, `raster.ts`, `png.ts`, `bmp.ts`, `inflate.ts` | **Port as an optional import path** | The `.avb` decoder is how the *existing* 15-character roster gets produced. Keep it so contributors with original Comic Chat art can convert it, but it is not the canonical authoring format for new contributions (§6). |
| `web/assets/comic/cast.json` + sheets (15 characters: `dan`, `anna`, `bolo`, `denise`, `kevin`, `lynnea`, `margaret`, `rebecca`, `tiki`, `sage`, `kwensa`, `hugh`, `maynard`, `scotty`, `tongtyed`) | **Port as the default asset pack** | Already decoded, packed, and MIT-licensed for redistribution (see §13) — a real 15-avatar starter pack on day one, not a placeholder. |
| `web/assets/comic/*` room backdrops (110 files) | **Leave behind** | Zork room art generated for `grues-in-comic` specifically — thematically wrong for a general tool, not something to fork wholesale. Its ids (`pastoral`, `field`, …) also collide with the real default source below, which is a *different* asset despite the shared name — do not reuse this directory. |
| `original-projects/comic-chat/v1.0-pre-modern/comicart/backdrop/{field,pastoral,room8bs}.bmp` (also duplicated under `v1.0/client/` and `v1.0-pre/client/` — identical bytes, pick any one copy) | **Port — this is the real default backdrop source** | The historical Comic Chat client's own three bundled room backdrops (v2.5-beta-1 shipped none — later versions let a chat room's host supply a backdrop at runtime instead of bundling fixed ones, so 3 is the complete historical set, not a sample). Same MIT/Microsoft-copyright terms as the character art (§13). `grues-in-comic` never decoded these — its own `pastoral`/`field` ids are unrelated AI-generated replacements — so this is fresh conversion work, not a copy. `art/src/bmp.ts`'s `decodeBmp` already parses this exact BMP format (proven against other Comic Chat resource bitmaps); only the pack/manifest step (§6) needs writing. |
| `web/src/comic/mapper.ts`, `script.ts`, `director.ts`, `page.ts`, `affect.ts` | **Leave behind** | This is the Zork-event → Panel translation layer and the text-affect inference engine — exactly the "AI-assisted"/game-logic half the mission excludes. `page.ts`'s `Panel`/`Line`/`Body` *type shapes* are worth reading as a reference for §3's schema, but the module itself does not port. |
| `web/src/comic/fit.ts` | **Skim, probably don't port** | Multi-body stage-slot sizing tuned for the game's five-body cap; revisit only if the schema ends up wanting >2 bodies on stage in v1. |
| `ir/`, `importer/`, `engine/` | **Leave behind entirely** | No IR, no ZIL, no session/turn state. |

## 2. Architecture

Monorepo (pnpm workspaces; Turborepo optional once build times justify it).

```
packages/
  core/           # renderPanel, layoutStrip, balloon/figure/backdrop, pose math.
                   # Framework-agnostic, canvas-API-only (works with @napi-rs/canvas
                   # in Node and the browser's native Canvas2D under one interface).
  schema/          # The Comic Strip Document types + JSON Schema + a runtime validator.
  element/         # The <comic-strip> custom element: canvas pool, ResizeObserver,
                   # IntersectionObserver, a11y. Wraps `core`. Zero framework deps.
  astro/           # Astro component wrapping `element` (MVP embed target, §7).
  pack-comic-chat/ # Default asset pack: the 15-character roster ported from
                   # grues-in-comic, converted from .avb, MIT-noticed.
  avb-import/      # Optional CLI: .avb → canonical pack format, for anyone converting
                   # further original Comic Chat art. Not a runtime dependency of core.
  cli/             # `toonstrip` CLI — the static-PNG fallback path (§8) and pack tooling (§6).
  react/           # planned, M10 (§13): thin wrapper around `element`, no new rendering logic.
  vue/             # planned, M11 (§13): same pattern as `react/`.
  next/            # planned, M12 (§13): wraps `react/` with an App-Router-safe client boundary.
examples/
  astro-blog/      # A minimal Astro site embedding the element, incl. a TL;DR strip
                   # built *by hand* (proving non-goal: no AI in the example, either —
                   # if an AI-authored example is wanted later it is a separate example
                   # or a separate repo, never a dependency of `core`).
docs/
  schema.md, packs.md, astro.md, self-hosting-assets.md
```

Dependency direction is one-way: `schema` → `core` → `element` → `astro`. `cli` and
`avb-import` depend on `core`/`schema` but nothing depends on them. Asset packs
(`pack-comic-chat`, and any third-party pack) depend on `schema` only (they ship a
manifest + images; they do not import rendering code).

## 3. The Comic Strip Document — the public API

This schema *is* the product. Requirement 1 ("the tool receives parameters for panel
count, characters with speech/emotion/pose, backdrop config") means: define this well,
version it, and validate it at the boundary — everything else in the plan serves this.

```ts
interface ComicStripDocument {
  version: 1;
  panels: Panel[];
}

interface Panel {
  backdrop: string;          // an id the active asset pack(s) resolve — no implicit room graph
  roomTitle?: string;        // optional banner text (ported from ADR 0009 §3's roomTitle)
  dark?: boolean;            // paints the panel black, figures omitted — ported as-is
  camera?: CameraPreset;     // "establishing" | "wide" | "medium" | "close-up" | "reaction" | "over-shoulder"
                              // optional: default "medium" if the caller doesn't care
  bodies: Body[];            // who is on stage, left-to-right
  speakers: Line[];          // balloons, draw order: caption, then each body with a line
}

interface Body {
  character: string;          // an id the active asset pack resolves
  emotion: { angle: number; intensity: number }; // explicit — see EMOTION_NAMES/emotionAngle
                                                    // in the ported pose math; a documented
                                                    // named-emotion helper ("HAPPY", 0.8) wraps this
  pose?: "wave" | "point" | "shrug" | ...;         // gesture sentinel, ported from the wheel's
                                                     // >2π gesture values — optional
  requested?: boolean;        // stage even if silent this panel (default true if it has a line)
}

interface Line {
  speaker: string | "caption";  // a body's character id, or the bodiless caption channel
  balloon: "speech" | "thought" | "caption";
  text: string;
}
```

Notes for the fresh session implementing this:

- This is deliberately the *shape* `web/tools/render-tldr-core.ts`'s ad hoc `Beat` type
  and `toPanel()` converged on in the parent repo — that file is worth reading as a
  working prototype of exactly this API, minus the versioning/validation.
- Ship a JSON Schema alongside the TS types (`packages/schema`) so the document can be
  hand-written, generated by a script in any language, or produced by a CMS plugin — the
  whole point of "AI-assisted generation is up to the user" is that this format must not
  require TypeScript or Node to produce.
- `camera` presets are the six rungs from `web/src/comic/render.ts`'s `SHOTS` table —
  port the table, keep the names, drop nothing; framing quality is a chunk of what makes
  this look like Comic Chat rather than generic clip art.
- Validate at the boundary (`schema`'s runtime validator) and fail loudly on an unknown
  `character`/`backdrop` id — resolve those against whatever asset packs the caller
  registered (§6), never silently fall back to a default that isn't there.

## 4. Rendering engine (ported core)

Port `render.ts`, `balloon.ts`, `balloon-layout.ts`, `figure.ts`, `backdrop.ts` close to
verbatim, updated only to:

1. Read the new `Panel`/`Body`/`Line` shape (§3) instead of the mapper's.
2. Drop the Zork-specific `ROOM_BACKDROPS` table from `backdrop.ts`; a panel's
   `backdrop` id is resolved directly against the registered pack(s).
3. Keep `renderPanel`'s existing contract: pure function of `(ctx, panel, cast, w, h,
   options)`, no globals, no DOM read outside the passed canvas context. This is what
   let the parent repo run it in both the browser and a Node/`@napi-rs/canvas` harness
   (`web/tools/render-panel.ts`) — preserve that, it is what makes §8 (static fallback)
   nearly free.

Keep `art/src/pose.ts`'s `selectComplexPose` (nearest-neighbour face match, gated torso
match, `m_lastTorso + 1` pose-cycling) verbatim — it is good, general design (documented
at length in `wiki/comic-chat-presentation.md` §2 in the parent repo) that has nothing
Zork-specific in it.

## 5. Responsive layout & live embed

Port `web/src/comic-view.ts`'s mechanism into `packages/element` as a custom element
(`<comic-strip>`), because a custom element is the one embed primitive that works
identically in Astro (`client:visible`), plain HTML, and any other framework's "drop in
a DOM node" escape hatch — this directly serves the "any web page" goal from the
project's very first framing, not just the Astro MVP.

Preserve, from the source file:

- **Canvas pool, not one giant canvas.** Each panel is its own `<canvas>`; a resize
  re-renders the affected panels rather than rescaling a bitmap (`comic-view.ts`'s own
  comment: "a canvas costs width × height × dpr² × 4 bytes... only the panels near the
  reader need to be that").
- **`ResizeObserver`-driven relayout** using `layoutStrip`/`columnsFor` (§1's ported
  `layout.ts`) — column count is derived from available width, not stored.
- **`devicePixelRatio`-aware backing store** (`canvas.width = Math.round(width *
  ratio)`), CSS size set separately — required for this to look sharp on any embedding
  page's zoom/DPI, not just the parent app's.
- **`IntersectionObserver` visibility gating** for strips with many panels off-screen —
  port if the element is meant to hold long strips; a 4-panel TL;DR strip doesn't need
  it, but the element shouldn't assume a small panel count.
- **Accessibility**: `role="img"` + `aria-label` per panel, generated from the panel's
  `Line[]` text (port the `describe(panel)` pattern) — this is also the natural no-CSS,
  no-JS content: search engines and screen readers get real text even though the panel
  itself is a canvas.
- **Style isolation.** Use Shadow DOM for the element's own layout CSS — an embed target
  is by definition dropped into a page whose stylesheet the tool does not control;
  leaking `.panel` or `.strip` class names into a blog's global CSS is a real risk
  `comic-view.ts` never had to consider (it owned the whole page).

## 6. Asset pack system — the open-source multiplier

Requirement 5 ("others can add custom assets for more characters and backdrops later")
is the part of this plan most likely to be underbuilt if treated as an afterthought.
Design the contract now:

**Canonical format is the manifest, not `.avb`.** `art/src/cast-manifest.ts`'s
`CastManifest` (`{ cast: Record<role, PackedAvatar>, backdrops: PackedBackdrop[] }`,
packed PNG sheets + a rect table) is already asset-tool-agnostic — a contributor draws a
character in Aseprite, Procreate, whatever, exports a sprite sheet, and hand-writes (or
scripts) the rect/pose table. `.avb` import (`avb-import` package, §2) is one *producer*
of this format, used once to seed the default pack from the original Comic Chat art —
it is not a format contributors need to know exists.

A pack is:

```
my-pack/
  pack.json         # { name, version, characters: [...], backdrops: [...], license }
  characters/<id>/sheet.png + <id>.json   # pose→rect table, per character
  backdrops/<id>.png
```

- Multiple packs registered at once; a `character`/`backdrop` id resolves against
  whichever pack declares it (collision = build-time error, not silent shadowing).
- `packages/cli` gets a `toonstrip pack validate <dir>` command from day one — the
  parent repo's `art/test/roster.test.ts` (checks required-emotion inventory per role,
  per `ROLE_FACE_REQUIREMENTS`) is the model: a pack should fail fast if a character is
  missing a pose the schema considers required (at minimum NEUTRAL).
- Document the contribution path (`docs/packs.md`) before v0.1.0, not after — an OSS
  project's early contributors are disproportionately going to be "I made a character,
  where does it go" people, and that path is the whole point of requirement 5.
- License each pack independently and require `pack.json.license` — the default pack's
  own history (§13) is a good worked example of why this field cannot be optional.

## 7. Astro integration (MVP target)

```astro
---
import { ComicStrip } from '@toonstrip/astro';
import doc from './my-strip.json';
---
<ComicStrip document={doc} packs={['comic-chat']} client:visible />
```

- Thin wrapper around `packages/element`'s custom element; Astro's job here is just
  registering the client directive and passing props through — resist building
  Astro-specific rendering logic that would need duplicating for a future
  React/Vue/Svelte wrapper.
- `client:visible` as the documented default (a below-the-fold TL;DR strip shouldn't
  cost JS execution before it's scrolled to) but every client directive should work,
  since the element has no framework dependency.
- Ship `astro-blog` under `examples/` as the integration test: a real minimal Astro
  site, one post with a hand-authored 4-panel strip, built and previewed in CI.
- **This example is also the seed of the public demo/docs site**, deployed to
  **toonstrip.danielkimdev.com** (Astro, matching the tool's own MVP target — dogfooding
  the integration on its own marketing site). Grow `astro-blog` (or a purpose-built
  site) into that site rather than building something unrelated: same repo, same
  component, the demo *is* the proof the Astro integration works. The properly-designed
  version of this site, with an interactive playground, is M7 — deploy it at the end of
  M7, not before; a public URL before the API is stable and the site is actually
  designed just creates a page to keep rewriting.

## 8. Build-time static fallback (secondary, not MVP-blocking)

Because `renderPanel` is already canvas-context-agnostic (§4), the exact
`@napi-rs/canvas` harness pattern proven in the parent repo
(`web/tools/render-panel.ts`, and this session's `web/tools/render-tldr-core.ts`) ports
almost directly into `packages/cli` as `toonstrip render <doc.json> --out strip.png` —
useful for OG-image generation, RSS-feed embeds, and a no-JS `<noscript>` fallback
inside the custom element. Not required for the Astro MVP; sequence it after §7 if time
allows, not before.

## 9. Testing & quality bar

- Port the geometry-tests-without-canvas discipline from `web/test/figure.test.ts` /
  ADR 0008: layout, pose-selection, and balloon-wrap math should be testable in plain
  Node against the manifest alone, with pixel output tested separately and only where
  it earns its cost.
- A small **pixel/OCR regression gate** for text rendering is worth keeping from this
  session's own experience: this exact project just spent real effort tracking down a
  font-family collision that produced legible-*looking* tofu glyphs a human (and a
  vision model) misread as correct text at a glance. If the pack format ever embeds
  fonts or the element renders non-Latin scripts, add an OCR-based CI check for at least
  one non-Latin sample string — do not rely on visual review alone for glyph coverage.
- No parity corpus, no walkthrough replay, no golden-turn harness — none of that
  machinery has an equivalent here, because there is no game to replay.

## 10. Milestones

| # | Scope | Exit criteria |
|---|---|---|
| M0 | Repo bootstrap: `toonstrip` repo + `@toonstrip` npm org claimed, pnpm workspace, **MIT** `LICENSE`, `packages/schema` with the v1 document type + JSON Schema + validator, CI skeleton. | `pnpm test` runs (even with zero tests) on a clean checkout. |
| M1 | Port the rendering core (§4) into `packages/core`, driven by hand-written fixture documents, output checked by eye + a couple of pixel snapshots. No web component yet — a Node script is the only caller. | A fixture 3-panel document renders to PNG via `@napi-rs/canvas` with correct figures, balloons, backdrops. |
| M2 | Extract the default asset pack (§1, §6): port the 15-character roster **and** decode+pack the 3 original Comic Chat backdrop bitmaps (`field`, `pastoral`, `room8bs` — §1), write `pack.json`, carry forward the MIT notice per §13. Build `avb-import` only if re-conversion is actually needed; otherwise port the already-packed character sheets directly. | `pack-comic-chat` validates via `toonstrip pack validate`; M1's fixture renders using it (characters *and* a real backdrop) instead of ad hoc test assets. |
| M3 | `packages/element`: the custom element, ported responsive layout + canvas pool + ResizeObserver + a11y (§5). Plain-HTML demo page, no framework. | Resizing the browser window changes column count live, matching the ported `layoutStrip` policy; Lighthouse/axe a11y check passes on the demo page. |
| M4 | `packages/astro` + `examples/astro-blog` (§7). | A real Astro dev server renders a blog post with an embedded strip; `client:visible` defers JS as expected (verify in devtools). |
| M5 | Asset pack docs (`docs/packs.md`), schema docs, contribution guide, a second (small, original, non-Comic-Chat) example pack to prove the contract isn't secretly coupled to the default one. | An outside contributor (or a fresh agent session with no prior context) can follow the docs alone to add one new character and see it render. |
| M6 | v0.1.0: publish `@toonstrip/*` npm packages, write the README/landing example. | `npm install` + the README's copy-paste example works from a clean machine. |
| M7 | (Detailed in `SITE_DEV_PLAN.md` + `DESIGN.md`.) A properly designed introduction/marketing site with a live playground for the component (edit a `ComicStripDocument`, see it render), built on `examples/astro-blog` or a purpose-built Astro site. Deploy to **toonstrip.danielkimdev.com** at the end of this milestone (§7). | The subdomain is live, presents the project (not just a blog-post embed), and a visitor can interactively try the component in the playground without installing anything. |
| M8 | Vanilla HTML/JS + "any SSG" support (§13.1): a docs page and `examples/vanilla-html` proving `packages/element`'s custom element works with a bare `<script type="module">` import and no build step. | The example renders correctly opened directly from disk (`file://`) and from a static file server, with no framework and no bundler config. |
| M9 | Agent skill (§13.2): package the schema + validator + CLI usage into a distributable skill (e.g. a `SKILL.md`) that teaches an AI coding agent to author and validate a `ComicStripDocument` without guessing the shape. | A fresh agent session, given only the skill and a one-line request, produces a schema-valid document that renders correctly on the first `toonstrip pack validate` / render attempt. |
| M10 | `@toonstrip/react` (§13.3): thin wrapper around `packages/element`, same non-goal as §7 (no React-specific rendering logic). | A minimal Create React App / Vite+React example embeds a strip and updates it on prop change without a full remount. |
| M11 | `@toonstrip/vue` (§13.3): same pattern as M10, Vue's component wrapper conventions instead of React's. | A minimal Vue 3 (Composition API) example embeds a strip and updates it reactively. |
| M12 | `@toonstrip/next` (§13.4): wraps `@toonstrip/react` behind an App-Router-safe `'use client'` boundary; the first framework target where the server actually executes a render pass. | A Next.js App Router page embeds a strip with no server-side `document`/`window`/`customElements` errors and no hydration-mismatch warning. |
| M13 | General SSR support (§13.4): server-rendered placeholder (via `packages/cli`'s existing headless-canvas path, §8) swapped for the live canvas on hydration, plus SSR-safety guards in `packages/element` so importing it on the server never throws. | A Next.js (or Nuxt) SSR page shows the correct strip content in "view source" / with JS disabled, then upgrades to the live canvas once hydrated, with no visible layout shift. |
| M14 | `packages/asset-packager` (§14): a build tool that turns a directory of plain per-pose PNGs (drawn by hand or generated by an image model, following the asset image spec) into a valid toonstrip asset pack — validate, alpha-trim, pack into sheets, derive join anchors, emit `pack.json` + per-character manifests. No LLM or image model inside the package (§0 non-goals). Plus the image spec doc and a `SKILL.md` update teaching an agent to write conforming generation prompts and run the packager. | `toonstrip-pack build fixtures/source -o out` produces a directory that passes `toonstrip pack validate` and renders via `toonstrip render`, from PNGs that carry no rect table of their own. |
| M15 | Sheet input for `packages/asset-packager` (§15): a second input path where one generated image carries many assets — a character sheet (grid of face/torso cells) and a backdrop sheet (grid of whole scenes) — sliced, registered and validated into the same pipeline M14 built. Grid dimensions are declared per sheet, any rows × columns. Adds `toonstrip-pack template` to emit the reference sheet a reference-image model is prompted with, cross-cell consistency/duplication warnings, and per-asset overrides so a sheet and individual files can mix. Still no model inside the package. | Backdrop sheets of two different shapes (e.g. 2×2 and 4×3 with trailing cells unused) each slice into exactly the ids they declare, and a character sheet builds a character whose poses all register against its NEUTRAL cell; both pass `toonstrip pack validate` and render, with the per-pose path from M14 still working unchanged. |

Sequence M1→M4 in order; M5 can start once M2 lands (docs can be written against a
stable pack format before the element exists). Do not start M6 packaging concerns
before M4 (an Astro-embeddable proof is the MVP; npm publishing polish is not). M7 is
post-publish polish: it depends on M6's published packages but is not required to
close M6.

M8 and M9 have no dependency on each other or on M10 through M13, and can run in either
order or in parallel, once M7 is done (see §13.1 for why they're sequenced first). M10
and M11 are independent of each other but both depend on M3 (`element`) only, already
done. M12 depends on M10, since it wraps `@toonstrip/react` rather than `element`
directly. M13 depends on M12: it needs one real SSR framework target to build and
verify the pattern against before generalizing it, and reuses §8's static-render path
(already built and published in `packages/cli`) rather than inventing a second one.

M14 depends only on the pack format (§6, done) and is independent of M8 through M13.
M15 depends on M14: sheet input is a slicer bolted onto the front of M14's pipeline, and
building it first would mean designing that pipeline against the harder input.

## 11. Open decisions

All four items originally open here were resolved at kickoff (2026-09-01) — kept as a
record, not a task list:

- ~~**Project name** and npm scope.~~ → **toonstrip**, `@toonstrip/*`. Both unclaimed on
  npm as of this writing (checked 2026-09-01) — claim the org at M0 before publishing
  anything, since an unscoped name check doesn't reserve the scope.
- ~~**License.**~~ → **MIT**, repo-wide. Matches the underlying Comic Chat MIT grant
  directly (no Apache-2.0-vs-MIT translation to explain to contributors) and is the
  simpler choice for a small library aiming for easy adoption.
- ~~**Default backdrop art.**~~ → The historical Comic Chat client's own 3 bundled
  backdrops (`field`, `pastoral`, `room8bs` — §1), not newly generated art. Real,
  legally-clean, on-theme, and zero new art-direction work needed before M2.
- ~~**Hosting for a demo/playground site.**~~ → **toonstrip.danielkimdev.com**, built as
  part of the Astro integration itself (§7) rather than a separate site.

Still open, lower stakes, revisit whenever they become blocking rather than at M0:

- **Monorepo tooling**: pnpm workspaces alone is probably sufficient at this size;
  don't add Turborepo/Nx until build times justify the complexity.

## 12. Licensing & attribution requirements (carry forward from `grues-in-comic`)

Per that repo's `NOTICE`: the 15-character sprite sheets are Microsoft Comic Chat art,
**redistributed in converted form under the MIT License**, Microsoft's copyright
preserved. The 3 backdrop bitmaps (§1, added to the default pack per §11) are the same
situation — also original Comic Chat client assets, also MIT/Microsoft-copyright, not a
separate case. Porting either into the new repo requires:

- Keep a `NOTICE`/`THIRD_PARTY.md` in the new repo crediting Microsoft Corporation for
  the original Comic Chat avatar **and backdrop** art, MIT License, with the same
  trademark disclaimer pattern (COMIC CHAT is a Microsoft trademark; the new project is
  independent, unaffiliated, unendorsed).
- The MIT grant covers **copyright, not trademark** — this is exactly why the project
  is named `toonstrip` rather than something built on "Comic Chat" (see the naming
  discussion this plan's history records: a product *name* built on someone else's
  trademark is a materially different, riskier use than nominative reference to it in a
  NOTICE file).
- Zork/IR/engine code does not port (§1), so the Zork MIT notice does not carry over —
  only the Comic Chat one does, scoped to the character and backdrop art actually
  ported.
- The new repo's own license is MIT (§11) — the same license as the ported assets, so
  there is no license-compatibility translation to document, only the attribution
  notice above. Any newly authored backdrops or additional characters contributed later
  are this project's own IP under that same MIT default; keep pack-level `license`
  fields (§6) so a third-party pack can still carry a different license from core
  without ambiguity.

## 13. Framework reach & agent tooling (M8 through M13, post-launch)

Four items raised after M0 through M7 shipped: an agent skill for authoring documents,
wrapper packages for React/Vue/Next.js, an explicit vanilla HTML/"any SSG" story, and
SSR support. None of these reopen §0's non-goals: the agent skill teaches authoring
against the existing schema and CLI validator, it does not add an LLM call or a
content-generation feature into `core`.

Do this work before the Korean locale (`SITE_DEV_PLAN.md` §13, S9) rather than after,
for the same reason the playground UI renewal comes first: every item here adds at
least one new website docs page or example, and once `/ko/` exists that content has to
be written and kept in sync in two languages instead of one. Landing the English
content and the API shape first means S9 translates a finished target instead of a
moving one.

### 13.1 Vanilla HTML/JS and "any SSG" support (M8)

`packages/element` (§2, §5) is already a zero-framework-dependency Web Component; the
mission statement in §0 already claims this ("other frameworks, or plain HTML, can
consume it later without a rewrite"). Nothing in `core` or `element` needs to change.
The gap is proof and discoverability: there is no example showing a bare
`<script type="module">` import with no build step, and no docs page telling a reader
who is not using Astro that this is already supported. Ship `examples/vanilla-html`
(a single `.html` file, no bundler, opens from `file://` and from any static file
server) and a docs page describing the pattern. Smallest item on this list; sequence it
first because it is nearly free and de-risks nothing else.

### 13.2 Agent skill (M9)

Package `packages/schema`'s types, JSON Schema, and runtime validator, plus
`packages/cli`'s `toonstrip pack validate` / `toonstrip render`, into a distributable
skill (a `SKILL.md`, following the same shape as this repository's own project-level
skills) that teaches an AI coding agent the `ComicStripDocument` shape, the emotion-wheel
angle/intensity convention (§3), and how to validate a document before claiming it
works. No dependency on M8 or M10 through M13: the schema and CLI it teaches are already
stable and published. Small effort (mostly authoring and testing against a real agent
session, no new runtime code), independent track, can ship in parallel with M8.

### 13.3 Framework wrappers: React and Vue (M10, M11)

Both follow the §7 Astro pattern exactly: a thin package that mounts
`packages/element`'s custom element, forwards the `document`/`packs` props, and manages
its lifecycle idiomatically for the framework (a ref-based mount and prop-diffing
effect in React, a wrapper component using Vue's custom-element interop in Vue).
Neither adds rendering logic of its own, the same restraint §7 already calls out for
Astro. Medium effort each. They depend only on `packages/element` (M3, done) and are
independent of each other, but treat them as sequential work in one session or PR series
rather than parallel forks: the first one built (React, given its larger install base)
establishes the wrapper-testing pattern (an example app, a prop-change-without-remount
check) that the second one (Vue) should reuse rather than reinvent.

### 13.4 Next.js and general SSR support (M12, M13)

Next.js is a React framework, so `@toonstrip/next` wraps `@toonstrip/react` (M10) behind
an App-Router-safe `'use client'` boundary rather than reimplementing anything against
`element` directly. It is also the first framework target where a server actually
executes a render pass before the client does, so it is the natural place to first hit
(and fix) whatever breaks when `packages/element` is imported outside a browser:
`customElements`/`document` access needs to be guarded so the module does not throw on
the server, and the framework wrapper needs to decide what renders during that
server-only pass. Medium-large effort; depends on M10.

General SSR support (M13, the largest item on this list) generalizes that fix: instead
of a blank shell during the server pass, reuse §8's existing headless-canvas render path
(`packages/cli`, already built and published) to produce a real server-rendered
placeholder image of the strip, then swap it for the live canvas element on hydration.
This avoids both a content-less server response (bad for anything that reads
"view source", including some crawlers) and a layout shift on hydration. Sequence it
after M12, not before or in parallel with it: building it against Next.js first gives
one concrete, testable SSR target to prove the placeholder-then-upgrade pattern against
before writing it as a general mechanism other framework wrappers (Vue's Nuxt, a future
Svelte wrapper) can reuse.

## 14. Asset authoring pipeline (M14)

§6 fixed the pack *format* and gave it a validator, and M5 proved a human can follow
`docs/packs.md` to hand-author one. What it did not do is close the gap between "I have
drawings" and "I have a pack": the rect table, the sprite sheet, and the face/torso join
anchors are all still hand-written or scripted per pack (`pack-example`'s
`scripts/generate.mjs` is a one-off, not a tool). That gap is the practical barrier to
requirement 5, and it is worse now that the most likely source of new art is an image
model emitting one transparent PNG per pose.

`packages/asset-packager` (`@toonstrip/asset-packager`, bin `toonstrip-pack`) closes it.
Its contract has two halves:

**1. The asset image specification** (`docs/asset-image-spec.md`) — the rules an input
PNG must follow to be packable, stated tightly enough that both a human illustrator and
an image-generation prompt can hit them: fixed part canvas sizes, transparent
background, one pose per file, `<kind>-<EMOTION>[-<variant>].png` naming from
`EMOTION_NAMES`, the drawing placed so the join point (chin for a face, neck for a
torso) sits at a known spot in the canvas, hard-edged alpha, no shadows or gradients.

**2. The packager** — pure, offline, deterministic. No model call and no network of any
kind lives in this package: it consumes finished PNGs only, which keeps §0's "no AI
content generation" boundary intact. It validates every input against the spec (errors
for anything unpackable, warnings for anything that will render badly), alpha-trims each
part, shelf-packs the parts into one `sheet.png` per character, derives every
`PackedPart` field the format needs (`cx`/`cy` from the spec's join convention plus the
trim offsets; `angle`/`intensity` from the emotion name; `x` from the face's mouth
anchor), and writes the §6 output tree plus `NOTICE`/`README.md` — optionally an
installable npm package skeleton like `pack-example`'s.

Anchor derivation is the one place this can silently produce a valid-but-wrong pack: an
image model will not place a chin at an exact pixel. Two mitigations, both in scope:
per-part overrides in the source manifest, and `--preview`, which composites each
character's NEUTRAL join to a PNG so the author can see a floating or buried head
before shipping the pack.

The `SKILL.md` update (§13.2's skill, extended rather than a second skill) teaches an
agent the other direction of the same contract: how to turn "I want a character who
looks like X" into per-pose generation prompts that satisfy the spec, and then how to
run `toonstrip-pack validate`/`build` and read its diagnostics. The skill authors
prompts; the package never sees one.

## 15. Sheet input: one image, many assets (M15)

M14's input is one PNG per asset, which is the format an image model produces most
reliably — and it leaves two problems the packager cannot check:

- **Identity drift.** Nothing verifies that nine separately generated faces are the same
  character. Warnings catch a wrong canvas fill or a floating torso; no automated check
  catches "the hair changed colour in SAD and the line weight thinned in LAUGH".
- **Anchor placement.** Each pose's join is derived from its own drawing in isolation, so
  a pose drawn slightly high inherits a slightly wrong anchor. §14's mitigations
  (explicit anchors, marker pixels, `--preview`) are detection and manual repair, not
  prevention.

A **sheet** — one generated image holding a grid of labelled cells — attacks both,
because the assets are drawn in a single pass, in one coordinate system, at one scale.
Two kinds, sharing one slicer:

**Character sheet.** A grid of face and torso cells for one character. The model is
prompted with a *reference sheet* (`toonstrip-pack template`, emitted from an existing
pack: cell labels, guide lines for the chin and neck rules, registration marks) plus,
optionally, a reference image of the character, and asked to redraw the sheet as that
character. Consistency stops being a prompt-discipline problem: one pass, one style.

**Backdrop sheet.** A grid of complete scenes — many backdrops from one prompt and one
image. Cheaper and more coherent than generating each separately, and a pack's backdrops
*should* look like they came from the same world, which is exactly what a single-pass
sheet gives.

**The grid is declared, never fixed.** A pack might want two backdrops or twenty, so
every sheet carries its own dimensions: a backdrop sheet declares its ids in reading
order plus (optionally) a column count, and rows follow from the count — trailing cells
the ids do not reach are simply unused, which is also what makes a model's habit of
filling an awkward last row harmless. A character sheet declares a `layout`: an array of
rows of cell names, so its shape is whatever the author drew. Neither kind hard-codes 3×3
or any other shape, and a pack may declare several sheets of different shapes at once
(one 2×2 of interiors, one 4×3 of streets) alongside individually generated files.

What the packager has to do, none of which depends on the model hitting exact pixels:

- **Detect the grid, don't assume it.** Slice on the template's gutters and registration
  marks, with the declared layout as the expectation, not the measurement. Model output
  drifts in size, bleeds across gutters, and sometimes adds its own labels — a label
  band declared in the layout is cropped off, and a cell whose content spills into a
  gutter is a warning naming the cell.
- **Register cells against NEUTRAL.** Because every cell in a character sheet shares one
  scale, each pose can be aligned to the NEUTRAL cell by correlating alpha masks, so the
  join derived from NEUTRAL is *correct* for every pose rather than merely reused. This
  is the part the per-pose path cannot do at all.
- **Measure what was previously invisible.** Head/body bounding box size varying beyond a
  tolerance across cells means the model changed scale mid-sheet: a warning. Two backdrop
  cells that are near-identical (cheap downsampled hash) means the model repeated a
  scene: a warning.

Design constraints worth stating up front. Sheet mode is a **second input path, not a
replacement** for M14's per-pose files: a hand illustrator wants individual files, and a
sheet costs resolution, and the more cells the grid has the more it costs — a 3×3 grid at
a model's output cap lands around 512px per cell (fine against the default 256px `cell`,
thinner than a dedicated 1024px face), while a 5×4 of the same output is down near 300px.
Cell resolution is therefore a validation concern in its own right: the packager knows
`spec.cell` and can say plainly when a declared grid cannot carry it.
So the two must mix: a `source.json` may declare a sheet *and* per-pose files that
override individual cells, which is also the hybrid workflow worth documenting (generate
a sheet to lock identity, then regenerate a weak face using that sheet as the reference).
Everything after slicing — validation, packing, join derivation, `--preview` — is M14's
pipeline unchanged; a sliced cell enters it as if it had been a file all along.

The `SKILL.md` section from M14 gains the two-reference prompt pattern (template for
layout, character reference for identity) alongside the per-pose one. As in M14, the
skill authors prompts and the package never sees one.
