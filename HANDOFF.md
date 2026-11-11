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

2026-11-11 (Dependabot security bumps, **pushed**; no version bump, no publish): 104 open alerts → 2 left. undici 8.10.1→8.12.4, vite 8.2.2→8.3.7 + examples vite 5→6.4.6, vitest 2.1.9→4.1.12 (11 packages, `^4.1.11`), devalue→6.0.3, next→15.5.29, zod→4.6.7, astro→7.4.8, sharp→0.35.5, postcss→8.5.32 (override in `pnpm-workspace.yaml`: next pins 8.4.31), esbuild→0.25.12, brace-expansion→5.0.12, smol-toml→1.9.1, source-map-js→1.2.2; tinypool gone with vitest 4. Full `pnpm -r run test` green except 2 pre-existing asset-packager timeouts (slow VM; identical on pristine tree); `pnpm -r run build` green. Left open: glob 13.0.7 + minimatch 10.2.6 (major bumps blocked by js-beautify/glob ranges; not forced). VM notes: `pnpm` was missing (installed 11.1.1 globally); repo files were gid `nogroup`, which broke pnpm's atomic lockfile write (`chgrp -R root` fixed it); /tmp (512M tmpfs) filled by pnpm's version-manager store — cleared, use `TMPDIR=~/tmp` for heavy runs.

## Next Actions

1. **Publish `@toonstrip/asset-packager@0.4.0`** (`pnpm publish`, never `npm publish`;
   ships `anchor-guide` plus the earlier `faceScale`/join fixes).
2. **M16 S0 is GO, confirmed at 4K** (MediaPipe, 9/9, 4.3% neck spread vs ±14%; heads
   0.7x of `spec.cell` 256). Next: start **S1** (`anchor-guide --measure`). S3's cut must
   be region-based — a scanline amputates a raised hand on face swap (`odyssey-poc/crossmix.png`). Details in `NOTES.md`.
3. `.zip`-pack loader / per-pose anchor overrides (unstarted); Odysseus `torso-NEUTRAL`
   touch-up; KO copy + axe/Lighthouse on `/ko/` (§13.6).

## Open Issues

- **Dependabot: glob 13.0.7 + minimatch 10.2.6 still open** (2 alerts). Patches need majors (glob 14.0.2, minimatch 11.0.1) blocked by js-beautify@2.0.3's glob ^13 range; not forced (see 2026-11-11 WORKLOG).
- **Publish with `pnpm publish`, never `npm publish`** (`workspace:*` deps; verify with
  `npm view <pkg>@<version> dependencies`).
- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only).
- Odyssey's `torso-NEUTRAL.png` has guide-line noise in its headroom, pulling its join off
  the true collar. Needs manual touch-up (auto-crop reverted, `WORKLOG.md` v0.15.7).
