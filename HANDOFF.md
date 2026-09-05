# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

## Current Version

**0.15.4** (npm, all internally consistent: schema 0.1.3, core 0.1.8, element 0.1.10,
astro 0.1.12, packs 0.1.1, asset-packager 0.2.0, cli 0.2.4, react 0.1.3, vue 0.1.2, next
0.1.2)

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data, generalized from `grues-in-comic`'s comic pane (Zork/game/AI
coupling stripped). M0–M15 of `TOONSTRIP_DEV_PLAN.md` done. 11 packages on npm. Site live
at **https://toonstrip.danielkimdev.com**. **Deploy:** Cloudflare Pages `toonstrip`; push
to `main` deploys prod (output `site/dist`; root `pnpm build` is the build).

## Last Session

2026-09-05: Fixed `site`'s Playwright suite, landed audit #12, then worked the upstream
port. Checked #3/#14/#16/#19/#28 against the actual `grues-in-comic` repo instead of
assuming portable: landed #14/#16/#19/#28 in `packages/core` (none needed a matching
change there — dead/different/absent on that side); ported #37 there too (verified with
its own `gate`/`density`, zero diff). **#3 stopped, needs your call**: the audit's
framing was wrong (public API export with real tests, an underspecified fallback
redesign that risks dropping balloons) and `grues-in-comic`'s `stackBalloons` is
confirmed live/maintained there. 41/46 audit items done. See `WORKLOG.md` v0.15.4–v0.15.7.

## Next Actions

1. **#3 needs a product decision** (`PONYTAIL_AUDIT.md`): intended fallback redesign, and
   whether breaking `measureBalloon`/`goalWidth`'s public API is wanted.
2. **Publish cascade pending your OK**: `packages/core` changed (#14/#16/#19/#28) —
   bump+publish `@toonstrip/core`→`element`→`astro` in order, then propagate to
   `danielkimdev-astro` (bump dep, install, build, browser-verify) per `UPSTREAM_SYNC.md`.
   `grues-in-comic`'s #37 port is made but uncommitted there, same pending-OK reason.
3. **S9 Korean locale** per `SITE_DEV_PLAN.md` §13 — unblocked.
4. `PONYTAIL_AUDIT.md`'s #8/#46 need a human call, not blocked on anything.

## Open Issues

- **Publishing needs care here**: `workspace:*` deps require `pnpm publish`, never plain
  `npm publish`; a new `@toonstrip/core` export must publish *before* any consumer
  depending on it. Verify with a clean-room `npm install` that calls the code, not just
  imports it. After a publish, `npm view`/`install` can lag ~1 min before showing the new
  version — a same-version republish 403'ing as "already published" confirms it went
  through; don't assume failure from stale metadata.
- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only, source-side
  validator does catch it).
