# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

## Current Version

**0.15.1** (npm: schema 0.1.3, core 0.1.7, element 0.1.8, astro 0.1.11, cli 0.2.1, packs
0.1.1, react/vue/next 0.1.0, asset-packager 0.2.0)

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data, generalized from `grues-in-comic`'s comic pane (Zork/game/AI
coupling stripped). M0–M15 of `TOONSTRIP_DEV_PLAN.md` done. 11 packages on npm. Site live
at **https://toonstrip.danielkimdev.com**. **Deploy:** Cloudflare Pages `toonstrip`; push
to `main` deploys prod (output `site/dist`; root `pnpm build` is the build).

## Last Session

2026-09-04: New site docs page for the packager (`docs/asset-packager.mdx`, Reference,
order 17; both input paths, the join, errors vs warnings) + cross-link from
`asset-packs.mdx`. Published **`@toonstrip/asset-packager` 0.2.0** to npm (33 tests green;
tarball verified, `@toonstrip/core` dep rewritten to 0.1.7). Then a repo-wide
over-engineering audit → **`PONYTAIL_AUDIT.md`**: 46 ranked findings (~2,400 lines + ~700
generated + 9 deps cuttable) with a Progress table at its top. Applied 2 of them — **#31**
(dead `ui/scroll-area.tsx`, -1 radix dep) and **#42** (unused `codemirror` meta-package,
-3 installed packages); build green after each.

## Next Actions

1. **Fix `site`'s Playwright suite** — 8/8 playground specs fail, pre-existing. It is the
   safety net for the site-side audit items; #12 should wait for it.
2. **Keep working `PONYTAIL_AUDIT.md`** in its suggested order: #29, then
   #41/#40/#11/#5/#44, then the packager cuts, the schema's ajv removal, and the
   upstream-shared core batch per `UPSTREAM_SYNC.md`.
3. **S9 Korean locale** per `SITE_DEV_PLAN.md` §13 — M8-M13 all done, so this is
   unblocked (per that plan: land English content once, not twice).
4. **Daniel:** copy pass in his voice over `index.astro`/`docs/*.mdx`; link the site
   from `danielkimdev.com`.
5. If usage warrants: per-page OG images, Pagefind, short-link Worker (§9); a Nuxt wrapper.

## Open Issues

- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only);
  `toonstrip-pack validate` does catch it on the source side.
- `site`'s 8 playground e2e specs all fail (pre-existing); other Playwright verify
  scripts are manual-only (`NOTES.md` M1–M5).
- `next-reference.mdx:57` passes `Callout kind="warn"`, outside the component's union —
  renders unstyled. One-word fix, found during the audit.
- `renderPlaceholder` needs `@toonstrip/cli` as the app's own direct dep plus
  `serverExternalPackages` in `next.config` — `docs/next.md`. Papercut, not a bug.
