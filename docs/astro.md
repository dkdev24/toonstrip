# Embedding in Astro

`@toonstrip/astro` is the MVP embed target: an Astro integration plus a
`<ComicStrip>` component wrapping `packages/element`'s `<comic-strip>` custom
element. `examples/astro-blog` is a full worked example — read it alongside
this doc.

## Setup

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import toonstrip from "@toonstrip/astro";

export default defineConfig({
  integrations: [
    toonstrip({ packs: ["@toonstrip/pack-comic-chat"] }),
  ],
});
```

`packs` is a list of asset-pack **npm package specifiers** you actually use
in this site. At `astro:config:setup`, the integration resolves each
specifier, reads its `pack.json`, and copies `pack.json` + `characters/` +
`backdrops/` into `public/_toonstrip/<pack.json name>/`. There's no
auto-discovery — a pack used by a page must be listed here explicitly, or its
assets won't exist in the built site.

## Embedding a strip

```astro
---
import { ComicStrip } from "@toonstrip/astro";
import doc from "../content/my-strip.json";
---

<ComicStrip document={doc} packs={["comic-chat"]} client:visible />
```

- `document` is a `ComicStripDocument` (see [`schema.md`](./schema.md)) —
  typically imported as JSON, but any object matching the shape works.
- `packs` here takes pack **names** (the `pack.json` `name` field, e.g.
  `"comic-chat"`) — not the npm specifiers used in `astro.config.mjs`. The
  component resolves each name to the `/_toonstrip/<name>/` URL the
  integration copied that pack to.
- `client:visible` is Astro's own client directive, not something
  `@toonstrip/astro` bakes in — it's the recommended choice (defer the
  element's JS, and the canvas rendering work it triggers, until the strip
  scrolls into view) but any Astro client directive works the same way any
  other client-hydrated Astro component would use one.

## Why `client:visible` actually defers things

Real content only exists client-side — canvas rendering needs a real browser
canvas context, so the component's server-side render (`packages/astro/src/renderer/server.ts`)
emits only an inert placeholder tag (`<comic-strip></comic-strip>`) with no
canvas, no fetch, nothing. `packages/element`'s actual definition
(`customElements.define(...)`) is loaded via a dynamic `import()` inside the
client renderer (`packages/astro/src/renderer/client.ts`), which Astro's
client-directive machinery only executes once the directive's condition
fires. Before that point, nothing about the strip has loaded — no element
module, no pack fetch, no canvas.

This was verified against a real headless Chromium during M4: zero network
requests for `@toonstrip/element` and zero rendered canvases before the
element scrolls into view; both appear immediately after. `examples/astro-blog`'s
blog post is deliberately laid out with the strip below a tall filler block
so this is directly observable — open devtools' Network tab, load the page,
and scroll.

## Worked example

`examples/astro-blog/src/pages/blog/comic-strips-in-astro.astro` is the
complete pattern: a hand-written `ComicStripDocument`
(`src/content/tldr-strip.json` — no AI involved in writing it, per the
project's own non-goals), the `comic-chat` pack, and `client:visible`. Run it
locally:

```
pnpm --filter astro-blog dev
```

## Current limitations

- Only tested against the Astro version pinned in `examples/astro-blog`'s
  `package.json` (Astro 7.x as of M4) — see `NOTES.md` "M4".
- `@toonstrip/astro` uses a hand-written custom renderer (not `@astrojs/lit`),
  because `packages/element`'s `<comic-strip>` is a plain `HTMLElement`
  subclass, not a `LitElement` — this is intentional (zero framework deps in
  `packages/element`, per the dev plan's architecture), not a workaround to
  revisit.
