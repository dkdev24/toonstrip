# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

## Current Version

**0.15.1** (npm: schema 0.1.3, core 0.1.7, element 0.1.8, astro 0.1.11, cli 0.2.1, packs
0.1.1, react/vue/next 0.1.0, asset-packager 0.2.0)

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data, generalized from `grues-in-comic`'s comic pane (Zork/game/AI
coupling stripped). M0–M15 of `TOONSTRIP_DEV_PLAN.md` done. 11 packages on npm. Site live
at **https://toonstrip.danielkimdev.com**. **Deploy:** Cloudflare Pages `toonstrip`; push
to `main` deploys prod (output `site/dist`; root `pnpm build` is the build).

## Last Session

2026-09-05: Worked `PONYTAIL_AUDIT.md` autonomously — 32 more items landed (34/46 total, 4
partial), ~700 generated lines + 7 deps dropped, ~866 hand-written lines net removed.
Commits `5413998`, `6c48463`, `232d49e` (dedup/dead-code) and `f91aa64` (#1: ajv+esbuild
schema validator replaced with a hand-rolled recursive checker over an embedded
`schema.json` literal — same `instancePath`/`message` contract, verified byte-for-byte
against ajv's old output). `pnpm build`/`pnpm test` green throughout, re-verified
independently. A few "zero caller" claims turned out stale on re-check (kept, not cut) —
see `PONYTAIL_AUDIT.md`'s Progress section for the full per-item ledger.

## Next Actions

1. **Fix `site`'s Playwright suite** — 8/8 playground specs fail, pre-existing. Blocks
   #12 (`json-position.ts` rewrite) from being verified by more than a green build.
2. **Upstream port to `grues-in-comic`** per `UPSTREAM_SYNC.md`: #18 (`layout.ts`), #37
   (`balloon.ts`), #38's `normalizeAngle` (`pose.ts`) landed toonstrip-side only; #3/#14/
   #16/#19/#28 never attempted (need ADR + gate/density + a publish cascade — your
   go-ahead required per that doc's Safety section).
3. **#4** — `@toonstrip/next` deprecation is a product decision (migration note needed),
   not a cleanup; still on the table.
4. **S9 Korean locale** per `SITE_DEV_PLAN.md` §13 — unblocked, M8-M13 done.

## Open Issues

- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only);
  `toonstrip-pack validate` does catch it on the source side.
- `site`'s 8 playground e2e specs all fail (pre-existing); other Playwright scripts are
  manual-only (`NOTES.md` M1–M5).
- `next-reference.mdx:57` passes `Callout kind="warn"`, outside the component's union —
  renders unstyled. One-word fix, found during the audit.
- `renderPlaceholder` needs `@toonstrip/cli` as the app's own direct dep plus
  `serverExternalPackages` in `next.config` — `docs/next.md`. Papercut, not a bug.
