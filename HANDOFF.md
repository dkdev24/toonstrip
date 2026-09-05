# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

## Current Version

**0.15.3** (npm, all internally consistent: schema 0.1.3, core 0.1.8, element 0.1.10,
astro 0.1.11 (**still on old element — see Open Issues**), packs 0.1.1, asset-packager
0.2.0, cli 0.2.4, react 0.1.3, vue 0.1.2, next 0.1.2)

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data, generalized from `grues-in-comic`'s comic pane (Zork/game/AI
coupling stripped). M0–M15 of `TOONSTRIP_DEV_PLAN.md` done. 11 packages on npm. Site live
at **https://toonstrip.danielkimdev.com**. **Deploy:** Cloudflare Pages `toonstrip`; push
to `main` deploys prod (output `site/dist`; root `pnpm build` is the build).

## Last Session

2026-09-05: Worked `PONYTAIL_AUDIT.md` autonomously (35/46 landed), published the #4 fix
(`@toonstrip/next` deprecated for `react`/`cli` directly) — then hit two publish
incidents: a `workspace:*`-rewrite mistake (plain `npm publish` vs. `pnpm publish`) and a
self-caused core/cli/element regression (published a consumer depending on a `core`
export that wasn't published yet). Both resolved — full chain (`core`→`cli`/`element`→
`vue`/`react`→`next`) republished in order, verified with a clean-room `npm install` that
actually exercises code, not just imports it. **Read `WORKLOG.md`'s v0.15.2/v0.15.3
entries in full before publishing anything else here.**

## Next Actions

1. **Publish `@toonstrip/astro`** fixed (see Open Issues) — needs your go-ahead
   (irreversible), version bump + `pnpm publish` + its own verification pass.
2. **Fix `site`'s Playwright suite** — 8/8 playground specs fail, pre-existing. Blocks
   #12 from being verified by more than a green build.
3. **Upstream port to `grues-in-comic`** per `UPSTREAM_SYNC.md`: #18/#37/#38 landed
   toonstrip-side only; #3/#14/#16/#19/#28 never attempted.
4. **S9 Korean locale** per `SITE_DEV_PLAN.md` §13 — unblocked.

## Open Issues

- **`@toonstrip/astro@0.1.11` depends on guard-less `element@0.1.8`** — throws
  server-side during Astro's own SSR, same class of issue `react`/`vue` had.
- **Publishing needs care here**: `workspace:*` deps require `pnpm publish`, never plain
  `npm publish`; a new `@toonstrip/core` export must publish *before* any consumer
  depending on it. Verify with a clean-room `npm install` that calls the code, not just
  imports it.
- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only, source-side
  validator does catch it); `site`'s 8 playground e2e specs all fail (pre-existing,
  `NOTES.md` M1–M5 covers manual-only Playwright scripts).
