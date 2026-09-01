# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.7.1**

---

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data. Extraction + generalization of `grues-in-comic`'s comic pane,
stripped of Zork/game/AI-inference coupling. M0–M6 done: all 7 `@toonstrip/*` packages
published to npm at 0.1.0. M7 (introduction site + playground, deployed to
toonstrip.danielkimdev.com) added as a new milestone. Full history in `WORKLOG.md`.

---

## Last Session

Closed M6: published all 7 `@toonstrip/*` packages to npm at 0.1.0 (public, scoped).
Split the old M6 site-deploy criterion into a new **M7** — a properly designed intro
site with a live playground — since `examples/astro-blog` is a bare integration test,
not a presentable landing page. Updated `TOONSTRIP_DEV_PLAN.md` §7/§10 accordingly;
toonstrip.danielkimdev.com deploy now happens at the end of M7.

---

## Next Actions

1. Start M7: design + build the intro/playground site (§10 in `TOONSTRIP_DEV_PLAN.md`),
   grown from `examples/astro-blog` or purpose-built. Deploy to
   toonstrip.danielkimdev.com at the end.
2. Verify `npm install @toonstrip/core` (etc.) works from a clean machine per the
   README's copy-paste example.
3. Read `NOTES.md` in full — judgment calls from M1–M5 made without a human in the loop
   are logged there.

---

## Open Issues

- M7 (intro/playground site) not started; toonstrip.danielkimdev.com not yet deployed.
- `@toonstrip/schema`'s ajv dependency has no ESM/browser build (`NOTES.md` "M3").
- `toonstrip pack validate` doesn't check for a missing torso, only a missing NEUTRAL
  face — a pack can pass validation and still render nothing (`NOTES.md` "M5").
- Playwright verify scripts are manual-only, not wired into CI yet.
- See `NOTES.md` for everything else flagged across M1–M5.
