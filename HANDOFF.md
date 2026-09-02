# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

## Current Version

**0.8.10** (site content fixes + M8-M13 roadmap; npm unchanged: schema 0.1.3, core 0.1.7,
element 0.1.8, astro 0.1.11, cli 0.2.1, packs 0.1.1)

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data, extracted/generalized from `grues-in-comic`'s comic pane (Zork/game/
AI-inference coupling stripped). M0–M7 done. All 7 `@toonstrip/*` packages on npm. Site
live at **https://toonstrip.danielkimdev.com** (intro, docs, playground, changelog).
Full history in `WORKLOG.md`. **Deploy:** Cloudflare Pages project `toonstrip`, GitHub
integration. Push to `main` deploys production; other branches get a preview URL. Root
`wrangler.toml` sets the output dir (`site/dist`); root `pnpm build` is the Pages build.

## Last Session

2026-09-03: wrote `PLAYGROUND_UI_PLAN.md` (preview full-width bottom, Configure left /
JSON right, per-panel tabs, shadcn/ui on preact/compat) and finished its step 1 spike:
`preact({ compat: true })`, Tailwind v4 scoped to the island, eleven `site/src/components/ui/`
components checked on the kitchen sink. Radix Slider and react-resizable-panels do not
work on compat and were replaced (plan §2.1). Playground budget 134.5 KB of 450 KB.

## Next Actions

1. Playground UI renewal, `PLAYGROUND_UI_PLAN.md` steps 2-5 (shell, per-panel tabs,
   control swap, docs). Step 1 is done; §2.1 lists the compat rules to follow.
2. M8-M13 per `TOONSTRIP_DEV_PLAN.md` §13: vanilla-HTML/SSG docs + agent skill first
   (no dependencies), then React/Vue wrappers, then Next.js, then general SSR.
3. **S9 Korean locale** per `SITE_DEV_PLAN.md` §13, after 1 and 2 land.
4. **Daniel:** copy pass in his voice over `index.astro` (incl. new origin section)
   and `docs/*.mdx`. Link to the site from `danielkimdev.com`.
5. If usage warrants: per-page OG images, Pagefind, short-link Worker (§9).

## Open Issues

- Two playground e2e tests fail before any UI work (`playground.spec.ts` "JSON edit
  updates…" and "keyboard-only…"): the CodeMirror `Control+A` + insertText edit does not
  replace the document, so the canvas count stays 3. Reproduced on the untouched tree.
- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only); Playwright verify
  scripts are manual-only (`NOTES.md` M1–M5).
