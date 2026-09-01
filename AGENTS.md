# AGENTS.md

`toonstrip` — a framework-embeddable library that renders a comic strip (panels,
characters, poses, emotions, balloons, backdrops) from caller-supplied data as a live,
responsive, canvas-based widget. Extraction + generalization of the comic-pane half of
`grues-in-comic`, with all Zork/game/AI-inference coupling stripped out. See
`TOONSTRIP_DEV_PLAN.md` for the full mission, non-goals, and port/leave-behind plan.

## System Documents

Two documents maintain cross-session state. Read them at the start of every session.
Update them at the end.

### HANDOFF.md

- Location: `HANDOFF.md`
- Purpose: Cross-session context memory.
- Contains: current version, project status, last session summary, next actions, open
  issues, key paths.
- **Max 50 lines.** It is a snapshot, not a log — outdated or superseded content moves to
  `WORKLOG.md`, never accumulates here.
- **Read at the start of every session.**
- **Update at the end of every session.** Replace the Last Session and Next Actions
  sections. Append to Open Issues as needed. Before saving, check the line count —
  anything pushing it over 50 lines gets moved into a new `WORKLOG.md` entry instead of
  staying in the snapshot.

### AGENTS.md

- Location: `AGENTS.md`
- **Max 80 lines.** Keep only what's needed at the start of every session: what the
  project is, repo layout, how to orient, the HANDOFF/WORKLOG rules, and core working
  agreements.
- Rarely-needed detail belongs in `WORKLOG.md`, a plan doc, or a dedicated file linked
  from here — not inline here.

### WORKLOG.md

- Location: `WORKLOG.md`
- Purpose: Persistent project history.
- Contains: one entry per version milestone, with date, changes, and status.
- **Do not load at session start.** Read only when version history is directly relevant
  to the current task.
- **Append a new entry when a version milestone is reached.** Never edit past entries.
- Version format: `x.x.x` — increment the patch for small changes, minor for new
  subsystems, major for engine-complete milestones.

## AI Development Workflow

1. Read `HANDOFF.md` for current state and next actions.
2. Consult `TOONSTRIP_DEV_PLAN.md` for scope on the milestone in progress.
3. Do the work.
4. Update `HANDOFF.md` (Last Session, Next Actions, Open Issues) and, if a version
   milestone was reached, append a `WORKLOG.md` entry.

## Working Agreements

- Non-goals in `TOONSTRIP_DEV_PLAN.md` §0 are hard boundaries: no AI content generation,
  no affect-inference-from-text, no game/session/turn engine, no Zork/IR/importer
  coupling. Do not reintroduce these while porting from `grues-in-comic`.
- License is MIT; default asset pack (15-character roster + 3 backdrops) carries the same
  MIT/Microsoft terms as the original Comic Chat art — preserve attribution per the dev
  plan's §13.
- **Before changing `packages/core/src/{balloon,balloon-layout,figure,pose,layout,render}.ts`,
  read `UPSTREAM_SYNC.md`.** This repo and `grues-in-comic` each carry their own copy of
  the shared rendering logic and drift apart unless a fix is manually ported both ways;
  a `packages/core` fix must also cascade through `@toonstrip/element`/`@toonstrip/astro`
  and into `danielkimdev-astro` — that doc is the checklist for all of it.
