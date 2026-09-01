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
syncing; found and fixed a `panelSeed` delimiter weakness (v0.7.7), republished
`core`/`element`/`astro`, bumped+verified `danielkimdev-astro` (locally and live — done).
Wrote `UPSTREAM_SYNC.md` (docs only, no bump): the cross-repo process for syncing the
rendering mechanical layer with `grues-in-comic` and propagating a `packages/core` fix
through npm into `danielkimdev-astro`. `AGENTS.md` points at it. Sibling docs:
`grues-in-comic/docs/TOONSTRIP_SYNC.md`, `danielkimdev-astro/dev-references/toonstrip-sync.md`.

---

## Next Actions

1. Start M7: intro/playground site (§10 in `TOONSTRIP_DEV_PLAN.md`), deploy to
   toonstrip.danielkimdev.com.

---

## Open Issues

- M7 not started; toonstrip.danielkimdev.com not yet deployed.
- `toonstrip pack validate` doesn't check for a missing torso, only a missing NEUTRAL
  face (`NOTES.md` "M5").
- Playwright verify scripts are manual-only, not wired into CI yet; see `NOTES.md` for
  everything else flagged across M1–M5.
