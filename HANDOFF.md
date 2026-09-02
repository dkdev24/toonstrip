# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.7.11** published (core 0.1.6, element 0.1.7, astro 0.1.10) — see Last Session

---

## Project Status

`toonstrip`: framework-embeddable canvas widget rendering a comic strip from
caller-supplied data, extracted/generalized from `grues-in-comic`'s comic pane (Zork/game/
AI-inference coupling stripped). M0–M6 done: all 7 `@toonstrip/*` packages published to npm
— `schema` 0.1.3, `astro` 0.1.10, `element` 0.1.7, `core` 0.1.6, `cli`/packs 0.1.1 (not
lockstep). M7 (intro/playground) not started. Full history in `WORKLOG.md`.

---

## Last Session

M7 planning (2026-09-02). Wrote `SITE_DEV_PLAN.md` — the plan for toonstrip.danielkimdev.com:
purpose-built `site/` workspace package (not `examples/astro-blog`), Astro 7 static,
hand-built MDX docs (Starlight rejected), Preact+signals playground island with CodeMirror
6, URL-hash sharing (no backend), public `CHANGELOG.md` (Keep a Changelog, backfilled from
WORKLOG) feeding `/changelog`, Cloudflare Pages via GitHub integration (push to `main`
deploys, like the other sites; root `wrangler.toml`; Workers only for an optional short-link fn), phases S0–S8 with exit criteria. Wrote
`DESIGN.md` — tokens (paper/ink/balloon-yellow, light+dark), type (Bricolage Grotesque /
DM Sans / JetBrains Mono), layout, components, playground spec, a11y, motion, voice.
Linked both from README, AGENTS.md, dev plan §10. No code written; nothing published.

---

## Next Actions

1. Start M7 S0 per `SITE_DEV_PLAN.md` §10: scaffold `site/`, `tokens.css` from
   `DESIGN.md` §2–§4, root `wrangler.toml`, Pages project `toonstrip` connected to GitHub (§9 settings).
2. `danielkimdev-astro`: bump to `@toonstrip/astro@0.1.10`, rebuild, verify embed width.
3. `grues-in-comic` port: code/ADR on any machine; `gate`/`density` accept needs macOS.

---

## Open Issues

- `toonstrip pack validate` misses a missing torso (checks NEUTRAL only); Playwright verify
  scripts are manual-only (`NOTES.md` M1–M5).
