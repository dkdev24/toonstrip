# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.8.7** (`toonstrip render`; npm unchanged: core 0.1.6, element 0.1.7, astro 0.1.10)

---

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data, extracted/generalized from `grues-in-comic`'s comic pane (Zork/game/
AI-inference coupling stripped). M0–M6 done: all 7 `@toonstrip/*` packages published to npm
— `schema` 0.1.3, `astro` 0.1.10, `element` 0.1.7, `core` 0.1.6, `cli`/packs 0.1.1 (not
lockstep). M7 (site) in progress: S0–S7 done (copy pass pending). Full history in `WORKLOG.md`.

---

## Last Session

2026-09-02, M7 kickoff through S4. Wrote `SITE_DEV_PLAN.md` + `DESIGN.md`, fixed CI (build
before test). Shipped `site/`: **S0 v0.8.0** scaffold + Pages config; **S1 v0.8.1** shell
components + `check-page.mjs`; **S2 v0.8.2** intro page + 7 strips; **S3 v0.8.3** docs
(12 MDX pages, generated schema ref, llms.txt); **S4 v0.8.4** playground (Preact +
CodeMirror, form/JSON/preview, share hash, PNG export, 6 e2e); **S5 v0.8.5** public
`CHANGELOG.md` + `/changelog` + feed; **S6 v0.8.6** JS budgets, OG image, CI site job;
**S7 v0.8.7** `toonstrip render` in `@toonstrip/cli` 0.2.0 (unpublished). axe clean on all 18
routes, both themes. WORKLOG v0.8.0–v0.8.7; findings in NOTES.md "M7 S0"–"M7 S4".

---

## Next Actions

1. **Daniel:** create the Cloudflare Pages project via the GitHub flow (settings in
   NOTES.md "M7 S0"); nothing deploys until then.
2. **Daniel:** copy pass over `site/src/pages/index.astro` and `site/src/content/docs/*.mdx`
   in his voice (S6). Then S8 launch: custom domain, analytics beacon, README links.
   Publish `@toonstrip/cli@0.2.0` (`pnpm publish`, 2FA) when convenient.
3. Later: `danielkimdev-astro` bump to `@toonstrip/astro@0.1.10`; `grues-in-comic` port.

---

## Open Issues

- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only); Playwright verify
  scripts are manual-only (`NOTES.md` M1–M5).
