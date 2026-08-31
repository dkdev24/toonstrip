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
