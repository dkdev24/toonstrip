# Embedding in React

`@toonstrip/react` is a thin wrapper: a `<ComicStrip>` component that mounts
`packages/element`'s `<comic-strip>` custom element via a ref and forwards
`document`/`packs` onto it as DOM properties whenever they change. No
rendering logic of its own — same restraint `docs/astro.md` calls out for
the Astro integration. `examples/react-vite` is a full worked example — read
it alongside this doc.

## Install

```
npm install @toonstrip/react @toonstrip/pack-comic-chat
```

Serve the pack's static files (`pack.json`, `characters/`, `backdrops/`)
somewhere the browser can fetch them — Vite has no integration-hook system
like Astro's, so `examples/react-vite/scripts/copy-pack-assets.mjs` copies
them into `public/packs/comic-chat/` as a `predev`/`prebuild` step.

## Embedding a strip

```tsx
import { ComicStrip } from "@toonstrip/react";
import doc from "./my-strip.json";

function App() {
  return <ComicStrip document={doc} packs={["/packs/comic-chat/"]} />;
}
```

- `document` is a `ComicStripDocument` (see [`schema.md`](./schema.md)).
  Passing a new object on every render is fine — the component only pushes
  it onto the underlying element when it actually changes (see below).
- `packs` takes the same base URLs `packages/element`'s `.packs` property
  takes directly — not pack names the way `@toonstrip/astro`'s `<ComicStrip>`
  does, since there's no integration step here resolving names to URLs.

## Why a prop change doesn't remount the element

`<ComicStrip>` renders the same `<comic-strip>` host tag on every call
(`React.createElement("comic-strip", { ref, ... })`), so React's
reconciliation keeps the same DOM node across re-renders in the same
position — it never unmounts and recreates it just because `document`
changed. Two `useEffect`s, one per prop, write `document`/`packs` onto the
element via the ref after each commit; the element's own setters (see
`docs/schema.md`'s validation note) do the actual rebuild internally.

Verified during M10 against `examples/react-vite`'s toggle-button demo: the
same `<comic-strip>` element (tagged via a scratch property from devtools'
console) survives a `document` prop change, and its rendered panel count
updates to match the new document — see `HANDOFF.md`'s M10 session note for
how this was checked.

## Worked example

`examples/react-vite` is the complete pattern: a Vite + React app, a toggle
button switching between two hand-written `ComicStripDocument`s
(`src/strips.ts` — no AI involved, per the project's own non-goals), and the
local `@toonstrip/pack-comic-chat` pack copied into `public/` at dev/build
time. Run it locally:

```
pnpm --filter react-vite-example dev
```

## Current limitations

- `@toonstrip/element`'s module no longer throws when imported with no DOM
  present (it guards `HTMLElement`/`customElements` access), so this package
  is safe to import on a server. For Next.js App Router specifically, use
  [`@toonstrip/next`](./next.md) instead of this package directly: it adds
  the `'use client'` boundary React Server Components require, plus an
  SSR-placeholder helper.
- Tested against React 18; the `peerDependencies` range also allows React 19
  since nothing in the wrapper depends on 18-specific behavior, but 19 isn't
  in the test matrix yet.
