# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

## Current Version

**0.15.8** (npm, all internally consistent: schema 0.1.3, core 0.1.9, element 0.1.11,
astro 0.1.13, packs 0.1.1, asset-packager 0.2.1, cli 0.2.4, react 0.1.3, vue 0.1.2, next
0.1.2)

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data, generalized from `grues-in-comic`'s comic pane (Zork/game/AI
coupling stripped). M0–M15 of `TOONSTRIP_DEV_PLAN.md` done. 11 packages on npm. Site live
at **https://toonstrip.danielkimdev.com**. **Deploy:** Cloudflare Pages `toonstrip`; push
to `main` deploys prod (output `site/dist`; root `pnpm build` is the build).

## Last Session

2026-09-05: Published `asset-packager@0.2.1` (ponytail-audit cleanup was unreleased since
0.2.0). Site docs synced to current package APIs, then given a technical-writing pass
(em-dashes and one stale phrase, 8 files). **Landed S9, the Korean locale**
(`SITE_DEV_PLAN.md` §13) end to end: Astro i18n routing (`/ko/`), `src/i18n/{en,ko}.json`
+ utils, docs moved to `content/docs/{en,ko}`, all 17 docs and all 20 strips translated
(not machine-translated — re-authored via the `daniel-writing-style` skill), playground
island fully localized (~40 strings + emotion-wheel KO label), LanguageToggle/hreflang/
Pretendard wired. Verified live in a real browser (KO and EN playground, no console
errors, screenshots) as well as by build. `validate-strips.mjs` gained an EN/KO parity
check (20/20 pass). Build green, 44 pages. Not yet done: axe/Lighthouse audits on `/ko/`
routes, and Daniel's own review/sign-off of the KO copy (S9 exit criteria, §13.6) — both
still open.

## Next Actions

1. **Daniel reviews the KO copy** (docs, strips, UI strings) and signs off — §13.6's last
   unchecked exit criterion. Flagged word choices worth a second look: "beat panel" →
   "박자를 찍는 패널" (cameras-and-panels), "join" → "접합부" (asset-packager/asset-packs).
2. Run an axe accessibility pass and Lighthouse mobile score on a few `/ko/` routes
   (§13.6 exit criteria; not yet measured this session).

## Open Issues

- **Publishing needs care here**: `workspace:*` deps require `pnpm publish`, never plain
  `npm publish`; a new `@toonstrip/core` export must publish *before* any consumer
  depending on it. Verify with a clean-room `npm install` that calls the code, not just
  imports it. After a publish, `npm view`/`install` can lag ~1 min before showing the new
  version — a same-version republish 403'ing as "already published" confirms it went
  through; don't assume failure from stale metadata.
- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only).
