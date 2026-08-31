# HANDOFF.md

Cross-session context memory. Update this file at the end of every session.

---

## Current Version

**0.1.0**

---

## Project Status

`toonstrip` is a new, standalone open-source repo (not yet scaffolded with code) for a
framework-embeddable library that renders a comic strip — panels, characters, poses,
emotions, speech/thought balloons, backdrops — from caller-supplied data, as a live,
responsive, canvas-based widget. It is an extraction + generalization of the comic-pane
half of `grues-in-comic`, stripped of all Zork/game/AI-inference coupling. MVP ships as
an Astro integration with a framework-agnostic rendering core. Repo currently contains
only the seed dev plan and this bootstrap infrastructure — no source code ported yet.

---

## Last Session

Repo initialized: git init, GitHub repo `dkdev24/toonstrip` created (private) and pushed,
`.gitignore` added, HANDOFF.md/WORKLOG.md/AGENTS.md/CLAUDE.md scaffolded per
`TOONSTRIP_DEV_PLAN.md`. Resolved-at-kickoff decisions from the plan: project name
**toonstrip** (npm unscoped + `@toonstrip` org both unclaimed — claim at M0), license
**MIT**, default asset pack includes Comic Chat's original backdrop bitmaps alongside its
characters, demo/docs site at toonstrip.danielkimdev.com built with Astro.

---

## Next Actions

1. Read `TOONSTRIP_DEV_PLAN.md` in full (especially §2 onward — schema, M0 milestone
   scope) and start M0 work.
2. Claim `toonstrip` on npm and the `@toonstrip` org before scaffolding packages.
3. Port the generic (non-Zork) half of `grues-in-comic`'s comic pane per the plan's §1
   port table: `render.ts`, `balloon.ts`/`balloon-layout.ts`, `figure.ts`/`pose.ts`/
   `format.ts`, `backdrop.ts` (generalized), `layout.ts`, `comic-view.ts` (as a Web
   Component).

---

## Open Issues

- No source code exists yet — this session only did repo bootstrap, not M0 implementation.
- Default asset pack conversion (Comic Chat backdrop BMPs) is fresh work — not yet ported
  from `grues-in-comic`, which never decoded these.

---

## Key Paths

| Path | Purpose |
|---|---|
| `TOONSTRIP_DEV_PLAN.md` | Full seed dev plan: mission, non-goals, port/leave-behind table, schema, milestones |
| `HANDOFF.md` | This file — cross-session state snapshot |
| `WORKLOG.md` | Persistent version history |
| `AGENTS.md` | Session workflow rules for AI agents |
