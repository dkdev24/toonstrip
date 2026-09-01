# @toonstrip/pack-example

A second, small, wholly original toonstrip asset pack: one character
("Pip", simple procedurally-drawn shapes — not AI-generated) with a
NEUTRAL/HAPPY face pair and NEUTRAL/WAVE/SHRUG torsos, plus one original
backdrop ("meadow"). Exists to prove the toonstrip pack contract isn't
secretly coupled to `@toonstrip/pack-comic-chat`'s decoded-Comic-Chat
origin, and to serve as a minimal starting point for building your own pack.
Zero runtime dependencies.

Part of [toonstrip](https://github.com/dkdev24/toonstrip), a
framework-embeddable comic-strip renderer.

## Install

```
npm install @toonstrip/pack-example
```

## Usage

**Node (`@toonstrip/core`):**

```ts
import { loadCastManifest } from "@toonstrip/pack-example";

const manifest = loadCastManifest(); // CastManifest, sheet/backdrop paths are absolute
```

**Browser (`@toonstrip/element`) / Astro (`@toonstrip/astro`):** don't
import this package's JS directly — pass it by name to the integration/element
instead, so its `pack.json` + `characters/` + `backdrops/` files get served
over HTTP.

## Validate

```
npx @toonstrip/cli pack validate node_modules/@toonstrip/pack-example
```

## Building your own pack

This package's `scripts/generate.mjs` is a worked, self-contained example of
building a pack's art and manifests from scratch. See
[`docs/packs.md`](https://github.com/dkdev24/toonstrip/blob/main/docs/packs.md)
in the repo for the full contract and a step-by-step "add a character"
walkthrough.

## License

MIT
