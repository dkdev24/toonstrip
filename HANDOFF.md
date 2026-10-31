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

2026-10-31 (docs fix, **not pushed**): fixed 45 broken `npx toonstrip` /
`npx toonstrip-pack` invocations across 13 files — those package names don't exist on npm;
rewritten as `npx -p @toonstrip/cli toonstrip …` / `npx -p @toonstrip/asset-packager
toonstrip-pack …` (both verified via `--help`). FAQ "How big is it?" now says ~36 KB
gzipped (measured on published builds). Workspace + site build green (46 pages).
Committed as `1164a83`; push pending Daniel's approval (main = prod).

## Previous Session
2026-10-25: site only (GA consent banner + `/privacy/`, CSP; fixed Pages watch paths
`**` → `*`). Detail in WORKLOG.md.

## Next Actions

1. **Publish `@toonstrip/asset-packager@0.4.0`** (`pnpm publish`, never `npm publish`;
   ships `anchor-guide` plus the earlier `faceScale`/join fixes).
2. **M16 S0 is GO, confirmed at 4K** (MediaPipe, 9/9, 4.3% neck spread vs ±14%; heads
   0.7x of `spec.cell` 256). Next: start **S1** (`anchor-guide --measure`). S3's cut must
   be region-based — a scanline amputates a raised hand on face swap
   (`odyssey-poc/crossmix.png`). Details in `NOTES.md`.
3. `.zip`-pack loader / per-pose anchor overrides (unstarted); Odysseus `torso-NEUTRAL`
   touch-up; KO copy + axe/Lighthouse on `/ko/` (§13.6).

## Open Issues

- **Publish with `pnpm publish`, never `npm publish`** (`workspace:*` deps; verify with
  `npm view <pkg>@<version> dependencies`).
- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only).
- Odyssey's `torso-NEUTRAL.png` has guide-line noise in its headroom, pulling its join off
  the true collar. Needs manual touch-up (auto-crop reverted, `WORKLOG.md` v0.15.7).
