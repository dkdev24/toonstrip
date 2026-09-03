# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

## Current Version

**0.10.0** (M8 vanilla-HTML example + M9 agent skill; npm unchanged: schema 0.1.3,
core 0.1.7, element 0.1.8, astro 0.1.11, cli 0.2.1, packs 0.1.1)

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data, extracted/generalized from `grues-in-comic`'s comic pane (Zork/game/
AI-inference coupling stripped). M0–M9 done. All 7 `@toonstrip/*` packages on npm. Site
live at **https://toonstrip.danielkimdev.com** (intro, docs, playground, changelog).
Full history in `WORKLOG.md`. **Deploy:** Cloudflare Pages project `toonstrip`, GitHub
integration. Push to `main` deploys production; other branches get a preview URL. Root
`wrangler.toml` sets the output dir (`site/dist`); root `pnpm build` is the Pages build.

## Last Session

2026-09-03: Implemented M8 and M9 from `TOONSTRIP_DEV_PLAN.md` §13 (independent of each
other and of M7). M8: `examples/vanilla-html/index.html`, no `package.json`/bundler,
imports `@toonstrip/element` from esm.sh (resolves bare `@toonstrip/core`/`schema`
imports — unpkg does not) with `packs` on unpkg for static files; verified rendering
from a local static server via Chrome. Added `docs/vanilla-html.md` + a site doc
section. M9: `skills/toonstrip/SKILL.md` teaches the document shape, exact
emotion-wheel angles, real pack ids, and the `toonstrip render`-validate workflow —
self-tested against the dev plan's exit criterion (skill-only doc rendered correctly
on first `toonstrip render`). Added `site/src/content/docs/agent-skill.mdx`
(Reference, order 13), cross-linked from the FAQ; auto-picked-up by `llms.txt`. No
package versions bumped.

## Next Actions

1. M10 `@toonstrip/react`, M11 `@toonstrip/vue` per `TOONSTRIP_DEV_PLAN.md` §13.3 —
   build React first (larger install base), establish the wrapper-testing pattern, reuse
   it for Vue. Both depend only on `packages/element` (done).
2. Then M12 `@toonstrip/next` (depends on M10), then M13 general SSR (depends on M12).
3. **S9 Korean locale** per `SITE_DEV_PLAN.md` §13, after M8-M13 land (per that plan's
   own sequencing note: land English content once, not twice).
4. **Daniel:** copy pass in his voice over `index.astro` (incl. new origin section)
   and `docs/*.mdx`. Link to the site from `danielkimdev.com`.
5. If usage warrants: per-page OG images, Pagefind, short-link Worker (§9).

## Open Issues

- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only); Playwright verify
  scripts are manual-only (`NOTES.md` M1–M5).
