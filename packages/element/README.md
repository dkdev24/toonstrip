# @toonstrip/element

`<comic-strip>` — a zero-framework-dependency custom element that renders a
`ComicStripDocument` (from `@toonstrip/schema`) as a live, responsive strip
of `<canvas>` panels, wrapping `@toonstrip/core`. Works in any framework, or
none.

Part of [toonstrip](https://github.com/dkdev24/toonstrip), a
framework-embeddable comic-strip renderer. Using Astro? See
[`@toonstrip/astro`](https://www.npmjs.com/package/@toonstrip/astro) for a
ready-made `<ComicStrip>` component instead.

## Install

```
npm install @toonstrip/element
```

## Usage

```html
<comic-strip id="strip"></comic-strip>

<script type="module">
  import "@toonstrip/element";

  const strip = document.getElementById("strip");
  strip.packs = ["/packs/comic-chat/"]; // one or more asset-pack base URLs
  strip.document = {
    version: 1,
    panels: [
      {
        backdrop: "pastoral",
        camera: "establishing",
        bodies: [{ character: "dan", emotion: { angle: 0, intensity: 0.6 } }],
        speakers: [{ speaker: "caption", balloon: "caption", text: "A field outside town." }],
      },
    ],
  };
</script>
```

- `.packs` — array of asset-pack **base URLs**. Each must serve a
  `pack.json` plus the `characters/`/`backdrops/` files it declares (fetched
  over HTTP, not read from disk). Registering more than one pack that
  declares the same character/backdrop id throws.
- `.document` — a `ComicStripDocument`, validated via `@toonstrip/schema` at
  the boundary.
- `src="..."` attribute is also accepted as a convenience for fetching the
  document JSON from a URL instead of setting `.document` directly.

## Behavior

- One `<canvas>` per panel, laid out via `@toonstrip/core`'s `layoutStrip`
  (3 columns wide, 2 mid-width, 1 narrow) and relaid live on
  `ResizeObserver`.
- `devicePixelRatio`-aware backing store; `IntersectionObserver`-gated
  painting (a panel scrolled off-screen isn't redrawn until visible again).
- Shadow DOM style isolation; each panel carries `role="img"` and a
  generated `aria-label` describing its camera shot, room, and dialogue.
- Pose selection is frozen once per panel in document order, so a resize
  repaint reproduces the same figures rather than re-rolling them.

## Asset packs

Any `@toonstrip/pack-*` package (e.g.
[`@toonstrip/pack-comic-chat`](https://www.npmjs.com/package/@toonstrip/pack-comic-chat))
works, served as static files at the URL you pass to `.packs`. See
[`docs/packs.md`](https://github.com/dkdev24/toonstrip/blob/main/docs/packs.md)
in the repo for the pack contract and how to build your own.

## License

MIT
