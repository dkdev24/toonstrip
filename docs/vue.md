# Embedding in Vue

`@toonstrip/vue` is a thin wrapper: a `<ComicStrip>` component that mounts
`packages/element`'s `<comic-strip>` custom element via a template ref and
forwards `document`/`packs` onto it as DOM properties whenever they change.
No rendering logic of its own — same restraint `docs/astro.md` and
`docs/react.md` call out for the Astro and React integrations.
`examples/vue-vite` is a full worked example — read it alongside this doc.

## Install

```
npm install @toonstrip/vue @toonstrip/pack-comic-chat
```

Serve the pack's static files (`pack.json`, `characters/`, `backdrops/`)
somewhere the browser can fetch them — Vite has no integration-hook system
like Astro's, so `examples/vue-vite/scripts/copy-pack-assets.mjs` copies
them into `public/packs/comic-chat/` as a `predev`/`prebuild` step (the same
script `examples/react-vite` uses).

## Embedding a strip

```vue
<script setup>
import { ComicStrip } from "@toonstrip/vue";
import doc from "./my-strip.json";
</script>

<template>
  <ComicStrip :document="doc" :packs="['/packs/comic-chat/']" />
</template>
```

- `document` is a `ComicStripDocument` (see [`schema.md`](./schema.md)).
  Passing a new object on every render is fine — the component only pushes
  it onto the underlying element when it actually changes (see below).
- `packs` takes the same base URLs `packages/element`'s `.packs` property
  takes directly — not pack names the way `@toonstrip/astro`'s `<ComicStrip>`
  does, since there's no integration step here resolving names to URLs.
- `class`/`style` bindings fall through to the rendered `<comic-strip>`
  element automatically (Vue's default single-root attribute inheritance) —
  they aren't declared as explicit props.

## Why a prop change doesn't remount the element

`<ComicStrip>` is defined with a `setup()` render function returning
`h("comic-strip", { ref })` — a plain render function rather than an SFC
`<template>` for this one tag, the same reason `@toonstrip/react` uses
`createElement` instead of JSX: it sidesteps needing
`compilerOptions.isCustomElement` configured just for this one tag. Because
the render function always produces the same host tag in the same position,
Vue's patching reuses the existing `<comic-strip>` DOM node across
re-renders instead of tearing it down and rebuilding it. An `onMounted` hook
sets the initial `document`/`packs`, and a `watch` per prop pushes
subsequent changes onto the element via the ref; the element's own setters
(see `docs/schema.md`'s validation note) do the actual rebuild internally.

Verified during M11 against `examples/vue-vite`'s toggle-button demo: the
same `<comic-strip>` element (tagged via a scratch property from devtools'
console) survives a `document` prop change, and its rendered panel count
updates to match the new document — see `HANDOFF.md`'s M11 session note for
how this was checked.

## Worked example

`examples/vue-vite` is the complete pattern: a Vite + Vue app, a toggle
button switching between two hand-written `ComicStripDocument`s
(`src/strips.ts` — no AI involved, per the project's own non-goals), and the
local `@toonstrip/pack-comic-chat` pack copied into `public/` at dev/build
time. Run it locally:

```
pnpm --filter vue-vite-example dev
```

## Current limitations

- `@toonstrip/element`'s module no longer throws when imported with no DOM
  present (it guards `HTMLElement`/`customElements` access), so this package
  is safe to import in a Nuxt server render pass. No Nuxt-specific wrapper
  exists yet, and — per [`docs/next.md`](./next.md)'s deprecation of
  `@toonstrip/next` — probably shouldn't: a client-boundary marker (Nuxt's
  own equivalent of `'use client'`) belongs directly on this package's
  component, and an SSR-placeholder helper already exists on
  `@toonstrip/cli`, so there may be nothing left for a dedicated package to
  wrap.
- Tested against Vue 3.5; the `peerDependencies` range allows any Vue 3.3+.
