# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.8.9** (Korean font fix; npm still: schema 0.1.3, core 0.1.6, element 0.1.7,
astro 0.1.10, cli 0.2.0, packs 0.1.1 — core 0.1.7/element 0.1.8/astro 0.1.11/cli 0.2.1 unpublished)

---

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data, extracted/generalized from `grues-in-comic`'s comic pane (Zork/game/
AI-inference coupling stripped). M0–M7 done. All 7 `@toonstrip/*` packages on npm. Site
live at **https://toonstrip.danielkimdev.com** (intro, docs, playground, changelog).
Full history in `WORKLOG.md`. **Deploy:** Cloudflare Pages project `toonstrip`, GitHub integration. Push to `main`
deploys production; other branches get a preview URL. Root `wrangler.toml` sets the output
dir (`site/dist`); root `pnpm build` is the Pages build. No manual steps.

---

## Last Session

2026-09-02, launch (v0.8.8) then v0.8.9: Korean balloon text fell to Gungseo because the
core font stack named no Korean face and the element painted before webfonts loaded.
Fixed in core/element/cli, site declares Noto Sans KR; SITE_DEV_PLAN §13 (S9 KO locale).

---

## Next Actions

1. **Publish cascade** core 0.1.7 → element 0.1.8 → astro 0.1.11 (+ cli 0.2.1), then
   `danielkimdev-astro` bump and port the font stack to `grues-in-comic` (ADR note).
2. **Daniel:** copy pass in his voice over
   `site/src/pages/index.astro` and `site/src/content/docs/*.mdx`. Link to the site from
   `danielkimdev.com`.
3. **S9 Korean locale** per `SITE_DEV_PLAN.md` §13 (EN root, KO under `/ko/`, model copied
   from `danielkimdev-astro`). Start with config + `src/i18n` + wrappers, then docs, strips.
4. Only if usage warrants: per-page OG images via `toonstrip render`, Pagefind, short-link
   Worker (`SITE_DEV_PLAN.md` §9).
---

## Open Issues

- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only); Playwright verify
  scripts are manual-only (`NOTES.md` M1–M5).
