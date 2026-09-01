# @toonstrip/pack-comic-chat

toonstrip's default asset pack: the original 15-character Microsoft Comic
Chat roster (`dan`, `anna`, `bolo`, `denise`, `kevin`, `lynnea`, `margaret`,
`rebecca`, `tiki`, `sage`, `kwensa`, `hugh`, `maynard`, `scotty`,
`tongtyed`) plus 3 backdrops (`field`, `pastoral`, `room8bs`), each
character with sprite sheets covering the full emotion wheel. Zero runtime
dependencies.

Part of [toonstrip](https://github.com/dkdev24/toonstrip), a
framework-embeddable comic-strip renderer.

## Install

```
npm install @toonstrip/pack-comic-chat
```

## Usage

**Node (`@toonstrip/core`):**

```ts
import { loadCastManifest } from "@toonstrip/pack-comic-chat";

const manifest = loadCastManifest(); // CastManifest, sheet/backdrop paths are absolute
```

**Browser (`@toonstrip/element`) / Astro (`@toonstrip/astro`):** don't
import this package's JS directly — pass it by name to the integration/element
instead, so its `pack.json` + `characters/` + `backdrops/` files get served
over HTTP. See those packages' READMEs.

## Validate

```
npx @toonstrip/cli pack validate node_modules/@toonstrip/pack-comic-chat
```

## License

MIT. This pack incorporates Microsoft Comic Chat character and backdrop art
under its original MIT grant — see `NOTICE` in this package and
[`THIRD_PARTY.md`](https://github.com/dkdev24/toonstrip/blob/main/THIRD_PARTY.md)
in the repo for the full attribution and trademark disclaimer.
