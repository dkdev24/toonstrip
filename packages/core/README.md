# @toonstrip/core

The framework-agnostic rendering engine: draws a single `Panel` (from
`@toonstrip/schema`) onto a `CanvasRenderingContext2D` — figures, poses,
speech/thought/caption balloons, backdrops, camera framing, and strip layout.
No DOM dependency; runs in Node via `@napi-rs/canvas` or in a browser.

Part of [toonstrip](https://github.com/dkdev24/toonstrip), a
framework-embeddable comic-strip renderer. Most consumers want
`@toonstrip/element` (a ready-made `<comic-strip>` custom element) rather
than calling this package directly — reach for `core` when you're rendering
outside the DOM (a Node script, a build-time static fallback) or building
your own embed.

## Install

```
npm install @toonstrip/core @toonstrip/schema
```

## Usage

```ts
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { layoutStrip, renderPanel, type Cast } from "@toonstrip/core";
import { loadCastManifest } from "@toonstrip/pack-comic-chat";
import type { Panel } from "@toonstrip/schema";

const manifest = loadCastManifest();
const dan = manifest.cast.dan;
const pastoral = manifest.backdrops.find((b) => b.id === "pastoral")!;

const cast: Cast = {
  manifest: { version: 1, cast: { dan }, backdrops: [pastoral] },
  sheets: new Map([["dan", await loadImage(dan.sheet)]]),
  backdrops: new Map([["pastoral", await loadImage(pastoral.file)]]),
};

const panel: Panel = {
  backdrop: "pastoral",
  camera: "medium",
  bodies: [{ character: "dan", emotion: { angle: 0, intensity: 0.5 } }],
  speakers: [{ speaker: "dan", balloon: "speech", text: "Rendered from a Node script." }],
};

const { panelWidth, panelHeight } = layoutStrip(900);
const canvas = createCanvas(panelWidth, panelHeight);
const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
renderPanel(ctx, panel, cast, panelWidth, panelHeight);
```

A `Cast` is a resolved asset pack: the `CastManifest` (character/backdrop
metadata) plus loaded `sheets`/`backdrops` images, keyed by id. Building one
from a pack package or from files fetched over the network is the caller's
job — `@toonstrip/pack-comic-chat` and `@toonstrip/element`'s `load-pack.ts`
are the two existing examples.

## What's exported

- `renderPanel(ctx, panel, cast, width, height, options?)` — draws one panel
- `layoutStrip(containerWidth)` — column count + per-panel size for a strip
  at a given container width (drives responsive relayout)
- `selectFigures`, `figureFor`, pose-selection helpers — for a caller that
  needs to advance pose cycles without drawing (e.g. a virtualized strip)
- Balloon measurement/drawing primitives (`measureBalloon`, `drawBalloon`,
  `layoutBalloons`) if you're composing a custom render path
- `Cast`, `Figure`, `PoseCycle` and the rest of the type surface

## License

MIT
