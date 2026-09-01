# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.7.7** (published)

---

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data. Extraction + generalization of `grues-in-comic`'s comic pane,
stripped of Zork/game/AI-inference coupling. M0–M6 done: all 7 `@toonstrip/*` packages
published to npm — `schema` 0.1.3, `astro` 0.1.8, `element` 0.1.5, `core` 0.1.4,
`cli`/packs 0.1.1 (per-package, not lockstep). M7 (introduction site + playground,
deployed to toonstrip.danielkimdev.com) added as a new milestone, not yet started. Full
history in `WORKLOG.md`.

---

## Last Session

Swept `toonstrip` against `grues-in-comic`'s comic engine for other divergences worth
syncing; found `panelSeed` joined speaker/text with a plain space instead of
grues-in-comic's collision-proof NUL/SOH delimiters, lost in the M1 port since both
render identically in any normal view. Fixed (as a visible `\x00`/`\x01` escape, not a
raw byte) and republished `core`/`element`/`astro`. Full writeup: `WORKLOG.md` v0.7.7.

---

## Next Actions

1. In `danielkimdev-astro`: bump `@toonstrip/astro` to `0.1.8`, install, rebuild, verify
   the example strip still renders correctly.
2. Start M7: intro/playground site (§10 in `TOONSTRIP_DEV_PLAN.md`), deploy to
   toonstrip.danielkimdev.com.

---

## Open Issues

- M7 not started; toonstrip.danielkimdev.com not yet deployed.
- `toonstrip pack validate` doesn't check for a missing torso, only a missing NEUTRAL
  face (`NOTES.md` "M5").
- Playwright verify scripts are manual-only, not wired into CI yet; see `NOTES.md` for
  everything else flagged across M1–M5.
