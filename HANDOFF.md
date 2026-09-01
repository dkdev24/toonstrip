# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.7.2**

---

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data. Extraction + generalization of `grues-in-comic`'s comic pane,
stripped of Zork/game/AI-inference coupling. M0–M6 done: all 7 `@toonstrip/*` packages
published to npm at 0.1.0/0.1.1/0.1.3 (per-package, not lockstep). M7 (introduction site
+ playground, deployed to toonstrip.danielkimdev.com) added as a new milestone, not yet
started. Full history in `WORKLOG.md`.

---

## Last Session

Fixed two bugs in `packages/astro` (v0.7.2, see `WORKLOG.md`) found by dogfooding: a live
`<ComicStrip client:visible>` embedded in Daniel's `danielkimdev-astro` blog silently
rendered nothing under `npm run dev`.

1. **`renderer/server.ts`**: the SSR placeholder tag had zero size, which defeats
   `client:visible`'s `IntersectionObserver` trigger in Chromium (never reports a
   zero-area target as intersecting) — fixed with a non-zero inline `min-height`.
2. **`integration.ts`**: `<ComicStrip>` is reachable client-side only through an
   astro-island's runtime-computed `import(url)`, invisible to Vite's dev-server
   dependency crawl — which left `@toonstrip/schema`'s CJS `ajv` dependency served
   unbundled and throwing. Fixed by having the integration add `ajv` to
   `vite.optimizeDeps.include` via `updateConfig` at `astro:config:setup`, so every
   consumer gets it pre-bundled automatically. This is the M3 ajv/browser gap in
   `NOTES.md`, partially closed — see Open Issues.

Verified via the full test suite (43 tests, `schema`/`core`/`element`/`astro`) and
end-to-end against `danielkimdev-astro` by copying this repo's built `dist/` into that
site's `node_modules` (not a real npm install — **not yet published**, see Open Issues).

---

## Next Actions

1. **Publish `@toonstrip/astro` and `@toonstrip/schema`** with the v0.7.2 fixes (bump
   both package versions first — `astro` is at 0.1.3, `schema` at 0.1.1 on npm, neither
   reflects this session's changes). `danielkimdev-astro` is currently running these
   fixes only via a manual `dist/` copy into its `node_modules`, which a real
   `npm install` there would silently undo.
2. Start M7: design + build the intro/playground site (§10 in `TOONSTRIP_DEV_PLAN.md`),
   grown from `examples/astro-blog` or purpose-built. Deploy to
   toonstrip.danielkimdev.com at the end.
3. Verify `npm install @toonstrip/core` (etc.) works from a clean machine per the
   README's copy-paste example.
4. Read `NOTES.md` in full — judgment calls from M1–M5 made without a human in the loop
   are logged there.

---

## Open Issues

- **Not published:** v0.7.2's fixes (`packages/astro`) exist only in this working tree.
- M7 (intro/playground site) not started; toonstrip.danielkimdev.com not yet deployed.
- `@toonstrip/schema`'s ajv dependency still has no real ESM/browser build for
  *unbundled* consumers (plain `<script type="module">`, no Vite/webpack/etc.) —
  v0.7.2 only fixed the Vite-bundled case (`NOTES.md` "M3"). Still needs either a
  pre-bundled `dist/browser.js` with `ajv` inlined, or a validator swap.
- `toonstrip pack validate` doesn't check for a missing torso, only a missing NEUTRAL
  face — a pack can pass validation and still render nothing (`NOTES.md` "M5").
- Playwright verify scripts are manual-only, not wired into CI yet.
- See `NOTES.md` for everything else flagged across M1–M5.
