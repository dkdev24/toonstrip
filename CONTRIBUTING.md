# Contributing

## Setup

```
pnpm install
pnpm build
pnpm test
```

This is a pnpm workspace (`pnpm-workspace.yaml`: `packages/*`, `examples/*`).
`pnpm build`/`pnpm test` from the repo root run every package's own
`build`/`test` script (`pnpm -r run <script>`); to target one package, use
`pnpm --filter <package-name> run <script>` (e.g. `pnpm --filter
@toonstrip/core run test`).

## How the packages relate

```
schema → core → element → astro
                        └→ react
```

One-way — `schema` has no dependents it depends on, `core` depends only on
`schema`, `element` wraps `core`, `astro` and `react` each wrap `element`
independently (neither depends on the other). Asset packs (`pack-comic-chat`,
`pack-example`, and any third-party pack) depend on `schema` only — they ship
a manifest plus images and never import rendering code (see `docs/packs.md`'s
"Why types are duplicated" for why this matters). `cli` and any future
`avb-import` depend on `core`/`schema` but nothing depends on them.

Read `TOONSTRIP_DEV_PLAN.md` §2 for the full architecture rationale.

## Where things are

- `packages/schema` — the `ComicStripDocument` format (`docs/schema.md`)
- `packages/core` — the rendering engine; Node/canvas-API-only, no DOM
- `packages/element` — the browser custom element (`<comic-strip>`)
- `packages/astro` — the Astro integration + component (`docs/astro.md`)
- `packages/react` — the React `<ComicStrip>` component (`docs/react.md`)
- `packages/vue` — the Vue `<ComicStrip>` component (`docs/vue.md`)
- `packages/next` — `react`'s `<ComicStrip>` behind a Next.js App Router
  client boundary, plus an SSR-placeholder helper (`docs/next.md`)
- `packages/pack-comic-chat`, `packages/pack-example` — asset packs
  (`docs/packs.md`)
- `packages/cli` — the `toonstrip` command
- `examples/astro-blog` — a full worked Astro site
- `examples/react-vite` — a full worked Vite + React app
- `examples/vue-vite` — a full worked Vite + Vue app
- `examples/next-app` — a full worked Next.js App Router app

## Adding a character or a new pack

Read [`docs/packs.md`](./docs/packs.md) in full — it's a complete, tested
walkthrough (the "Worked example" section was itself verified end-to-end
while writing it: draw art, write a manifest, register it in `pack.json`,
validate with `toonstrip pack validate`, and render a real panel to confirm).
`packages/pack-example` is the minimal reference pack to copy the structure
from if you're starting a brand-new pack rather than adding to an existing
one.

## Tests

Every package uses vitest (`pnpm --filter <package> run test`). `packages/core`'s
tests render real panels via `@napi-rs/canvas` and check the output isn't
blank — there's no framework-level snapshot testing yet, so a rendering
change should be checked by eye against a written-out PNG (see
`packages/core/examples/render-fixture.ts`) as well as the unit tests
passing.

## Non-goals

Before proposing a feature, check `TOONSTRIP_DEV_PLAN.md` §0's non-goals
list: no AI-assisted content generation inside `core`/`element`/`astro`, no
affect-inference-from-text, no game/session/turn engine, no Zork/IR/importer
coupling. These are explicit boundaries, not oversights.

## Cross-session state

If you're picking up this project fresh (a new contributor or a new agent
session), read `HANDOFF.md` first — it's the current-state snapshot (version,
what's done, what's next, open issues). `WORKLOG.md` has the full version
history if you need it; `NOTES.md` has open review items flagged during
autonomous work sessions that may still need a maintainer's judgment call.

## Releasing

Before `pnpm publish` of any package, add an entry to the root `CHANGELOG.md` (newest
first, Keep a Changelog form) with a **Packages** line naming the npm versions that ship.
It is the public changelog on toonstrip.danielkimdev.com and its feed; `WORKLOG.md` stays
the internal history and is not generated from it.
