# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.2.0**

---

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip (panels,
characters, poses, balloons, backdrops) from caller-supplied data. Extraction +
generalization of `grues-in-comic`'s comic pane, stripped of Zork/game/AI-inference
coupling. M0 done; M1+ not started. Full history in `WORKLOG.md`.

---

## Last Session

M0 complete: pnpm workspace, MIT `LICENSE`, CI skeleton, `packages/schema` (v1 document
types + JSON Schema + ajv validator, 4 tests passing, build + Node smoke-test verified).
See `WORKLOG.md` v0.2.0 for detail.

---

## Next Actions

1. Claim `toonstrip` on npm and the `@toonstrip` org (open, not blocking dev work).
2. Start M1 (§10): port rendering core from `/Users/daniel/Sites/grues-in-comic`
   (`web/src/comic/{render,balloon,balloon-layout,figure,backdrop,layout}.ts`,
   `art/src/{pose,format}.ts`) into `packages/core`. Skip `mapper.ts`/`script.ts`/
   `director.ts`/`page.ts`/`affect.ts` (leave-behind). Target: fixture 3-panel doc
   renders to PNG via `@napi-rs/canvas`; no web component yet.

---

## Open Issues

- npm org/package name (`toonstrip`, `@toonstrip`) not yet claimed.
- Default backdrop pack (`field`, `pastoral`, `room8bs` BMPs) needs fresh conversion for
  M2 — `grues-in-comic` never decoded these.
- Schema validator is structural only; no cross-check against registered asset packs yet
  (needs pack system, §6, M2+).
