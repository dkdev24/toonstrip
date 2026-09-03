# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

## Current Version

**0.13.0** (M12 `@toonstrip/next`, M13 SSR placeholder; npm unchanged: schema 0.1.3, core
0.1.7, element 0.1.8, astro 0.1.11, cli 0.2.1, packs 0.1.1; react/vue/next 0.1.0 new,
unpublished)

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data, extracted/generalized from `grues-in-comic`'s comic pane
(Zork/game/AI-inference coupling stripped). M0–M13 done, all `TOONSTRIP_DEV_PLAN.md`
milestones. 7 `@toonstrip/*` packages on npm, an 8th/9th/10th (`react`/`vue`/`next`)
built/tested, not yet published. Site live at **https://toonstrip.danielkimdev.com**.
**Deploy:** Cloudflare Pages project `toonstrip`, GitHub integration; push to `main`
deploys prod (`wrangler.toml` sets output dir `site/dist`; root `pnpm build` is the
Pages build).

## Last Session

2026-09-03: Implemented M12 (`@toonstrip/next`) and M13 (SSR placeholder). Fixed
`packages/element` to not throw when imported with no DOM (`HTMLElement`/`customElements`
guards); added a `data-live`-driven `slot="placeholder"` so an SSR PNG (light-DOM `<img>`)
hides once the live canvas is ready. `packages/react` gained an optional `placeholder`
prop; new `packages/next` adds the `"use client"` boundary plus
`@toonstrip/next/server`'s `renderPlaceholder` (built on `@toonstrip/cli`, plus a new
`cssWidth`/`cssHeight` on `RenderResult` so the placeholder isn't 2x too large). New
`examples/next-app`. Both exit criteria verified with Playwright against a real
`next build && next start` (no server/hydration errors; zero layout shift on hydration).
Full workspace build+test clean (16 packages). Full detail: `WORKLOG.md` v0.13.0.

## Next Actions

1. **S9 Korean locale** per `SITE_DEV_PLAN.md` §13 — M8-M13 all done now, so this is
   unblocked (per that plan: land English content once, not twice).
2. **Daniel:** copy pass in his voice over `index.astro`/`docs/*.mdx`; link the site from
   `danielkimdev.com`; decide when to npm-publish `react`/`vue`/`next`.
3. If usage warrants: per-page OG images, Pagefind, short-link Worker (§9); a Nuxt
   equivalent of `@toonstrip/next` if demand shows up (no milestone yet).

## Open Issues

- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only); Playwright
  verify scripts are manual-only (`NOTES.md` M1–M5).
- `renderPlaceholder` needs `@toonstrip/cli` as the consuming app's own direct dep (not
  just transitive via `next`) plus `serverExternalPackages` in `next.config` — see
  `docs/next.md` "Native dependency". Packaging papercut, not a bug.
