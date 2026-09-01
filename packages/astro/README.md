# @toonstrip/astro

An Astro integration plus a `<ComicStrip>` component, wrapping
`@toonstrip/element`'s `<comic-strip>` custom element for use in Astro
sites/blogs.

Part of [toonstrip](https://github.com/dkdev24/toonstrip), a
framework-embeddable comic-strip renderer.

## Install

```
npm install @toonstrip/astro @toonstrip/pack-comic-chat
```

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

`packs` is a list of asset-pack **npm package specifiers** used anywhere in
the site. At `astro:config:setup`, each specifier is resolved, its
`pack.json` read, and `pack.json` + `characters/` + `backdrops/` copied into
`public/_toonstrip/<pack.json name>/`. A pack used by a page must be listed
here explicitly — there's no auto-discovery.

## Embedding a strip

```astro
---
import { ComicStrip } from "@toonstrip/astro";
import doc from "../content/my-strip.json";
---

<ComicStrip document={doc} packs={["comic-chat"]} client:visible />
```

- `document` — a `ComicStripDocument` (see
  [`@toonstrip/schema`](https://www.npmjs.com/package/@toonstrip/schema)),
  typically imported as JSON.
- `packs` — pack **names** here (the `pack.json` `name` field, e.g.
  `"comic-chat"`), not the npm specifiers used in `astro.config.mjs`. Each
  name resolves to the `/_toonstrip/<name>/` URL the integration copied that
  pack to.
- `client:visible` is a standard Astro client directive — recommended so the
  element's JS and its canvas rendering work don't load until the strip
  scrolls into view, but any client directive works.

Server-side render emits only an inert placeholder tag — real rendering
needs a canvas context and only ever happens client-side, once the chosen
directive's condition fires.

## Worked example

See `examples/astro-blog` in the
[repo](https://github.com/dkdev24/toonstrip/tree/main/examples/astro-blog)
for a complete, runnable site. Full field reference:
[`docs/astro.md`](https://github.com/dkdev24/toonstrip/blob/main/docs/astro.md).

## License

MIT
