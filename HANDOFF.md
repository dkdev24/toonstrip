# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

## Current Version

**0.15.8** (npm: schema 0.1.3, core 0.1.9, element 0.1.11, astro 0.1.13, packs 0.1.1,
asset-packager **0.4.0** (unpublished, see Next Actions), cli 0.2.4, react 0.1.3,
vue 0.1.2, next 0.1.2)

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data, generalized from `grues-in-comic`'s comic pane (Zork/game/AI coupling
stripped). M0–M15 done, 11 packages on npm, site live at
**https://toonstrip.danielkimdev.com**. **Deploy:** Cloudflare Pages `toonstrip`; push to
`main` deploys prod (output `site/dist`; root `pnpm build` is the build).

## Last Session

2026-09-16/17: Researched why AI-generated packs keep missing the packager's precision
needs. Answer from 2D game rigging (Spine, DragonBones, Unity PSD Importer, Godot): the
joint is metadata authored against finished art, never a drawing constraint. Our
`anchors`/`register()` join is already that shape; the missing piece is an automated
measuring step. Filed as **M16** (`TOONSTRIP_DEV_PLAN.md` §16, 5 stages). Then
ran **S0** on a new 3x3 whole-figure Odysseus sheet, at 1254px then 4096px: **GO** —
MediaPipe (no torch) hit 9/9 cells both times, 4.3% neck spread vs ±14%. Seam test passed
at the join, killed the scanline cut. `NOTES.md`; scripts `odyssey-poc/s0/`. No package
code changed.

## Next Actions

1. **Publish `@toonstrip/asset-packager@0.4.0`** (`pnpm publish`, never `npm publish`;
   ships `anchor-guide` plus the earlier `faceScale`/join fixes).
2. **M16 S0 is GO, confirmed at 4K** (MediaPipe, 9/9, 4.3% neck spread vs ±14%; heads
   0.7x of `spec.cell` 256). Next: start **S1** (`anchor-guide --measure`). S3's cut must
   be region-based — a scanline amputates a raised hand on face swap
   (`odyssey-poc/crossmix.png`). Details in `NOTES.md`.
3. `.zip`-pack loader and/or per-pose anchor overrides; neither started. 4. Carried over:
   Odysseus `torso-NEUTRAL` touch-up, KO copy + axe/Lighthouse on `/ko/` (§13.6).

## Open Issues

- **Publish with `pnpm publish`, never `npm publish`** (`workspace:*` deps; verify with
  `npm view <pkg>@<version> dependencies`).
- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only).
- `anchor-guide` only guides per-pose files, not a sheet-sourced NEUTRAL cell; refuses
  clearly rather than guiding the wrong image. Unscoped, not a bug.
- Odyssey's `torso-NEUTRAL.png` has guide-line noise in its headroom, pulling its join off
  the true collar. Needs manual touch-up (auto-crop reverted, `WORKLOG.md` v0.15.7).
