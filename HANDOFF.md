# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.8.2** (site intro page; npm unchanged: core 0.1.6, element 0.1.7, astro 0.1.10)

---

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data, extracted/generalized from `grues-in-comic`'s comic pane (Zork/game/
AI-inference coupling stripped). M0–M6 done: all 7 `@toonstrip/*` packages published to npm
— `schema` 0.1.3, `astro` 0.1.10, `element` 0.1.7, `core` 0.1.6, `cli`/packs 0.1.1 (not
lockstep). M7 (site) in progress: S0–S2 done. Full history in `WORKLOG.md`.

---

## Last Session

2026-09-02, M7 kickoff. Wrote `SITE_DEV_PLAN.md` + `DESIGN.md` (plan/design for
toonstrip.danielkimdev.com), fixed CI (build before test), then **S0 shipped as v0.8.0**:
`site/` workspace package (Astro 7 static, both packs, fonts, tokens from DESIGN.md, base
layout, header/footer/theme toggle, placeholder pages, hero strip rendering live). Root
`wrangler.toml` → `site/dist`; `.node-version` 22; `packageManager` pnpm 11.1.1. Then
**S1 as v0.8.1**: shared component CSS, `CodeBlock`, `PackageManagerTabs`, `Callout`,
`CodeAndStrip`, `WidthSlider`, `lib/share.ts`, `/kitchen-sink`, `scripts/check-page.mjs`
(axe + screenshots). **S2 as v0.8.2**: full intro page, 7 hand-written strips,
`validate-strips.mjs`, roster thumbnails. axe clean. See WORKLOG v0.8.0–v0.8.2.

---

## Next Actions

1. **Daniel:** create the Cloudflare Pages project via the GitHub flow (settings in
   NOTES.md "M7 S0"); nothing deploys until then.
2. S3 docs (`SITE_DEV_PLAN.md` §5), S4 playground (§6). S4 needs a
   force-paint/export API on the element (NOTES.md "M7 S1").
3. Later: `danielkimdev-astro` bump to `@toonstrip/astro@0.1.10`; `grues-in-comic` port
   (accept gates need macOS).

---

## Open Issues

- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only); Playwright verify
  scripts are manual-only (`NOTES.md` M1–M5).
