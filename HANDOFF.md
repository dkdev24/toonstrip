# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

## Current Version

**0.9.0** (playground UI renewal; npm unchanged: schema 0.1.3, core 0.1.7, element 0.1.8,
astro 0.1.11, cli 0.2.1, packs 0.1.1)

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data, extracted/generalized from `grues-in-comic`'s comic pane (Zork/game/
AI-inference coupling stripped). M0–M7 done. All 7 `@toonstrip/*` packages on npm. Site
live at **https://toonstrip.danielkimdev.com** (intro, docs, playground, changelog).
Full history in `WORKLOG.md`. **Deploy:** Cloudflare Pages project `toonstrip`, GitHub
integration. Push to `main` deploys production; other branches get a preview URL. Root
`wrangler.toml` sets the output dir (`site/dist`); root `pnpm build` is the Pages build.

## Last Session

2026-09-03: playground UI renewal done end to end (`PLAYGROUND_UI_PLAN.md`, all five
steps; `WORKLOG.md` v0.9.0). shadcn/ui on `preact({ compat: true })`, Tailwind v4
scoped to the island, `site/src/components/ui/` (compat rules in plan §2.1). Configure |
JSON over a full-width Preview, persisted splits, tabs + sheet under 900 px, Strip tab
plus one tab per panel. 8/8 playground e2e green. Not yet pushed or deployed.

## Next Actions

1. Push `main` (deploys 0.9.0 to Cloudflare Pages) and eyeball `/playground` live in
   both themes and on a phone. Open issue: `UiSpike` on `/kitchen-sink` adds 75 KB JS
   to that unindexed page; drop it if it is not wanted as a design check.
2. M8-M13 per `TOONSTRIP_DEV_PLAN.md` §13: vanilla-HTML/SSG docs + agent skill first
   (no dependencies), then React/Vue wrappers, then Next.js, then general SSR.
3. **S9 Korean locale** per `SITE_DEV_PLAN.md` §13, after 1 and 2 land.
4. **Daniel:** copy pass in his voice over `index.astro` (incl. new origin section)
   and `docs/*.mdx`. Link to the site from `danielkimdev.com`.
5. If usage warrants: per-page OG images, Pagefind, short-link Worker (§9).

## Open Issues

- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only); Playwright verify
  scripts are manual-only (`NOTES.md` M1–M5).
