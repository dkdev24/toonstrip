# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.7.0**

---

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data. Extraction + generalization of `grues-in-comic`'s comic pane,
stripped of Zork/game/AI-inference coupling. M0–M5 done; only M6 (npm publish) remains,
gated on claiming the npm org. Full history in `WORKLOG.md`.

---

## Last Session

M5 complete: `docs/schema.md`, `docs/packs.md` (self-tested "add a character"
walkthrough), `docs/astro.md`, root `README.md` + `CONTRIBUTING.md` (neither existed
before), and `packages/pack-example` — a second, small, original, non-AI-generated asset
pack proving the pack contract isn't coupled to `pack-comic-chat`. `toonstrip pack
validate` passes on it; `packages/core/test/pack-example.test.ts` renders a real
non-blank panel from it. 56 tests passing workspace-wide.

---

## Next Actions

1. **Claim `toonstrip` on npm and the `@toonstrip` org** — the only remaining blocker
   before M6 (publish `@toonstrip/*`, deploy the Astro example to toonstrip.danielkimdev.com).
2. Read `NOTES.md` in full before M6 — every judgment call from M1–M5 made without a
   human in the loop is logged there; the two below are worth acting on first.

---

## Open Issues

- npm org/package name (`toonstrip`, `@toonstrip`) not yet claimed — blocks M6 only.
- `@toonstrip/schema`'s ajv dependency has no ESM/browser build (`NOTES.md` "M3").
- `toonstrip pack validate` doesn't check for a missing torso, only a missing NEUTRAL
  face — a pack can pass validation and still render nothing (`NOTES.md` "M5").
- Playwright verify scripts are manual-only, not wired into CI yet (`NOTES.md` "M3"/"M4").
- See `NOTES.md` for everything else flagged across M1–M5.
