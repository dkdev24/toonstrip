# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

## Current Version

**0.9.1** (ToggleGroup overlap fix, kitchen-sink cleanup; npm unchanged: schema 0.1.3,
core 0.1.7, element 0.1.8, astro 0.1.11, cli 0.2.1, packs 0.1.1)

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data, extracted/generalized from `grues-in-comic`'s comic pane (Zork/game/
AI-inference coupling stripped). M0–M7 done. All 7 `@toonstrip/*` packages on npm. Site
live at **https://toonstrip.danielkimdev.com** (intro, docs, playground, changelog).
Full history in `WORKLOG.md`. **Deploy:** Cloudflare Pages project `toonstrip`, GitHub
integration. Push to `main` deploys production; other branches get a preview URL. Root
`wrangler.toml` sets the output dir (`site/dist`); root `pnpm build` is the Pages build.

## Last Session

2026-09-03: v0.9.0 confirmed already pushed/deployed (HANDOFF's "not yet pushed" note
was stale). Fixed a shared-component bug Daniel spotted live: `ToggleGroupItem`
(`site/src/components/ui/toggle-group.tsx`) mixed `flex-1` with an explicit `min-w-8`,
overriding the browser's content-based minimum and letting `whitespace-nowrap` labels
shrink narrower than their text — overlapping labels on Camera and the width-preset
segmented controls, with no visible boundary between options. Fixed for both call
sites; verified in local dev server, light and dark (`WORKLOG.md` v0.9.1). Also
removed `UiSpike.tsx` and its kitchen-sink mount, closing the open item from last
session about its 75 KB JS cost. Along the way, found and fixed a broken local
install (`tslib` missing despite being in the lockfile) via a full `node_modules`
wipe/reinstall — unrelated to the code, confirmed by reproducing on a clean checkout
first.

## Next Actions

1. M8-M13 per `TOONSTRIP_DEV_PLAN.md` §13: vanilla-HTML/SSG docs + agent skill first
   (no dependencies), then React/Vue wrappers, then Next.js, then general SSR.
2. **S9 Korean locale** per `SITE_DEV_PLAN.md` §13, after 1 lands.
3. **Daniel:** copy pass in his voice over `index.astro` (incl. new origin section)
   and `docs/*.mdx`. Link to the site from `danielkimdev.com`.
4. If usage warrants: per-page OG images, Pagefind, short-link Worker (§9).

## Open Issues

- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only); Playwright verify
  scripts are manual-only (`NOTES.md` M1–M5).
