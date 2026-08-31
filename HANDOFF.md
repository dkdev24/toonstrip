# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.4.0**

---

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip (panels,
characters, poses, balloons, backdrops) from caller-supplied data. Extraction +
generalization of `grues-in-comic`'s comic pane, stripped of Zork/game/AI-inference
coupling. M0-M2 done; M3+ not started. Full history in `WORKLOG.md`.

---

## Last Session

M2 complete: default asset pack (`packages/pack-comic-chat`, 15 characters + 3 converted
backdrops, MIT NOTICE carried forward), `packages/cli`'s `toonstrip pack validate`, and
`packages/core`'s fixture/example now render with the real pack instead of placeholders.
45 tests passing workspace-wide. Judgment calls logged in `NOTES.md` "M2". Full detail:
`WORKLOG.md` v0.4.0.

---

## Next Actions

1. Claim `toonstrip` on npm and the `@toonstrip` org (open, not blocking dev work).
2. Start M3 (§10): `packages/element`, the `<comic-strip>` custom element — port
   responsive layout + canvas pool + `ResizeObserver` + a11y from `grues-in-comic`'s
   `web/src/comic-view.ts`, wrapping `packages/core`. Plain-HTML demo, no framework.
   `pack-comic-chat`'s loader returns absolute filesystem paths (Node-only) — needs a
   URL-based loading strategy for a browser consumer (`NOTES.md` "M2").
3. Exit criteria: resizing the window changes column count live; a11y check passes.

---

## Open Issues

- npm org/package name (`toonstrip`, `@toonstrip`) not yet claimed.
- `CastManifest`/`PackedAvatar` types duplicated (`packages/core` and
  `packages/pack-comic-chat`) instead of shared from `packages/schema` (`NOTES.md` "M2").
- `docs/packs.md` not written yet — deferred to M5 per the milestone table.
- `toonstrip pack validate` has no multi-pack id collision detection yet.
