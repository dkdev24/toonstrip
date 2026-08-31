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
