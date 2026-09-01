# WORKLOG.md

Persistent project history. Append entries; do not edit past entries.

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
