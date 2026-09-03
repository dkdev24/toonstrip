# @toonstrip/vue

A `<ComicStrip>` Vue component, wrapping `@toonstrip/element`'s
`<comic-strip>` custom element. No rendering logic of its own — it mounts
the element via a template ref and forwards `document`/`packs` onto it as
DOM properties.

Part of [toonstrip](https://github.com/dkdev24/toonstrip), a
framework-embeddable comic-strip renderer. Docs, playground, and
changelog: [toonstrip.danielkimdev.com](https://toonstrip.danielkimdev.com).

## Install

```
npm install @toonstrip/vue @toonstrip/pack-comic-chat
```

Serve the pack's files somewhere the browser can fetch them (`pack.json`,
`characters/`, `backdrops/`) — for example `public/packs/comic-chat/` in a
Vite app.

## Use

```vue
<script setup>
import { ComicStrip } from "@toonstrip/vue";
import doc from "./my-strip.json";
</script>

<template>
  <ComicStrip :document="doc" :packs="['/packs/comic-chat/']" />
</template>
```

| Prop | Type | Meaning |
|---|---|---|
| `document` | `ComicStripDocument` | The strip. Re-set on the element whenever it changes — updates the same element instance, no remount. |
| `packs` | `string[]` | Base URLs of asset packs, each serving `pack.json` and its files. Default `[]`. |
| `class` / `style` | — | Fall through to the underlying `<comic-strip>` element (Vue's default single-root attribute inheritance). |

## Worked example

See `examples/vue-vite` in the
[repo](https://github.com/dkdev24/toonstrip/tree/main/examples/vue-vite)
for a complete, runnable Vite + Vue app. Full field reference:
[`docs/vue.md`](https://github.com/dkdev24/toonstrip/blob/main/docs/vue.md).

## License

MIT
