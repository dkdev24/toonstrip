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

2026-09-05: Fixed the last Open Issue from v0.15.3: `@toonstrip/astro` was published
against guard-less `element@0.1.8`, crashing Astro's own SSG (`ReferenceError:
HTMLElement is not defined`). No code change needed — `element@0.1.10` already had the
SSR guard; astro's dep was just stale. Bumped astro to 0.1.12, republished with `pnpm
publish`, verified clean-room. Full version set is now internally consistent — see
`WORKLOG.md`'s v0.15.4 entry for the propagation-lag gotcha hit during verification
(publish succeeded immediately but `npm view`/`install` kept resolving the old version
for ~1 min; don't mistake that for a failed publish).

## Next Actions

1. **Fix `site`'s Playwright suite** — 8/8 playground specs fail, pre-existing. Blocks
   #12 from being verified by more than a green build.
2. **Upstream port to `grues-in-comic`** per `UPSTREAM_SYNC.md`: #18/#37/#38 landed
   toonstrip-side only; #3/#14/#16/#19/#28 never attempted.
3. **S9 Korean locale** per `SITE_DEV_PLAN.md` §13 — unblocked.

## Open Issues

- **Publishing needs care here**: `workspace:*` deps require `pnpm publish`, never plain
  `npm publish`; a new `@toonstrip/core` export must publish *before* any consumer
  depending on it. Verify with a clean-room `npm install` that calls the code, not just
  imports it. After a publish, `npm view`/`install` can lag ~1 min before showing the new
  version — a same-version republish 403'ing as "already published" confirms it went
  through; don't assume failure from stale metadata.
- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only, source-side
  validator does catch it); `site`'s 8 playground e2e specs all fail (pre-existing,
  `NOTES.md` M1–M5 covers manual-only Playwright scripts).
