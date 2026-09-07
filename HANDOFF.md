# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

## Current Version

**0.15.8** (npm: schema 0.1.3, core 0.1.9, element 0.1.11, astro 0.1.13, packs 0.1.1,
asset-packager **0.4.0** (bumped twice now, not yet published — see Next Actions), cli
0.2.4, react 0.1.3, vue 0.1.2, next 0.1.2)

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data, generalized from `grues-in-comic`'s comic pane (Zork/game/AI
coupling stripped). M0–M15 of `TOONSTRIP_DEV_PLAN.md` done. 11 packages on npm. Site live
at **https://toonstrip.danielkimdev.com**. **Deploy:** Cloudflare Pages `toonstrip`; push
to `main` deploys prod (output `site/dist`; root `pnpm build` is the build).

## Last Session

2026-09-08: An AI-generated asset pack test ("Odysseus") was shelved — image-model
non-determinism can't reliably hit the packager's precision needs. That led to auditing
Microsoft's newly open-sourced Comic Chat: its original coordinates were hand-typed by a
person measuring finished art, no registration, no drag editor. Prototyped AI doing that
measuring instead — blind test landed within `register()`'s ±14% tolerance for NEUTRAL
poses — and shipped `toonstrip-pack anchor-guide`, a CLI command that renders a
character's NEUTRAL art with a pixel grid for a human/AI to read the join point off, into
the existing `anchors` field (`asset-packager` 0.3.0 -> 0.4.0). Also decided packs should
share as a single `.zip`, not `.AVB`. Full detail: `NOTES.md`'s "Post-M15" entries,
`WORKLOG.md` v0.15.8.

## Next Actions

1. **Publish `@toonstrip/asset-packager@0.4.0`** (`pnpm publish`, never `npm publish` —
   ships this session's `anchor-guide` plus the prior session's `faceScale`/join fixes).
2. Decide on a `.zip`-pack loader for `@toonstrip/element` and/or per-pose anchor
   overrides (`NOTES.md`; neither started).
3. Odysseus's `torso-NEUTRAL` art touch-up and the KO copy review + axe/Lighthouse pass
   on `/ko/` are both carried over, unrelated to this session (see Open Issues, §13.6).

## Open Issues

- **Publishing needs `pnpm publish`, never plain `npm publish`** (`workspace:*` deps;
  `AGENTS.md` rule after recurring twice; verify with `npm view <pkg>@<version> dependencies`).
- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only).
- `anchor-guide` only guides per-pose files, not a sheet-sourced NEUTRAL cell — refuses
  clearly rather than guiding the wrong image; unscoped for now, not a bug.
- Odyssey's `torso-NEUTRAL.png` has guide-line noise baked into its headroom, pulling its
  join off the true collar — needs manual art touch-up (auto-crop attempts reverted, see
  `WORKLOG.md` v0.15.7).
