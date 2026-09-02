# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.8.0** (site scaffold; npm unchanged: core 0.1.6, element 0.1.7, astro 0.1.10)

---

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data, extracted/generalized from `grues-in-comic`'s comic pane (Zork/game/
AI-inference coupling stripped). M0–M6 done: all 7 `@toonstrip/*` packages published to npm
— `schema` 0.1.3, `astro` 0.1.10, `element` 0.1.7, `core` 0.1.6, `cli`/packs 0.1.1 (not
lockstep). M7 (site) in progress: S0 done. Full history in `WORKLOG.md`.

---

## Last Session

2026-09-02, M7 kickoff. Wrote `SITE_DEV_PLAN.md` + `DESIGN.md` (plan/design for
toonstrip.danielkimdev.com), fixed CI (build before test), then **S0 shipped as v0.8.0**:
`site/` workspace package (Astro 7 static, both packs, fonts, tokens from DESIGN.md, base
layout, header/footer/theme toggle, placeholder pages, hero strip rendering live). Root
`wrangler.toml` → `site/dist`; `.node-version` 22; `packageManager` pnpm 11.1.1. Verified
in headless Chromium (3 canvases, aria-labels, no errors). See WORKLOG v0.8.0.

---

## Next Actions

1. **Daniel:** create the Cloudflare Pages project via the GitHub flow (settings in
   NOTES.md "M7 S0"); nothing deploys until then.
2. S1 per `SITE_DEV_PLAN.md` §10: `CodeBlock`, `Callout`, `CodeAndStrip`, `WidthSlider`,
   `lib/share.ts`, `/_kitchen-sink`, axe pass. Then S2 (intro page), S3/S4 in parallel.
3. Later: `danielkimdev-astro` bump to `@toonstrip/astro@0.1.10`; `grues-in-comic` port
   (accept gates need macOS).

---

## Open Issues

- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only); Playwright verify
  scripts are manual-only (`NOTES.md` M1–M5).
