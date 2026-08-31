# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.3.0**

---

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip (panels,
characters, poses, balloons, backdrops) from caller-supplied data. Extraction +
generalization of `grues-in-comic`'s comic pane, stripped of Zork/game/AI-inference
coupling. M0-M1 done; M2+ not started. Full history in `WORKLOG.md`.

---

## Last Session

M1 complete: rendering core ported into `packages/core` (pose selection, figure
compositing, balloons + multi-balloon layout driver, camera shots, panel layout),
adapted to `@toonstrip/schema` types. 26 tests passing, fixture 3-panel document renders
to real PNGs via `@napi-rs/canvas`. Several judgment calls made without real character
art yet — see `NOTES.md` "M1" before relying on any of them. Full detail: `WORKLOG.md` v0.3.0.

---

## Next Actions

1. Claim `toonstrip` on npm and the `@toonstrip` org (open, not blocking dev work).
2. Start M2 (§10): extract the default asset pack into `packages/pack-comic-chat` — port
   the 15-character roster and decode+pack the 3 original Comic Chat backdrop bitmaps
   (`field`, `pastoral`, `room8bs`) from `/Users/daniel/Sites/grues-in-comic`'s
   `art/src/{avb,pack,cast-manifest,raster,png,bmp,inflate}.ts`. Swap `packages/core`'s
   test/example fixture cast for the real pack once it validates. Carry forward the
   MIT/Microsoft notice per §13.

---

## Open Issues

- npm org/package name (`toonstrip`, `@toonstrip`) not yet claimed.
- Schema validator is structural only; no cross-check against registered asset packs yet
  (needs pack system, §6, M2+).
- M1 shipped with fixture/placeholder art only, no browser cast-loading yet (deferred to
  M2/M3). See `NOTES.md` "M1" for judgment calls made along the way.
