# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

## Current Version

**0.15.1** (npm: schema 0.1.3, core 0.1.7, element 0.1.8, astro 0.1.11, packs 0.1.1,
vue 0.1.0, asset-packager 0.2.0; cli 0.2.2, react 0.1.1, next 0.1.1 bumped in-repo but
**not yet published** — see Next Actions)

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data, generalized from `grues-in-comic`'s comic pane (Zork/game/AI
coupling stripped). M0–M15 of `TOONSTRIP_DEV_PLAN.md` done. 11 packages on npm. Site live
at **https://toonstrip.danielkimdev.com**. **Deploy:** Cloudflare Pages `toonstrip`; push
to `main` deploys prod (output `site/dist`; root `pnpm build` is the build).

## Last Session

2026-09-05: Worked `PONYTAIL_AUDIT.md` autonomously — 33 more items landed (35/46 total, 4
partial), ~700 generated lines + 7 deps dropped, one published package deprecated.
Commits `5413998`, `6c48463`, `232d49e` (dedup/dead-code), `f91aa64` (#1: ajv+esbuild
schema validator → hand-rolled recursive checker, same `instancePath`/`message` contract),
and `9668530` (#4: `@toonstrip/next` deprecated — `"use client"`/`renderPlaceholder` moved
onto `react`/`cli` directly; `next` kept as a working re-export shim; `examples/next-app`
migrated and verified end-to-end incl. a real browser check). `pnpm build`/`pnpm test`
green throughout, re-verified independently — see `PONYTAIL_AUDIT.md`'s Progress section
for the full per-item ledger.

## Next Actions

1. **Publish the #4 deprecation** — `react`/`cli`/`next` versions bumped in-repo, not
   published. `pnpm publish` react and cli first, then next — needs your go-ahead
   (irreversible). Optionally `npm deprecate @toonstrip/next` too.
2. **Fix `site`'s Playwright suite** — 8/8 playground specs fail, pre-existing. Blocks
   #12 from being verified by more than a green build.
3. **Upstream port to `grues-in-comic`** per `UPSTREAM_SYNC.md`: #18/#37/#38's
   `normalizeAngle` landed toonstrip-side only; #3/#14/#16/#19/#28 never attempted (need
   ADR + gate/density + a publish cascade — your go-ahead required).
4. **S9 Korean locale** per `SITE_DEV_PLAN.md` §13 — unblocked, M8-M13 done.

## Open Issues

- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only);
  `toonstrip-pack validate` does catch it on the source side.
- `site`'s 8 playground e2e specs all fail (pre-existing); other Playwright scripts are
  manual-only (`NOTES.md` M1–M5).
- `renderPlaceholder` needs `@toonstrip/cli` as a direct dep, `serverExternalPackages`,
  and a `webpackIgnore`d dynamic import (workspace-symlinked pkg) — `docs/next.md`.
