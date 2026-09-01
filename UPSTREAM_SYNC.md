# UPSTREAM_SYNC.md

How a comic-rendering change propagates across the three linked repos. Read this before
touching `packages/core/src/{balloon,balloon-layout,figure,pose,layout,render}.ts`, and
follow it every time such a change ships.

## The chain

```
grues-in-comic  <-- manual, either-direction port -->  toonstrip  --npm publish-->  danielkimdev-astro
(original engine,                                    (generalized,                  (leaf consumer,
 web/src/comic/*)                                     published to npm)              @toonstrip/astro only)
```

- **grues-in-comic ↔ toonstrip** is *not* a package dependency — each repo carries its own
  copy of the shared mechanical-layer logic (balloon layout, figure compositing, pose
  selection, panel layout). They diverge unless someone manually ports a fix each way.
  Direction runs both ways: toonstrip found+fixed the narrow-balloon overlap bug
  (`WORKLOG.md` v0.7.6) that didn't exist in grues-in-comic; separately, toonstrip was
  found to be missing a collision-safe hash delimiter grues-in-comic already had
  (`WORKLOG.md` v0.7.7) — ported the other direction.
- **toonstrip → danielkimdev-astro** *is* a real npm dependency chain:
  `@toonstrip/astro` → `@toonstrip/element` → `@toonstrip/core`. This leg is one-directional
  and mechanical once the fix is in `packages/core`.

## Where the shared logic lives

| Concern | grues-in-comic | toonstrip |
|---|---|---|
| Balloon geometry, wrap, chrome | `web/src/comic/balloon.ts` | `packages/core/src/balloon.ts` |
| Multi-balloon layout driver | `web/src/comic/balloon-layout.ts` | `packages/core/src/balloon-layout.ts` |
| Figure compositing | `web/src/comic/figure.ts` | `packages/core/src/figure.ts` |
| Pose/emotion-wheel selection | `web/src/comic/figure.ts` (no separate file) | `packages/core/src/pose.ts` |
| Panel/camera layout | `web/src/comic/layout.ts` | `packages/core/src/layout.ts` |
| Panel rendering | `web/src/comic/render.ts` (also carries N-participant/mob code toonstrip doesn't have) | `packages/core/src/render.ts` |

**Not shared, don't port either way:** grues-in-comic's `mapper.ts`, `page.ts`,
`director.ts`, `script.ts`, `affect.ts`, `backdrop.ts` (Zork/game/AI-inference coupling,
intentionally stripped — see `TOONSTRIP_DEV_PLAN.md` §0 non-goals); toonstrip's schema
generalizations that have no grues-in-comic counterpart (e.g. `BalloonKind` replacing
Comic Chat's internal class names).

## When you fix or improve something in the shared layer

1. **Check the sibling repo for the same code.** Not everything is shared (table above) —
   only port if the function/logic genuinely exists on both sides.
2. **Port the fix to the other repo**, respecting *its* constraints:
   - **Into grues-in-comic:** `web/src/comic/*` is a cited, historically-faithful port of
     Comic Chat's 1996 source (ADR 0008 there). A behavioral change must be written up as
     a **named divergence** in `docs/adr/0008-*.md` (cite the original source line, explain
     why the trade is worth it), then `npm run gate` (pixel-parity) and `npm run density`
     (dialogue-density baseline) must be re-run, the actual output PNGs eyeballed for
     regressions, and only then `gate:accept`/`density:accept`. See its
     `docs/TOONSTRIP_SYNC.md` for the full checklist.
   - **Into toonstrip:** no historical-fidelity constraint — port directly, add/update
     tests under `packages/core/test/`.
3. **Bump the patch version and update `HANDOFF.md`/`WORKLOG.md`** in whichever repo(s)
   changed, per each repo's own existing convention.
4. **If `packages/core` changed, the fix must cascade through the whole publish chain** —
   bump and `pnpm publish` **all three** of `@toonstrip/core`, `@toonstrip/element`,
   `@toonstrip/astro` in that order, even if only `core`'s logic changed. `workspace:*`
   resolves to a real version *at each package's own publish time*, not retroactively — a
   package published before you re-published its dependency stays pinned to the old one.
   This has bitten this project twice (`WORKLOG.md` v0.7.5, and again for `@toonstrip/schema`
   in a prior session) — do not skip a link in the chain.
5. **Propagate to `danielkimdev-astro`:** bump its `package.json` dependency on
   `@toonstrip/astro` to the new version, `npm install`, `npm run build`, then verify with a
   local `astro preview` + a real browser screenshot of a post using `<ComicStrip>` (e.g.
   `/blog/grues-in-comic-beta/`) before committing — it's a deployed site. See its
   `dev-references/toonstrip-sync.md`.

## Safety

Every `pnpm publish` and every `git push` in this chain is either irreversible (npm) or
touches a production site (the blog's Cloudflare Pages deploy triggers on push to `main`).
Confirm scope with the user before a publish cascade and before each repo's push, unless
the session has been given standing authorization to run the whole chain autonomously.
