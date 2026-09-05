# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

## Current Version

**0.15.8** (npm, all internally consistent: schema 0.1.3, core 0.1.9, element 0.1.11,
astro 0.1.13, packs 0.1.1, asset-packager 0.2.0, cli 0.2.4, react 0.1.3, vue 0.1.2, next
0.1.2)

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data, generalized from `grues-in-comic`'s comic pane (Zork/game/AI
coupling stripped). M0–M15 of `TOONSTRIP_DEV_PLAN.md` done. 11 packages on npm. Site live
at **https://toonstrip.danielkimdev.com**. **Deploy:** Cloudflare Pages `toonstrip`; push
to `main` deploys prod (output `site/dist`; root `pnpm build` is the build).

## Last Session

2026-09-05: Fixed `site`'s Playwright suite, landed audit #12, completed the upstream-port
arc (published core/element/astro, propagated to `danielkimdev-astro`, all three repos
pushed — see `WORKLOG.md` v0.15.4–v0.15.9), then landed the last two items, #8 and #46 —
**`PONYTAIL_AUDIT.md` is now fully resolved, 46/46**. #46: `sheets.test.ts`'s 4th copy of
a grid-sheet drawer replaced with a shared `sheet()` in `draw.mjs`, verified byte-identical
fixture regen. #8: `resizable.tsx`'s Context/sizes-array indirection replaced with a
3-track CSS grid; caught two real bugs in the process (grid needs a track for the handle,
and the shared `.grid` utility's 24px gap collided with the literal class name) — the
existing pixel-perfect drag Playwright assertion is what caught the first one. See
`WORKLOG.md` v0.15.10.

## Next Actions

1. **S9 Korean locale** per `SITE_DEV_PLAN.md` §13 — unblocked, no other backlog item
   pending from this session's work.

## Open Issues

- **Publishing needs care here**: `workspace:*` deps require `pnpm publish`, never plain
  `npm publish`; a new `@toonstrip/core` export must publish *before* any consumer
  depending on it. Verify with a clean-room `npm install` that calls the code, not just
  imports it. After a publish, `npm view`/`install` can lag ~1 min before showing the new
  version — a same-version republish 403'ing as "already published" confirms it went
  through; don't assume failure from stale metadata.
- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only).
