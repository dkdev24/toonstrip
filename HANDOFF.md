# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.7.8** (published)

---

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data. Extraction + generalization of `grues-in-comic`'s comic pane,
stripped of Zork/game/AI-inference coupling. M0–M6 done: all 7 `@toonstrip/*` packages
published to npm — `schema` 0.1.3, `astro` 0.1.9, `element` 0.1.6, `core` 0.1.5,
`cli`/packs 0.1.1 (per-package, not lockstep). M7 (introduction site + playground,
deployed to toonstrip.danielkimdev.com) added as a new milestone, not yet started. Full
history in `WORKLOG.md`.

---

## Last Session

v0.7.6's balloon-width fix didn't fully solve the user's report — real embed size is
363×309, not the 400×340 `UNIT` test fixtures, where the driver refuses most panels and
falls back to `stackBalloons`, untouched by that fix (and slightly worsened by it).
Widened the fallback's own `cap`/`WIDTH_BIAS` (v0.7.8), verified against real content at
real size, ported to `grues-in-comic` (its WORKLOG v0.33.6), republished
`core`/`element`/`astro`. `danielkimdev-astro` not yet bumped — next action.

---

## Next Actions

1. In `danielkimdev-astro`: bump `@toonstrip/astro` to `0.1.9`, rebuild, verify the real
   blog post at its real embed width (not just a wide preview window) before pushing.
2. Start M7: intro/playground site (§10 in `TOONSTRIP_DEV_PLAN.md`), deploy to
   toonstrip.danielkimdev.com.

---

## Open Issues

- M7 not started; toonstrip.danielkimdev.com not yet deployed.
- `toonstrip pack validate` doesn't check for a missing torso, only a missing NEUTRAL
  face; Playwright verify scripts are manual-only (`NOTES.md` M1–M5).
