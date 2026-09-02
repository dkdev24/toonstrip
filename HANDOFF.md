# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.8.8** (M7 launched; npm: schema 0.1.3, core 0.1.6, element 0.1.7, astro 0.1.10,
cli 0.2.0, packs 0.1.1)

---

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data, extracted/generalized from `grues-in-comic`'s comic pane (Zork/game/
AI-inference coupling stripped). M0–M7 done. All 7 `@toonstrip/*` packages on npm. Site
live at **https://toonstrip.danielkimdev.com** (intro, docs, playground, changelog).
Full history in `WORKLOG.md`.
**Deploy:** Cloudflare Pages project `toonstrip`, GitHub integration. Push to `main`
deploys production; other branches get a preview URL. Root `wrangler.toml` sets the output
dir (`site/dist`); root `pnpm build` is the Pages build. No manual steps.

---

## Last Session

2026-09-02, M7 S8 launch (v0.8.8). Daniel created the Pages project and attached the
domain. Published `@toonstrip/cli@0.2.0`. Package READMEs link to the site, CHANGELOG
0.8.8, WORKLOG entry. S0–S7 shipped earlier the same day.

---

## Next Actions

1. **Daniel:** enable Cloudflare Web Analytics on the Pages project (CSP in
   `site/public/_headers` already allows the beacon). Copy pass in his voice over
   `site/src/pages/index.astro` and `site/src/content/docs/*.mdx`. Link to the site from
   `danielkimdev.com`.
2. `danielkimdev-astro` bump to `@toonstrip/astro@0.1.10`; `grues-in-comic` port of the
   `packages/core` fixes (`UPSTREAM_SYNC.md`).
3. Only if usage warrants: per-page OG images via `toonstrip render`, Pagefind, short-link
   Worker (`SITE_DEV_PLAN.md` §9).
---

## Open Issues

- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only); Playwright verify
  scripts are manual-only (`NOTES.md` M1–M5).
