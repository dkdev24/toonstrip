# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

## Current Version

**0.15.2** (npm: schema 0.1.3, core 0.1.7, element 0.1.8 (**SSR-unsafe**), astro 0.1.11,
packs 0.1.1, vue 0.1.0 (**`workspace:*`-broken**), asset-packager 0.2.0, cli 0.2.3,
react 0.1.2, next 0.1.1 — see Open Issues)

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data, generalized from `grues-in-comic`'s comic pane (Zork/game/AI
coupling stripped). M0–M15 of `TOONSTRIP_DEV_PLAN.md` done. 11 packages on npm. Site live
at **https://toonstrip.danielkimdev.com**. **Deploy:** Cloudflare Pages `toonstrip`; push
to `main` deploys prod (output `site/dist`; root `pnpm build` is the build).

## Last Session

2026-09-05: Worked `PONYTAIL_AUDIT.md` autonomously (35/46 landed) and published the #4
fix (`@toonstrip/next` deprecated for `react`/`cli` directly) as `react@0.1.2`,
`cli@0.2.3`, `next@0.1.1`. Full detail — including a publish mistake (plain `npm publish`
doesn't rewrite pnpm's `workspace:*`) and two pre-existing bugs it surfaced — is in
`WORKLOG.md`'s v0.15.2 entry; read that before publishing anything else in this repo.

## Next Actions

1. **Publish `@toonstrip/element`** with its already-committed SSR guard (Open Issues,
   the real blocker for #4's SSR story) and **fix `vue@0.1.0`'s `workspace:*`** — both
   need your go-ahead (irreversible); both via `pnpm publish`, not plain `npm publish`.
2. **Fix `site`'s Playwright suite** — 8/8 playground specs fail, pre-existing. Blocks
   #12 from being verified by more than a green build.
3. **Upstream port to `grues-in-comic`** per `UPSTREAM_SYNC.md`: #18/#37/#38's
   `normalizeAngle` landed toonstrip-side only; #3/#14/#16/#19/#28 never attempted.
4. **S9 Korean locale** per `SITE_DEV_PLAN.md` §13 — unblocked, M8-M13 done.

## Open Issues

- **`@toonstrip/element@0.1.8` predates its own SSR guard** (fix landed in `f6d25ba`,
  never republished) — `ComicStripElement extends HTMLElement` throws server-side in any
  real npm install; the monorepo's own dev/test always passes (workspace linking uses
  local dist). Found via a clean-room `npm install` outside the workspace.
- **`@toonstrip/vue@0.1.0` (live) shipped a literal `"workspace:*"` dependency string** —
  broken for any real install (same root cause as #4's publish mistake — `npm publish`
  instead of `pnpm publish`). `react` was fixed the same way at 0.1.2; `vue` isn't yet.
- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only); the source-side
  validator does catch it.
- `site`'s 8 playground e2e specs all fail (pre-existing); other Playwright scripts are
  manual-only (`NOTES.md` M1–M5).
