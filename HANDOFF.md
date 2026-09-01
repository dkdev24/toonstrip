# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.7.2** (published)

---

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data. Extraction + generalization of `grues-in-comic`'s comic pane,
stripped of Zork/game/AI-inference coupling. M0–M6 done: all 7 `@toonstrip/*` packages
published to npm — `schema` 0.1.2, `astro` 0.1.4, `core`/`element` 0.1.2, `cli`/packs
0.1.1 (per-package, not lockstep). M7 (introduction site + playground, deployed to
toonstrip.danielkimdev.com) added as a new milestone, not yet started. Full history in
`WORKLOG.md`.

---

## Last Session

Published the v0.7.2 hydration fixes a prior session had left only in the working tree:
bumped `schema` 0.1.1→0.1.2 and `astro` 0.1.3→0.1.4, full test suite (58 tests) + build
clean, then published — `schema` via `npm publish`, `astro` via `pnpm publish` (its
`workspace:*` deps need pnpm's publish-time rewrite to real semver; confirmed via
`pnpm pack` before publishing). `core`/`element` unchanged, no bump needed.

Also re-checked the reported "columns fixed on narrow screens" bug from
`danielkimdev-astro`: `layoutStrip`'s column math is overflow-safe by construction and
reflows correctly on a fresh narrow mount (verified via manual DOM/JS hydration, since
`client:visible`'s `IntersectionObserver` doesn't reliably fire in automated tabs). No
bug found here — that session's real issue was its own prose CSS.

---

## Next Actions

1. In `danielkimdev-astro`: bump to `@toonstrip/astro@0.1.4` / `@toonstrip/schema@0.1.2`,
   real `npm install` (replaces the manual `dist/` copy), re-verify the demo hydrates.
2. Start M7: intro/playground site (§10 in `TOONSTRIP_DEV_PLAN.md`), deploy to
   toonstrip.danielkimdev.com.
3. Verify `npm install @toonstrip/core` (etc.) works from a clean machine.
4. Read `NOTES.md` in full — judgment calls from M1–M5 logged there.

---

## Open Issues

- M7 not started; toonstrip.danielkimdev.com not yet deployed.
- `@toonstrip/schema`'s ajv dependency still has no ESM/browser build for *unbundled*
  consumers (no Vite/webpack) — v0.7.2 only fixed the Vite-bundled case (`NOTES.md`
  "M3").
- `toonstrip pack validate` doesn't check for a missing torso, only a missing NEUTRAL
  face (`NOTES.md` "M5").
- Playwright verify scripts are manual-only, not wired into CI yet.
- See `NOTES.md` for everything else flagged across M1–M5.
