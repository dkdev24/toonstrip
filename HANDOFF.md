# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

## Current Version

**0.15.1** (M14 `@toonstrip/asset-packager`, M15 sheet input; npm: schema 0.1.3, core
0.1.7, element 0.1.8, astro 0.1.11, cli 0.2.1, packs 0.1.1, react/vue/next 0.1.0,
asset-packager 0.2.0)

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data, extracted/generalized from `grues-in-comic`'s comic pane
(Zork/game/AI-inference coupling stripped). M0–M15 of `TOONSTRIP_DEV_PLAN.md` done.
11 `@toonstrip/*` packages on npm. Site live at **https://toonstrip.danielkimdev.com**.
**Deploy:** Cloudflare Pages `toonstrip`, GitHub integration; push to `main` deploys
prod (`wrangler.toml` output dir `site/dist`; root `pnpm build` is the build).

## Last Session

2026-09-04: Site docs page for the packager (`site/src/content/docs/asset-packager.mdx`,
Reference, order 17) covering both input paths, the join, and errors vs warnings, with a
cross-link from `asset-packs.mdx`; site builds. Published
**`@toonstrip/asset-packager` 0.2.0** to npm (33 tests green; tarball verified, its
`@toonstrip/core` workspace dep rewritten to 0.1.7). Then a repo-wide over-engineering
audit → **`PONYTAIL_AUDIT.md`**: 46 ranked findings, ~2,400 hand-written lines + ~700
generated + 9 deps cuttable. Nothing applied.

## Next Actions

1. **Work `PONYTAIL_AUDIT.md`** in its suggested order: dead files/deps first (no
   behaviour change), then the packager cuts, then the schema's ajv removal (biggest
   single win), then the upstream-shared core cuts as one batch per `UPSTREAM_SYNC.md`.
2. **S9 Korean locale** per `SITE_DEV_PLAN.md` §13 — M8-M13 all done, so this is
   unblocked (per that plan: land English content once, not twice).
3. **Daniel:** copy pass in his voice over `index.astro`/`docs/*.mdx`; link the site
   from `danielkimdev.com`.
4. If usage warrants: per-page OG images, Pagefind, short-link Worker (§9); a Nuxt wrapper.

## Open Issues

- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only);
  `toonstrip-pack validate` does catch it on the source side. Playwright verify scripts
  are manual-only (`NOTES.md` M1–M5).
- `next-reference.mdx:57` passes `Callout kind="warn"`, outside the component's union —
  renders unstyled. One-word fix, found during the audit.
- `renderPlaceholder` needs `@toonstrip/cli` as the consuming app's own direct dep (not
  just transitive via `next`) plus `serverExternalPackages` in `next.config` — see
  `docs/next.md` "Native dependency". Packaging papercut, not a bug.
