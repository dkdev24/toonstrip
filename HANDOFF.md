# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.6.0**

---

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip (panels,
characters, poses, balloons, backdrops) from caller-supplied data. Extraction +
generalization of `grues-in-comic`'s comic pane, stripped of Zork/game/AI-inference
coupling. M0-M4 done; M5 (docs, contribution guide, 2nd example pack) not started. Full
history in `WORKLOG.md`.

---

## Last Session

M4 complete: `packages/astro` (a hand-rolled Astro renderer, not `@astrojs/lit` — see
`NOTES.md` "M4") wrapping `packages/element`'s `<comic-strip>`, plus `examples/astro-blog`
with one hand-written blog post. Both exit criteria verified in real headless Chromium
against a live `astro dev` server *and* a production `astro build`: real assets render,
and `client:visible` genuinely defers load/render until scroll. 50 tests passing.

---

## Next Actions

1. Claim `toonstrip` on npm and the `@toonstrip` org (open, not blocking dev work).
2. Start M5 (§10): `docs/packs.md` + schema docs + contribution guide + a second, small,
   original (non-Comic-Chat) example pack. Exit: an outside contributor (or fresh agent
   session) follows the docs alone to add one character and see it render.
3. Before M6: fix ajv's browser-build gap, decide on Playwright+axe in CI (`NOTES.md`
   "M3"), revisit `devToolbar: false` for real use (`NOTES.md` "M4").

---

## Open Issues

- npm org/package name (`toonstrip`, `@toonstrip`) not yet claimed.
- `CastManifest`/`PackedAvatar` types duplicated across packages (`NOTES.md` "M2").
- `@toonstrip/schema`'s ajv dependency has no ESM/browser build (`NOTES.md` "M3").
- Playwright-based verify scripts are manual-only, not wired into CI yet.
- `packages/astro`'s custom renderer is only tested against Astro 7.2.9 (`NOTES.md` "M4").
