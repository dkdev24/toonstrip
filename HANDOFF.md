# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

## Current Version

**0.15.7** (npm: schema 0.1.3, core 0.1.9, element 0.1.11, astro 0.1.13, packs 0.1.1,
asset-packager **0.3.0** (bumped, not yet published — see Next Actions), cli 0.2.4,
react 0.1.3, vue 0.1.2, next 0.1.2)

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data, generalized from `grues-in-comic`'s comic pane (Zork/game/AI
coupling stripped). M0–M15 of `TOONSTRIP_DEV_PLAN.md` done. 11 packages on npm. Site live
at **https://toonstrip.danielkimdev.com**. **Deploy:** Cloudflare Pages `toonstrip`; push
to `main` deploys prod (output `site/dist`; root `pnpm build` is the build).

## Last Session

2026-09-07: Odyssey's full pack build (`toonstrip-pack build --preview joins.png`) showed
every character's head floating off its body — root-caused to three real bugs, all
fixed, full detail in `WORKLOG.md` v0.15.7: (1) a row-boundary search could drift through
a sheet's own next-row label into its art, corrupting the face join; (2) the written
face spec ("short neck stub") didn't match the actual `pack-comic-chat` reference art
(zero neck) — corrected the doc, the guide, and added a chin-line crop; (3) no mechanism
existed to make a head smaller than ~1:1 against its torso — added `faceScale`
(pack-wide/per-character), applied once at pack time in `pack.ts`, zero changes to
`@toonstrip/core`. `asset-packager` bumped 0.2.5 -> 0.3.0 (not yet published). One
follow-up NOT fixed: odysseus's torso art has guide-line noise baked into its headroom
that a position- or color-based crop couldn't safely remove without risking real art
(tried, reverted) — needs a manual source-art touch-up, tracked as a known issue below.

## Next Actions

1. **Publish `@toonstrip/asset-packager@0.3.0`** (`pnpm publish` from
   `packages/asset-packager`, never plain `npm publish`), then update
   `whatifclassics/story-pack-generator/toonstrip-poc`'s pin and rebuild Odyssey against
   the real published version to confirm parity with the local-tarball test.
2. Manually clean up odysseus's `torso-NEUTRAL` source art (guide-line noise in its
   headroom pulls the join up off the true collar) — see Known Open Items.
3. **Daniel reviews the KO copy** (docs, strips, UI strings) and signs off — §13.6's last
   unchecked exit criterion, still open from before this session.
4. Run an axe accessibility pass and Lighthouse mobile score on a few `/ko/` routes
   (§13.6 exit criteria; not yet measured).

## Open Issues

- **Publishing needs care here**: `workspace:*` deps require `pnpm publish`, never plain
  `npm publish` (now also an `AGENTS.md` rule after recurring twice — 0.2.1, 0.2.4). Verify
  with `npm view <pkg>@<version> dependencies` that no `workspace:*` leaked through, and a
  new `@toonstrip/core` export must publish *before* any consumer depending on it. After a
  publish, `npm view`/`install` can lag ~1 min — a same-version republish 403'ing as
  "already published" confirms it went through, don't assume failure from stale metadata.
- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only).
- Odyssey's `torso-NEUTRAL.png` (odysseus only) has the template guide's dashed lines
  baked into its headroom margin, pulling the torso's alpha box — and its join — up off
  the true collar; visible as a small head/body gap once `faceScale` shrinks the head
  enough to stop camouflaging it. Not fixed in code (see `WORKLOG.md` v0.15.7): needs a
  manual edit to that one source PNG, not another automated pass — a position-based crop
  breaks gesture poses (a raised arm legitimately uses that same headroom) and a
  color-based one ate into his actual armor art (similar grey to the guide's).
