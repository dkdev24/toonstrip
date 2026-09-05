# Over-engineering audit — 2026-09-04

A repo-wide scan for complexity to cut: dead code, hand-rolled stdlib, single-implementation
abstractions, unused deps. Scope is over-engineering **only** — correctness bugs, security and
performance were explicitly out of scope and are not covered here.

Baseline at audit time: ~16,600 lines across 175 source files (`.ts/.tsx/.astro/.vue/.mjs`,
excluding `node_modules`, `dist`, `.astro`, `.next`).

Findings are ranked by lines removed. Tags: `delete` (dead or
speculative), `stdlib` (hand-rolled standard library), `native` (duplicating the platform or an
existing dep), `yagni` (abstraction with one implementation), `shrink` (same logic, fewer lines).

## Progress

**43 of 46 applied (4 partial — see notes; the remaining 3 are #3/#6/#7, verified stale on
re-check, not cut). ~700 generated lines and 7 deps fully dropped (2
more moved to devDeps, 4 demoted), plus one published package (`@toonstrip/next`) deprecated;
~1,109 hand-written lines still on the table.** A row marked **done** in the table below is
landed and the build is green; everything else is untouched.

| Date | Item | What landed | Commit |
|---|---|---|---|
| 2026-09-05 | #14 † | Deleted `selectPose`, `selectBody`, `nearestGated` from `pose.ts` (zero callers repo-wide, confirmed via grep) plus the now-unused `ANGLE_TOLERANCE`/`NEMOTIONS`. ~68 lines removed. **Not portable to `grues-in-comic`**: its pose selection lives in a separate untracked package (`art/src/pose.ts`), out of `UPSTREAM_SYNC.md`'s documented file map — though the same three functions do appear to have zero callers there too, that's a note for that repo's own maintenance, not this port | (this commit) |
| 2026-09-05 | #16 † | Deleted `PanelTrace`, `RenderOptions.trace`, and `drawBalloons`' `trace` param/write-sites from `render.ts` (zero callers, zero test coverage). **Not portable to `grues-in-comic`**: its `trace`/`PanelTrace` is real, wired-up functionality there (`trace.stacked`, `trace.bodies`, `trace.balloons` are actually populated in its render path) — toonstrip's copy is dead only because toonstrip never grew a consumer for it | (this commit) |
| 2026-09-05 | #19 † | Deleted the `BalloonMetrics` interface + `canvasMetrics` factory from `balloon-layout.ts`; `BalloonInput` now carries `kind`/`ctx` directly, 6 call sites call `chromeFor`/`measureAtWidth`/`splitHeight`/`widestWord` directly. `packages/core/test/balloon-layout.test.ts` updated (9 construction sites). **Not portable to `grues-in-comic`**: it never had this injection abstraction — it already calls the `balloon.ts` functions directly, so there's nothing to converge | (this commit) |
| 2026-09-05 | #28 † | Inlined `orderBodies` into its one caller `layoutAvatars` in `render.ts` — a plain `bodies.map((_, i) => n - 1 - i < i)`. **Nothing to port**: `grues-in-comic`'s `orderBodies` is a genuinely different, non-trivial N-body implementation (real flip-state computation), not the trivial wrapper toonstrip had; the two already diverged | (this commit) |
| 2026-09-05 | #37 | `text.split(/\s+/).filter((w) => w.length > 0)` → `text.match(/\S+/g) ?? []`, five sites in `balloon.ts`. **Ported to `grues-in-comic`** (same 5-site pattern in its `web/src/comic/balloon.ts`) — `typecheck`/`test` (391 green) and `gate`/`density` both confirm zero diff, no ADR needed (no divergence, verified byte-identical tokenization) | `232d49e`, grues-in-comic (uncommitted, pending your OK) |
| 2026-09-05 | #46 | `sheetImage()` (a 4th copy of "draw a labelled grid sheet") replaced with a new shared `sheet()` in `draw.mjs`, generalized to cover both `make-sheet-fixture.mjs`'s labelled/jittered/skip-blank usage and the test's simpler unconditional-grid usage (unifying required two real bugs to be caught and fixed first: a blank-cell-skip that dropped the gutter box too, and an out-of-range vs in-range-null distinction). Fixture regenerated and diffed byte-identical against the committed fixtures; 32/32 package tests green | (this commit) |
| 2026-09-05 | #8 | `resizable.tsx`'s Context/`register()`-by-render-order indirection (a `sizes: [number,number]` array threaded per-panel) replaced with a 3-track CSS grid (`var(--split) auto 1fr`); panels no longer need their own size or index, only a `minSize` registered by render order. Two real bugs caught during the rewrite, not just refactored around: CSS Grid needs a track for the handle too (3 DOM children, not 2 — an earlier 2-track attempt auto-placed the handle and panel 2 into the same implicit column); and the shared `.grid` utility class collides with this component's own literal `"grid"` class name, inheriting an unwanted 24px gap (`display:grid` now set inline instead). Verified in a real browser (`agent-browser`): keyboard resize (arrows/shift/home/end) and pointer drag both confirmed live-correct via direct DOM inspection, screenshot shows correct panel proportions. All 8 Playwright specs green, including the one asserting a pixel-perfect 150px drag delta — the actual regression signal that caught the grid-track bug | (this commit) |
| 2026-09-05 | #12 | `json-position.ts`'s hand-written JSON scanner replaced with a walk over `@codemirror/lang-json`'s own parse tree by JSON-pointer segment; ~41 lines net removed. Verified against `@toonstrip/schema`'s real validator output (missing-required, bad-enum, wrong-type-nested, additional-property cases) — every `instancePath` resolved to the same line as the old scanner. All 8 Playwright playground specs green, including the one exercising this path directly | (this commit) |
| 2026-09-04 | #31 | Deleted `site/src/components/ui/scroll-area.tsx` (zero importers) and dropped `@radix-ui/react-scroll-area` from `site/package.json`; lockfile updated, `pnpm build` green, 23 pages built | `ee908f8` |
| 2026-09-04 | #42 | Dropped the `codemirror` meta-package from `site/package.json`; all six `@codemirror/*` scoped packages the editor imports stay declared. `pnpm install` removed 3 packages, `pnpm build` green | (this commit) |
| 2026-09-05 | #29 | `class-variance-authority` replaced with two `Record` lookups in `button.tsx`; dep dropped | `5413998` |
| 2026-09-05 | #41 | `@toonstrip/schema` dropped from astro, demoted to devDeps in react/vue/next | `5413998` |
| 2026-09-05 | #40 | `@napi-rs/canvas` moved to devDeps in core | `5413998` |
| 2026-09-05 | #44 | Dead `theme-change` CustomEvent dispatch removed (no listeners) | `5413998` |
| 2026-09-05 | #11 (partial) | `kitchen-sink.astro` + sitemap filter deleted; `collapse` prop kept — used by 7 docs, audit's "only user" claim was stale | `5413998` |
| 2026-09-05 | #5 | `element/demo/` + `verify-demo.mjs` deleted, `playwright`/`axe-core` devDeps dropped | `5413998` |
| 2026-09-05 | #32 | Dead CSS selectors/tokens removed from site styles | `5413998` |
| 2026-09-05 | #2 | `--npm` pack-skeleton emitter deleted | `5413998` |
| 2026-09-05 | #13 | `asset-packager` `index.ts` barrel narrowed to used exports | `5413998` |
| 2026-09-05 | #10 | `make-fixture.mjs`/`make-sheet-fixture.mjs` share `scripts/draw.mjs` | `5413998` |
| 2026-09-05 | #21 | `body` part-kind pipeline cut, `bodies: []` emitted directly | `5413998` |
| 2026-09-05 | #22 | `rasterOf` duplicates replaced with shared `readPng`/`resizeRaster` | `5413998` |
| 2026-09-05 | #25 | `init.ts` folded into `bin.ts` | `5413998` |
| 2026-09-05 | #26 | Hand-rolled PNG IHDR parser replaced with `@napi-rs/canvas`'s `loadImage` | `5413998` |
| 2026-09-05 | #36 | `directories()` uses `readdirSync(dir, { withFileTypes: true })` | `5413998` |
| 2026-09-05 | #30 | `grid.ts`'s inlined `toCanvas` duplicates replaced with the shared helper | `5413998` |
| 2026-09-05 | #27 | `expandSheets`' two near-identical loops merged into one helper | `5413998` |
| 2026-09-05 | #35 | Hand-rolled bigint popcount replaced with a bit-string diff | `5413998` |
| 2026-09-05 | #9 (partial) | `examples/react-vite` + `vue-vite` share `examples/strips.ts`; full app merge left for a product call | `6c48463` |
| 2026-09-05 | #15 | 3 copies of `copy-pack-assets.mjs` merged into `examples/copy-pack-assets.mjs` | `6c48463` |
| 2026-09-05 | #17 | Undo/redo rewritten as `past`/`future` signals + one `travel()` | `6c48463` |
| 2026-09-05 | #18 | `layout.ts`: `cellFor`, `maxColumns`, `columnsFor` abstraction inlined — **toonstrip side only, upstream port to `grues-in-comic` still pending** | `6c48463` |
| 2026-09-05 | #20 | `className`/`cls` double-prop dance dropped across `site` `ui/*` | `6c48463` |
| 2026-09-05 | #23 | `emotion.ts`'s `Emotion` re-exported from `@toonstrip/schema`, dead `EmotionName` removed | `6c48463` |
| 2026-09-05 | #24 | Dead `<comic-strip src>` attribute plumbing removed | `6c48463` |
| 2026-09-05 | #33 (partial) | `Slider` array API, `SheetContent`'s unused sides, `WidthSlider`/`PackageManagerTabs` unused props trimmed; `collapse` and React wrapper's `className`/`style` kept — both still used | `6c48463` |
| 2026-09-05 | #34 (partial) | `useMediaQuery`, `PaneBar` inlined; `tag-name.ts` kept — documents a real SSR isolation boundary | `6c48463` |
| 2026-09-05 | #38 (partial) | `copyCycles` hoisted to `figure.ts`; `normalizeAngle` simplified to `atan2(sin,cos)`; `readJson` and the part-sort comparator de-duplicated. `fail()`/`touches()` kept — already minimal. **`normalizeAngle`'s upstream port checked, not applicable**: `grues-in-comic`'s equivalent lives in its own untracked `art/src/pose.ts`, same as #14 — out of `UPSTREAM_SYNC.md`'s file map, no port needed | `6c48463` |
| 2026-09-05 | #39 (partial) | `AlphaStats.opaque`, `TemplateResult.labelBand`, `gridBoundaries`' `profiles` removed; unused `maxShift`/`tolerance`/`ring` defaults trimmed; `leftover`/`DOCK_DELTA`/`LARGE` kept — still read by tests or intentional | `6c48463` |
| 2026-09-05 | #43 (partial) | `packRoot`, `defaultPackDir`, `PopoverAnchor`, `SheetTrigger`, `SheetClose` dropped; `MAX_HASH_LENGTH`, the `columns` getter, `Diagnostic`/`image.ts` re-exports kept — still used | `6c48463` |
| 2026-09-05 | #45 | `spriteStyle`/`Sprite.astro` crop math shared via `site/src/lib/sprite-crop.ts` | `6c48463` |
| 2026-09-05 | #1 | ajv+esbuild standalone-compile pipeline replaced with `scripts/embed-schema.mjs` (bakes `schema.json` into a TS literal) + a ~50-line hand-rolled recursive checker in `validate.ts`. `ComicStripValidationError.issues` shape (`instancePath`/`message`) verified byte-for-byte against ajv's old output for missing-required/bad-enum/additional-property/minLength cases | `f91aa64` |
| 2026-09-05 | #4 | `@toonstrip/react`'s `<ComicStrip>` now carries its own `"use client"`; `@toonstrip/cli` exports `renderPlaceholder` directly. `@toonstrip/next` kept as a backward-compatible re-export shim (already published), marked `[DEPRECATED]`, version bumped. `examples/next-app` migrated to the new imports and verified end-to-end — built, started, checked in a browser (real SSR PNG placeholder, no errors). `docs/next.md`/`next-reference.mdx` rewritten as migration guides; also fixes the pre-existing `kind="warn"` Callout bug the audit found. **Published** as `react@0.1.2`/`cli@0.2.3`/`next@0.1.1` and verified with a clean-room `npm install` outside the workspace — see `WORKLOG.md`'s v0.15.2 entry for the publish incident (a broken first attempt, deprecated) and two pre-existing bugs (`element@0.1.8`, `vue@0.1.0`) it surfaced, still open | `9668530`, `68e61db` |

**Verified stale on re-check, not cut:** #6 (`pack-example` has a real external test importer,
`core/test/pack-example.test.ts`), #7 (pack `types.ts` is deliberately schema-only per
`TOONSTRIP_DEV_PLAN.md:92-93`, not a stray core copy), **#3** (false positive, confirmed via
user decision 2026-09-05 — see below, keep `measureBalloon`/`goalWidth`/`stackBalloons` as
public API and load-bearing fallback, permanently, not just deferred).


**#3 — closed, not a cut (2026-09-05):** not the safe cleanup the audit described. Two problems
surfaced on inspection:
1. `measureBalloon`/`goalWidth` (and their constants) are re-exported from `packages/core/src/
   index.ts`'s public barrel and have their own dedicated 6-test `describe` block in
   `balloon.test.ts` testing them as general-purpose text measurement, independent of the
   stacked-balloon path. Deleting them is an API break, not a cleanup — `AREA_FUDGE`/
   `ONE_LINE_THRESHOLD` also turned out to have a second, surviving caller (`getCloudEstimate`)
   the audit's "loses its last caller" framing missed.
2. The suggested fix — "let `forceFitBalloon` cover the `!balloon` case for any index" — is
   underspecified. `inputs.length === 1` already forces `i === 0` on the loop's only iteration,
   so that guard clause is a genuine no-op simplification; but extending it to a mid-panel
   failure in a *multi*-balloon panel means `forceFitBalloon` (which discards every other input
   and returns a one-balloon result) would silently drop the balloons already placed. Making
   that correct means redesigning the fallback, not refactoring it.
3. Separately, in `grues-in-comic`: `docs/PITFALLS.md` documents a real pinned gate case
   (`mob4-p02`) that falls back to `stackBalloons` today, and the maintainer spent two recent
   sessions (v0.33.6/v0.33.7 there) fixing bugs *in* that exact fallback path, explicitly
   reverting a related toonstrip fix because it regressed a baseline. The fallback is live and
   deliberately maintained there — not a candidate for deletion regardless of what toonstrip
   decides.

Untouched: `stackBalloons`, `speakerCorridor`, `clearOfFaces`, `HeadGeometry.faces`,
`measureBalloon`, `goalWidth`, `TARGET_ASPECT`, `WIDTH_BIAS`, `LayoutResult`, the
`layoutBalloons` guard. **User decision (2026-09-05): leave as-is.** `measureBalloon`/
`goalWidth` stay public API; `stackBalloons` stays the fallback engine, in both repos. Not
deferred — closed.

**#14, #16, #19, #28 — landed toonstrip-side, verified not portable to `grues-in-comic`
(2026-09-05):** see the Progress table above for the per-item reasoning (each checked against
the actual sibling repo, not assumed) — none needed a matching change there.

**#42's verification caveat resolved (2026-09-05):** `site`'s Playwright suite (`pnpm test:e2e`)
was never a code bug — Astro 7's `astro preview` always forks a detached background daemon and
exits immediately, which Playwright's `webServer.command` can't track as a foreground process
(reports "exited early"). `site/scripts/test-e2e.mjs` now starts the daemon itself, waits for it
to answer, runs Playwright with `reuseExistingServer: true` (which sees it already up and never
spawns `command`), then always stops the daemon after. `playwright.config.ts` also moved off port
4321 (Astro's own default) to a repo-specific `43210`, since a stale daemon from an unrelated
project on this machine was squatting on 4321 and got silently reused. All 8 specs pass now.

## Two standing caveats

- **† = upstream-shared.** `packages/core/src/{balloon,balloon-layout,figure,pose,layout,render}.ts`
  are deliberately duplicated with `grues-in-comic` (see `UPSTREAM_SYNC.md`). A cut there is two
  edits, not one. Roughly 264 lines of the total carry that cost.
- **‡ = already published.** `@toonstrip/next` is on npm. Removing it is a deprecation with a
  migration note, not a delete.

## Verification status

Spot-checked directly during the audit: no consumer outside `packages/core` references
`stackBalloons`, `selectPose`, `selectBody` or `trace`; `scroll-area.tsx` is self-referential
only; the `codemirror` meta-package is never imported; `class-variance-authority`,
`@radix-ui/react-scroll-area` and `codemirror` are all declared in `site/package.json`. The
remaining findings come from four area passes (core+schema, asset-packager, wrappers+CLI, site)
and each names a path — re-verify before cutting.

## Ranked findings

| # | Tag | Cut | Replacement | Path | Saves |
|---|---|---|---|---|---|
| 1 | native | `ajv` + `esbuild` + the standalone-validator build step, for a 6-definition schema | A recursive check over `schema.json`, ~40 lines. The only consumer reads `issue.instancePath` and `issue.message` | `packages/schema` | ~700 generated, 2 deps |
| 2 | yagni | `--npm` pack-skeleton emitter: a build tool writing a `package.json`/`tsconfig`/loader as string literals, only caller is its own test | Nothing — a pack directory already loads by path (`--pack ./my-pack`) | `packages/asset-packager/src/templates.ts:54-255`, `build.ts:125-130`, `bin.ts:98` | ~215 |
| 3 † | delete | `stackBalloons` fallback balloon engine + `speakerCorridor` + `clearOfFaces` + `HeadGeometry.faces`, and the `measureBalloon`/`goalWidth`/`TARGET_ASPECT`/`WIDTH_BIAS`/`AREA_FUDGE` that then lose their last caller | Let `forceFitBalloon` cover the `!balloon` case for any index, not just `i === 0 && inputs.length === 1`; `LayoutResult` collapses to one variant. No test exercises the stacked path | `packages/core/src/render.ts:549-726`, `balloon-layout.ts:104,181`, `balloon.ts:86-161` | ~200 |
| 4 ‡ | yagni | `@toonstrip/next` — a published package for a `"use client"` directive plus `toString("base64")` | Directive at the top of `packages/react/src/ComicStrip.tsx`; `renderPlaceholder` moves to `@toonstrip/cli`, which already owns `renderDocument` | `packages/next` | ~200, 1 published pkg, 3 deps |
| 5 | delete | `packages/element/demo/` + `scripts/verify-demo.mjs` — duplicates `examples/vanilla-html`, not run by CI, still CDN-pins a removed `ajv` | Nothing; drops the `playwright` + `axe-core` devDeps and the `verify:demo` script | `packages/element` | ~180, 2 deps |
| 6 | delete | `packages/pack-example/src/` — byte-identical to `pack-comic-chat`'s, zero importers outside its own test; the pack is consumed as data | A data-only package: `pack.json` + art + NOTICE, no `src/`, no build/lint scripts | `packages/pack-example` | ~140, 2 devDeps |
| 7 | delete | Both packs' `types.ts` re-declare types `@toonstrip/core` already exports (a 4th copy in `asset-packager/src/templates.ts`, a 5th partial in `cli/src/pack-validate.ts`) | `export type { ... } from "@toonstrip/core"` | `packages/pack-*/src/types.ts` | ~126 |
| 8 | delete | `resizable.tsx` — a 176-line split-pane engine with a Context and a `register()` that assigns panel indices by render order, supporting exactly two panels | CSS grid `grid-template-columns: var(--split) 1fr`, one `pointerdown`→`pointermove` handler, keep the existing `role="separator"` keyboard block | `site/src/components/ui/resizable.tsx` | ~120 |
| 9 | delete | `examples/react-vite` and `examples/vue-vite` are one app twice; `strips.ts` differs by two string literals | Keep one; let `vue-reference.mdx` carry the Vue snippet. At minimum share `strips.ts` | `examples` | ~110, 1 workspace pkg |
| 10 | delete | `make-fixture.mjs` and `make-sheet-fixture.mjs` draw the same face/torso/scene geometry with nudged constants; `write()` is byte-identical | One shared `scripts/draw.mjs` | `packages/asset-packager/scripts` | ~90 |
| 11 | delete | `kitchen-sink.astro` — nothing links it, sitemap-excluded; the sole user of `CodeAndStrip`'s `collapse` prop and of the sitemap `filter` | Nothing | `site/src/pages/kitchen-sink.astro`, `site/astro.config.mjs:36` | ~90 |
| 12 | stdlib | `json-position.ts` — a hand-written JSON scanner (own `peek`/`advance`/`skipWs`/`readString`, manual line counting) mapping an ajv `instancePath` to a line | `@codemirror/lang-json` is already a dep and already parsed that text: walk `syntaxTree(view.state)` by pointer segment, then `state.doc.lineAt(node.from).number` | `site/src/lib/playground/json-position.ts` | ~70 |
| 13 | delete | Six zero-caller exports kept alive by `export *`: `averageHash`, `meanUniformity`, `readPng`, `pngSize`, `partsOfKind`, `SPEC_VERSION` | Narrow the barrel to `analyze`, `buildPack`, `initSource`, `renderTemplate` + types | `packages/asset-packager/src/index.ts` | ~64 |
| 14 † | delete | `selectPose`, `selectBody`, `nearestGated` — zero callers; `figureFor` uses `selectComplexPose` | Nothing | `packages/core/src/pose.ts:58-92,152-179` | ~55 |
| 15 | delete | Three `copy-pack-assets.mjs` differing by one comment line | One shared `examples/copy-pack-assets.mjs` | `examples/*/scripts` | ~43 |
| 16 † | yagni | The `trace` / `PanelTrace` output channel — never passed by any caller, threads a param through `drawBalloons`. `RenderOptions` then has one field | Nothing | `packages/core/src/render.ts:112-136,193-198,413-451` | ~36 |
| 17 | shrink | Undo/redo: two plain arrays mirrored into two hand-maintained boolean signals, plus two near-identical 15-line functions | `past`/`future` as signals, `canUndo`/`canRedo` computed, one `travel(from, to)` | `site/src/lib/playground/state.ts:66-131` | ~30 |
| 18 | delete | `cellFor` (test-only caller), `columnsFor` (one caller, two lines), `LayoutOptions.maxColumns` (never set by any of six call sites) | Inline `columnsFor`; `MAX_COLUMNS` becomes a private const | `packages/core/src/layout.ts` | ~30 |
| 19 † | yagni | The `BalloonMetrics` injection interface — one implementation (`canvasMetrics`) that forwards to five `balloon.ts` functions | Pass `(ctx, balloon, scale)` and call them directly | `packages/core/src/balloon-layout.ts:44-56,80-92` | ~28 |
| 20 | shrink | The `className, class: cls` double-prop dance repeated in all 12 `ui/*` components, each ending `cn(…, className, cls)` | Preact accepts `class`, and call sites already use it. Pick one name | `site/src/components/ui/*` | ~25 |
| 21 | yagni | The `body` part kind — packed but never composited (the packager's own warning says so), every shipped manifest has `"bodies":[]` | Keep `bodies: []` in the emitted `PackedAvatar`, cut the pipeline | `packages/asset-packager/src/{spec,validate,pack,sheet}.ts` | ~22 |
| 22 | native | Three private `rasterOf` decoders for one `@napi-rs/canvas` call; `sheet.ts`'s is character-for-character `readPng` | `readPng` / `resizeRaster`, which already short-circuit | `packages/asset-packager/src/{sheet,measure}.ts` | ~22 |
| 23 | delete | `Emotion` re-declared in core, field-for-field identical to schema's; `EmotionName` unreferenced; `emotionAngle` is `EMOTION_ANGLES[i] ?? 0` | Re-export from `@toonstrip/schema`, which core already depends on | `packages/core/src/emotion.ts` | ~20 |
| 24 | yagni | `<comic-strip src="...">` has zero users — no example, demo, site page or test sets it | Drops `observedAttributes`, `attributeChangedCallback`, `#loadFromSrc`; callers already set `.document` | `packages/element/src/comic-strip-element.ts:112-159` | ~20 |
| 25 | yagni | `init.ts` — a 39-line file exporting one function with one caller, plus an `InitResult` and a `skipped` array read only by a console line | Fold into `bin.ts` | `packages/asset-packager/src/init.ts` | ~20 |
| 26 | stdlib | Hand-rolled PNG IHDR parser (signature check + two `readUInt32BE`) | `@napi-rs/canvas` is already a cli dep; `loadImage(path)` gives `.width`/`.height` | `packages/cli/src/png-dimensions.ts` | ~16 |
| 27 | shrink | `expandSheets` runs the same shape twice (character loop, backdrop loop): exists → diagnostic → slice → spread → merge → catch | One helper taking `(path, file, label, slice)` | `packages/asset-packager/src/analyze.ts:37-88` | ~15 |
| 28 † | shrink | `orderBodies` — a 9-line doc comment over the expression `n - 1 - i < i`, one caller | Inline into `layoutAvatars` | `packages/core/src/render.ts:231-246` | ~15 |
| 29 | deps | `class-variance-authority` for one `cva()` call whose `outline` variant and `default` size are never used, and whose `buttonVariants` export is imported nowhere | Two `Record<string,string>` lookups fed to the existing `cn()` | `site/src/components/ui/button.tsx` | ~15, 1 dep |
| 30 | native | `toCanvas` inlined by hand three times inside `grid.ts` (`createCanvas`→`createImageData`→`data.set`→`putImageData`) | `toCanvas(raster)`, already exported from `image.ts:147` | `packages/asset-packager/src/grid.ts` | ~12 |
| 31 | delete | **done** — `scroll-area.tsx` had zero importers; the only reference to `@radix-ui/react-scroll-area` was inside the file itself | Nothing | `site/src/components/ui/scroll-area.tsx` | ~33, 1 dep |
| 32 | delete | Dead CSS: `.pg-statusline`, `.button--icon`, `.grid--2`, the `[data-spike]` selectors left from deleted spike pages, tokens `--dur-base`/`--space-128` | Nothing | `site/src/styles/*` | ~20 |
| 33 | yagni | Small unused surface: `CodeAndStrip`'s `collapse` + excerpt machinery, `Slider`'s array API for one single-number caller, `SheetContent`'s three unrendered sides, `WidthSlider`'s `min`/`max`/`packs`, `PackageManagerTabs`' `dev`, React's never-set `className`/`style` | Nothing | `site/src/components`, `packages/react` | ~45 |
| 34 | yagni | Single-caller wrappers: `useMediaQuery` (one constant query), `PaneBar` (one call site, `children` never filled, markup hand-inlined in `JsonEditor` anyway), `packages/astro/src/tag-name.ts` (8 lines wrapping one string) | Inline each | `site/src/components/playground`, `packages/astro` | ~26 |
| 35 | shrink | Hand-rolled bigint popcount as a shift-and-test loop | `(a ^ b).toString(2).replaceAll("0", "").length` | `packages/asset-packager/src/grid.ts:404-412` | ~8 |
| 36 | stdlib | `directories()` stats every entry to ask if it is a directory | `readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory())` | `packages/asset-packager/src/source.ts:147-152` | ~4 |
| 37 | stdlib | `text.split(/\s+/).filter((w) => w.length > 0)` repeated six times | `text.match(/\S+/g) ?? []` — one call, no leading-empty guard | `packages/core/src/balloon.ts` | ~6 |
| 38 | shrink | Misc one-liners: `fail(errors, msg)` wrapping `Array.push` (12 call sites), `copyCycles` duplicated verbatim in element and cli, `normalizeAngle`'s 8-branch ladder → `Math.atan2(Math.sin(v), Math.cos(v))`, `readJson<T>` (one call site), the four-clause part-sort comparator copy-pasted, `touches()` destructured straight into four `if`s | Inline or hoist once | `packages/{cli,element,core,asset-packager}` | ~35 |
| 39 | delete | Computed-but-never-read fields and never-passed optional params: `AlphaStats.opaque` (accumulated in the hot per-pixel loop), `TemplateResult.labelBand`, `gridBoundaries`' `profiles`, `LayoutResult.leftover`, `DOCK_DELTA = 0`, `const LARGE = Infinity`, and the defaults `maxShift`/`edge`/`tolerance`/`window`/`ring` that no call site exercises | Nothing | `packages/asset-packager`, `packages/core/src/balloon-layout.ts` | ~28 |
| 40 | deps | `@napi-rs/canvas` is a runtime dep of `@toonstrip/core` but imported only from `test/` and `examples/` — every browser consumer downloads a native binary | `devDependencies` | `packages/core/package.json:20` | 1 line, large install win |
| 41 | deps | `@toonstrip/schema` is a declared dep of `@toonstrip/astro` but never imported, and a runtime dep of react/vue/next used only via `import type` | Drop from astro; demote to devDeps in the three wrappers | `packages/{astro,react,vue,next}` | 4 dep entries |
| 42 | deps | **done** — the `codemirror` meta-package is never imported — every import is a scoped `@codemirror/*` already listed separately | Drop | `site/package.json:48` | 1 dep |
| 43 | delete | Unexported-worthy or unused exports: `packRoot` (zero callers in both packs), `defaultPackDir` on the CLI's public index, `PopoverAnchor`, `SheetTrigger`, `SheetClose`, `ScrollBar`, `buttonVariants`, `MAX_HASH_LENGTH`, the element's `columns` getter (test + deleted demo only), `validate.ts`'s pass-through re-export of `Diagnostic`, `image.ts` re-exporting `createCanvas`/`loadImage` | Nothing, or import from source | `packages/*`, `site/src` | ~25 |
| 44 | delete | The `theme-change` CustomEvent is dispatched and nobody listens (no `addEventListener` in `site/` or `packages/`) | Drop the dispatch and the contract paragraph | `site/src/components/site/ThemeToggle.astro:28` | 2 |
| 45 | delete | `spriteStyle()` in `PanelForm` duplicates `Sprite.astro`'s crop math line for line | One shared helper | `site/src/components/playground/PanelForm.tsx:31-41` | ~10 |
| 46 | shrink | `sheetImage()` in `sheets.test.ts` is a fourth copy of "draw a labelled grid sheet on white with painted gutters" | Import the shared `sheet()` once #10 lands | `packages/asset-packager/test/sheets.test.ts:37-72` | ~35 |

**net: -2,400 lines hand-written, -700 generated, -9 deps, -1 published package, -2 workspace packages possible.**

## Explicitly not cut

- `packages/asset-packager/src/preview.ts` (103 lines, one caller): the only defence against a
  valid-but-wrong join, and its local copy of core's join arithmetic is justified in its header.
- `sceneSignature` / `sameScene`: the duplicate-cell warning has a real test asserting distance 0
  on the fixture.
- The `react`/`vue`/`astro` client wrappers: all three only assign `.document`/`.packs` onto the
  element and carry no rendering logic. That is the right thickness. `next` (#4) is the outlier.

## Suggested order

1. Dependency and dead-file cuts first — ~~#31~~, ~~#42~~, #29, #41, #40, #11, #5, #44. No behaviour
   change, no upstream sync, immediate install-size win.
2. Then the packager cuts (#2, #13, #10, #21, #22, #25) — one package, full test coverage.
3. Then the schema rewrite (#1), the biggest single win, gated on keeping the
   `ComicStripValidationError.issues` contract the playground reads.
4. Upstream-shared core cuts (#3, #14, #16, #19, #28) last, in one batch, ported to
   `grues-in-comic` in the same pass per `UPSTREAM_SYNC.md`.
5. `@toonstrip/next` (#4) is a product decision, not a cleanup: it needs a deprecation note and a
   migration line in `docs/next.md`, so it does not belong in a tidy-up commit.

## Out of scope, found while verifying

`site/src/content/docs/next-reference.mdx:57` passes `kind="warn"` to `Callout`, which is outside
the `"note" | "tip" | "warning" | "danger"` union — it renders an unstyled `.callout--warn`.
