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

**2 of 46 applied. ~33 lines and 2 dependencies cut; ~2,367 hand-written lines, ~700 generated
and 7 deps still on the table.** A row marked **done** in the table below is landed and the
build is green; everything else is untouched.

| Date | Item | What landed | Commit |
|---|---|---|---|
| 2026-09-04 | #31 | Deleted `site/src/components/ui/scroll-area.tsx` (zero importers) and dropped `@radix-ui/react-scroll-area` from `site/package.json`; lockfile updated, `pnpm build` green, 23 pages built | `ee908f8` |
| 2026-09-04 | #42 | Dropped the `codemirror` meta-package from `site/package.json`; all six `@codemirror/*` scoped packages the editor imports stay declared. `pnpm install` removed 3 packages, `pnpm build` green | (this commit) |

**Caveat on #42's verification:** `site`'s Playwright suite (`pnpm test:e2e`) fails all 8
playground specs, and it fails identically on a clean tree at `ee908f8` — pre-existing, not
caused by these cuts. So the CodeMirror editor's *runtime* behaviour after #42 is covered by the
production build only, not by a passing browser test. Fixing that suite is the prerequisite for
confidently doing #12 (the `json-position.ts` rewrite), which touches editor internals.

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
