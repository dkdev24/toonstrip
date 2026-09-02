# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.7.11** published (core 0.1.6, element 0.1.7, astro 0.1.10) — see Last Session

---

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data, extracted/generalized from `grues-in-comic`'s comic pane (Zork/game/
AI-inference coupling stripped). M0–M6 done: all 7 `@toonstrip/*` packages published to npm
— `schema` 0.1.3, `astro` 0.1.10, `element` 0.1.7, `core` 0.1.6, `cli`/packs 0.1.1 (not
lockstep). M7 (intro/playground) not started. Full history in `WORKLOG.md`.

---

## Last Session

Three balloon-layout fixes, same session, **published together** (core 0.1.6 → element
0.1.7 → astro 0.1.10, cascade verified resolving). **v0.7.9**: `stackBalloons` fallback
overlapped a straddling speech balloon with a *neighbour's* head/tail — fixed w/
`speakerCorridor`. **v0.7.10** root-causes the fallback: driver refused 2/4 real 2-speaker
panels even at native `UNIT` size — fixed w/ `speakerCorridors`. **v0.7.11**, user-directed:
layout constants (font, line height, chrome, margins) were fixed CSS px regardless of panel
size — scaled by `width/UNIT.width` throughout. Fit rate now **4/4 uniformly 400px→260px**,
tests clean (30). `grues-in-comic` port started but **blocked on this machine**: its ADR
0008/`PITFALLS.md` mandate `gate:accept`/`density:accept` run only on macOS (host-specific
font rasterization) — this session is Windows.

---

## Next Actions

1. `danielkimdev-astro`: bump to `@toonstrip/astro@0.1.10`, rebuild, verify real embed
   width before pushing.
2. `grues-in-comic` port: code/ADR on any machine; `gate`/`density` accept needs macOS.
3. Start M7 (§10, `TOONSTRIP_DEV_PLAN.md`).

---

## Open Issues

- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only); Playwright verify
  scripts are manual-only (`NOTES.md` M1–M5).
