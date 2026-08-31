# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.5.0**

---

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip (panels,
characters, poses, balloons, backdrops) from caller-supplied data. Extraction +
generalization of `grues-in-comic`'s comic pane, stripped of Zork/game/AI-inference
coupling. M0-M3 done; M4+ not started. Full history in `WORKLOG.md`.

---

## Last Session

M3 complete: `<comic-strip>` custom element (`packages/element`) — canvas pool,
`ResizeObserver` relayout, `IntersectionObserver` gating, dpr backing store, Shadow DOM,
per-panel ARIA — plus a fetch-based browser pack loader and a plain-HTML demo. Both exit
criteria verified against real headless Chromium: live column count matches
`layoutStrip`'s 3/2/1 policy, 0 axe violations. 65 tests passing. See `WORKLOG.md` v0.5.0
and `NOTES.md` "M3" (notably: ajv has no browser/ESM build).

---

## Next Actions

1. Claim `toonstrip` on npm and the `@toonstrip` org (open, not blocking dev work).
2. Start M4 (§10, §7): `packages/astro` + `examples/astro-blog` — thin Astro wrapper
   around `packages/element`, `client:visible` as default. Resolve the pack-name-vs-URL
   question in `NOTES.md` "M3" (Astro's `packs={['comic-chat']}` takes names; the element
   only takes URLs).
3. Before M6: fix the ajv/browser-build gap (`NOTES.md` "M3").

---

## Open Issues

- npm org/package name (`toonstrip`, `@toonstrip`) not yet claimed.
- `CastManifest`/`PackedAvatar` types duplicated across packages, not shared via
  `packages/schema` (`NOTES.md` "M2").
- `docs/packs.md` not written yet — deferred to M5.
- `@toonstrip/schema`'s ajv dependency has no ESM/browser build (`NOTES.md` "M3").
- `verify-demo.mjs` (Playwright + axe) is manual-only, not wired into CI.
