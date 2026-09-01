# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.7.4** (published)

---

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data. Extraction + generalization of `grues-in-comic`'s comic pane,
stripped of Zork/game/AI-inference coupling. M0–M6 done: all 7 `@toonstrip/*` packages
published to npm — `schema` 0.1.3, `astro` 0.1.5, `core`/`element` 0.1.2, `cli`/packs
0.1.1 (per-package, not lockstep). M7 (introduction site + playground, deployed to
toonstrip.danielkimdev.com) added as a new milestone, not yet started. Full history in
`WORKLOG.md`.

---

## Last Session

Fixed a CSP `unsafe-eval` bug: `@toonstrip/schema` validated documents via runtime
`ajv.compile()` (`new Function(...)`), which broke under CSPs without `unsafe-eval` —
e.g. `danielkimdev-astro`'s deployed site, where the strip rendered fine in `astro dev`
but was blank in production. Now precompiled at build time (ajv standalone + esbuild),
zero eval/require in the shipped code. Published `schema` 0.1.3 / `astro` 0.1.5. Full
writeup in `WORKLOG.md`.

---

## Next Actions

1. Start M7: intro/playground site (§10 in `TOONSTRIP_DEV_PLAN.md`), deploy to
   toonstrip.danielkimdev.com.
2. Read `NOTES.md` in full — judgment calls from M1–M5 logged there.

---

## Open Issues

- M7 not started; toonstrip.danielkimdev.com not yet deployed.
- `toonstrip pack validate` doesn't check for a missing torso, only a missing NEUTRAL
  face (`NOTES.md` "M5").
- Playwright verify scripts are manual-only, not wired into CI yet.
- See `NOTES.md` for everything else flagged across M1–M5.
