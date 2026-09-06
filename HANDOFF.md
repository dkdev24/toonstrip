# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

## Current Version

**0.15.6** (npm, all internally consistent: schema 0.1.3, core 0.1.9, element 0.1.11,
astro 0.1.13, packs 0.1.1, asset-packager 0.2.5, cli 0.2.4, react 0.1.3, vue 0.1.2, next
0.1.2)

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data, generalized from `grues-in-comic`'s comic pane (Zork/game/AI
coupling stripped). M0–M15 of `TOONSTRIP_DEV_PLAN.md` done. 11 packages on npm. Site live
at **https://toonstrip.danielkimdev.com**. **Deploy:** Cloudflare Pages `toonstrip`; push
to `main` deploys prod (output `site/dist`; root `pnpm build` is the build).

## Last Session

2026-09-06: Driven by a real consumer exercising M15 (sheet input) for the first time —
WhatIfClassics's Odyssey PoC, 5 characters via `toonstrip-pack template` + Gemini (full
punch list: `NOTES.md`'s new M15 section). Fixed real bugs in `template.ts`'s character
guide (dead-symmetric with no facing convention though the renderer mirrors art rather
than re-angling it; described a waist-cropped bust when the real format is a full
standing body; zero headroom for the default gesture poses) and in `sheet.ts` (poses now
auto-corrected for scale instead of only warned about — took a real pack from 6
errors/87 warnings to 0/16). `docs/asset-image-spec.md` §3 corrected to match. Published
`asset-packager@0.2.4` via plain `npm publish` by mistake (unresolved `workspace:*`, same
failure as 0.2.1) — fixed as 0.2.5 with `pnpm publish`; the rule now lives in `AGENTS.md`.

## Next Actions

1. **Daniel reviews the KO copy** (docs, strips, UI strings) and signs off — §13.6's last
   unchecked exit criterion, still open from before this session.
2. Run an axe accessibility pass and Lighthouse mobile score on a few `/ko/` routes
   (§13.6 exit criteria; not yet measured).
3. Consider an `asset-image-spec.md`/`asset-sheets.md` prose pass on the facing-direction
   and full-body-torso conventions (`NOTES.md`'s M15 section), not just `template.ts`'s
   generated prompt text.

## Open Issues

- **Publishing needs care here**: `workspace:*` deps require `pnpm publish`, never plain
  `npm publish` (now also an `AGENTS.md` rule after recurring twice — 0.2.1, 0.2.4). Verify
  with `npm view <pkg>@<version> dependencies` that no `workspace:*` leaked through, and a
  new `@toonstrip/core` export must publish *before* any consumer depending on it. After a
  publish, `npm view`/`install` can lag ~1 min — a same-version republish 403'ing as
  "already published" confirms it went through, don't assume failure from stale metadata.
- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only).
