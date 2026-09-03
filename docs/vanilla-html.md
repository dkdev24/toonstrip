# Vanilla HTML, no build step

`@toonstrip/element` is a plain `HTMLElement` subclass with zero framework
dependencies (see [`astro.md`](./astro.md) for why the Astro integration is
just a thin wrapper around it). This doc covers the other end of that claim:
a single `.html` file, no `package.json`, no bundler, no dev server config —
opened straight from disk (`file://`) or served by any static file server.

`examples/vanilla-html/index.html` is the worked, tested example. Open it
locally:

```
npx serve examples/vanilla-html
```

or just double-click `index.html`.

## How it works with no install step

A normal install (`npm install @toonstrip/element @toonstrip/pack-comic-chat`,
covered in `docs/astro.md` and the site's "Plain HTML" doc) still needs
*something* — a bundler, an import map, or a `node_modules` a dev server
resolves — to turn `import "@toonstrip/element"` into a real URL a browser
can fetch. A bare specifier in a plain `<script type="module">` with nothing
else present just fails.

The example sidesteps this with two different CDNs, used for two different
purposes:

- **[esm.sh](https://esm.sh)** for the JS module:
  `import "https://esm.sh/@toonstrip/element@0.1.8"`. esm.sh resolves a
  package's own dependency graph (`@toonstrip/element` imports
  `@toonstrip/core` and `@toonstrip/schema`) into fully-qualified esm.sh URLs
  on the fly, so the browser never sees an unresolved bare specifier.
  **unpkg does not do this** — it serves a package's files byte-for-byte, so
  a bare `import "@toonstrip/core"` inside a file it serves would fail in a
  plain script tag with no import map.
- **[unpkg](https://unpkg.com)** for the asset pack:
  `strip.packs = ["https://unpkg.com/@toonstrip/pack-comic-chat@0.1.1/"]`.
  A pack is just static files (`pack.json`, sprite sheets, backdrop PNGs) —
  `packages/element`'s pack loader (`load-pack.ts`) fetches them by relative
  URL against this base, exactly as it would against a same-origin
  `/packs/comic-chat/` directory in a real deployment. unpkg serves raw files
  with CORS enabled, which is all this needs.

Pin exact versions in both URLs (as the example does) — an unpinned CDN
import means a future `@toonstrip/element` release can change the page's
behavior without you touching the file.

For production use, prefer self-hosting the pack (copy its `characters/` and
`backdrops/` into your own static assets — see [`packs.md`](./packs.md)) and
either self-hosting `@toonstrip/element`'s built files or bundling it
normally. CDN imports are the zero-friction path for a demo, a prototype, or
this exact doc's job of proving no build step is required — not a
recommended production dependency on a third party's uptime.

## The whole pattern

```html
<comic-strip id="strip"></comic-strip>

<script type="module">
  import "https://esm.sh/@toonstrip/element@0.1.8";

  const strip = document.getElementById("strip");
  strip.packs = ["https://unpkg.com/@toonstrip/pack-comic-chat@0.1.1/"];
  strip.document = { version: 1, panels: [ /* ... */ ] };
</script>
```

`strip.document` is a [`ComicStripDocument`](./schema.md); see that doc for
the full shape and the emotion-wheel convention. `strip.packs` takes any list
of base URLs, mixing self-hosted and CDN sources freely.

This is the same `<comic-strip>` element every other integration uses — a
React, Vue, or plain-jQuery page can drop in the identical two lines.
