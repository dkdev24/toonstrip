# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

## Current Version

**0.15.9** (repo; npm: schema 0.1.3, core 0.1.9, element 0.1.11, astro 0.1.13, packs 0.1.1,
asset-packager **0.4.0** (unpublished, see Next Actions), cli 0.2.4, react 0.1.3,
vue 0.1.2, next 0.1.2)
Toolchain: Node 24 (`.nvmrc` 24.22.1) since 0.15.9; first git tag + GitHub release.

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data, generalized from `grues-in-comic`'s comic pane (Zork/game/AI coupling
stripped). M0–M15 done, 11 packages on npm, site live at
**https://toonstrip.danielkimdev.com**. **Deploy:** Cloudflare Pages `toonstrip`; push to
`main` deploys prod (output `site/dist`; root `pnpm build` is the build).

## Last Session

2026-10-31 (AEO pass, **not pushed**): FAQPage JSON-LD on `/docs/faq/` (EN+KO, parsed from
the `## question` mdx via new `site/src/lib/faq-schema.ts`; `Docs.astro` forwards a `head`
slot to `Base.astro`) + SoftwareApplication JSON-LD on homepage; homepage FAQ section
(4 Q&As, natural KO copy) + full-FAQ link; `noindex` on EN+KO 404s; `docs/index.astro`
description now i18n; README gained the "Why not an image?" comparison table + FAQ.
Build green (46 pages); JSON-LD verified (12 Q&As EN+KO); budgets + validate-strips pass.
Committed as `f4d5649`; push pending (main = prod).

## Previous Session
2026-10-31 (docs fix, pushed 15:17 KST): 45 broken `npx toonstrip` invocations fixed across
13 files; FAQ size → ~36 KB gzipped. Detail in WORKLOG.md.

## Next Actions

1. **Publish `@toonstrip/asset-packager@0.4.0`** (`pnpm publish`, never `npm publish`;
   ships `anchor-guide` plus the earlier `faceScale`/join fixes).
2. **M16 S0 is GO, confirmed at 4K** (MediaPipe, 9/9, 4.3% neck spread vs ±14%; heads
   0.7x of `spec.cell` 256). Next: start **S1** (`anchor-guide --measure`). S3's cut must
   be region-based — a scanline amputates a raised hand on face swap (`odyssey-poc/crossmix.png`). Details in `NOTES.md`.
3. `.zip`-pack loader / per-pose anchor overrides (unstarted); Odysseus `torso-NEUTRAL`
   touch-up; KO copy + axe/Lighthouse on `/ko/` (§13.6).

## Open Issues

- **Publish with `pnpm publish`, never `npm publish`** (`workspace:*` deps; verify with
  `npm view <pkg>@<version> dependencies`).
- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only).
- Odyssey's `torso-NEUTRAL.png` has guide-line noise in its headroom, pulling its join off
  the true collar. Needs manual touch-up (auto-crop reverted, `WORKLOG.md` v0.15.7).
