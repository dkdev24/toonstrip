# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

## Current Version

**0.11.0** (M10 `@toonstrip/react`; npm unchanged: schema 0.1.3, core 0.1.7,
element 0.1.8, astro 0.1.11, cli 0.2.1, packs 0.1.1; react 0.1.0 new, unpublished)

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data, extracted/generalized from `grues-in-comic`'s comic pane (Zork/game/
AI-inference coupling stripped). M0–M10 done. 7 `@toonstrip/*` packages on npm, an 8th
(`react`) built and tested but not yet published. Site live at
**https://toonstrip.danielkimdev.com** (intro, docs, playground, changelog).
Full history in `WORKLOG.md`. **Deploy:** Cloudflare Pages project `toonstrip`, GitHub
integration. Push to `main` deploys production; other branches get a preview URL. Root
`wrangler.toml` sets the output dir (`site/dist`); root `pnpm build` is the Pages build.

## Last Session

2026-09-03: Implemented M10 — `@toonstrip/react`, a thin `<ComicStrip>` wrapper around
`packages/element`'s `<comic-strip>` custom element, plus `examples/react-vite`. Exit
criterion (prop update, no remount) verified by unit test and live in Chrome. Docs added
and cross-linked; site build verified clean. Not published to npm yet. Full detail:
`WORKLOG.md` v0.11.0.

## Next Actions

1. M11 `@toonstrip/vue` per `TOONSTRIP_DEV_PLAN.md` §13.3 — same pattern as
   `packages/react` (a wrapper component using Vue's custom-element interop), reusing the
   example-app + prop-change-without-remount testing pattern M10 established rather than
   reinventing it. Depends only on `packages/element` (done).
2. Then M12 `@toonstrip/next` (depends on M10, done), then M13 general SSR (depends on
   M12).
3. **S9 Korean locale** per `SITE_DEV_PLAN.md` §13, after M8-M13 land (per that plan's
   own sequencing note: land English content once, not twice).
4. **Daniel:** copy pass in his voice over `index.astro` (incl. new origin section)
   and `docs/*.mdx`. Link to the site from `danielkimdev.com`. Decide when to publish
   `@toonstrip/react` to npm.
5. If usage warrants: per-page OG images, Pagefind, short-link Worker (§9).

## Open Issues

- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only); Playwright verify
  scripts are manual-only (`NOTES.md` M1–M5).
