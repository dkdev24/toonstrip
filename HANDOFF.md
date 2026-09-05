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

2026-09-05: Fixed `site`'s Playwright suite (all 8 playground specs — Astro 7's `astro
preview` daemonizes and exits immediately, which broke Playwright's `webServer`; a stale
daemon from an unrelated project was also squatting on the default port). Then landed
audit #12: `json-position.ts`'s hand-written JSON scanner replaced with a walk over
`@codemirror/lang-json`'s own parse tree (already a dep, no new one added), verified
byte-for-byte against real `@toonstrip/schema` validation output and the live Playwright
suite. 36/46 audit items now done. Also caught up public `CHANGELOG.md` (0.15.1–0.15.4)
and republished `@toonstrip/astro`. See `WORKLOG.md` v0.15.4–v0.15.6.

## Next Actions

1. **Upstream port to `grues-in-comic`** per `UPSTREAM_SYNC.md`: #18/#37/#38 landed
   toonstrip-side only; #3/#14/#16/#19/#28 never attempted — needs your go-ahead before
   the publish cascade (`UPSTREAM_SYNC.md`'s Safety section).
2. **S9 Korean locale** per `SITE_DEV_PLAN.md` §13 — unblocked.
3. `PONYTAIL_AUDIT.md`'s #8/#46 need a human call, not blocked on anything.

## Open Issues

- **Publishing needs care here**: `workspace:*` deps require `pnpm publish`, never plain
  `npm publish`; a new `@toonstrip/core` export must publish *before* any consumer
  depending on it. Verify with a clean-room `npm install` that calls the code, not just
  imports it. After a publish, `npm view`/`install` can lag ~1 min before showing the new
  version — a same-version republish 403'ing as "already published" confirms it went
  through; don't assume failure from stale metadata.
- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only, source-side
  validator does catch it).
- This machine runs multiple Astro projects sharing one global `astro preview` daemon
  lock/default port (4321); a manual preview here needs its own `--port` + `preview
  stop` cleanup. `site`'s e2e suite already handles this itself (port 43210).
