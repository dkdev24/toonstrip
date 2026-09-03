# @toonstrip/react

A `<ComicStrip>` React component, wrapping `@toonstrip/element`'s
`<comic-strip>` custom element. No rendering logic of its own — it mounts
the element via a ref and forwards `document`/`packs` onto it as DOM
properties.

Part of [toonstrip](https://github.com/dkdev24/toonstrip), a
framework-embeddable comic-strip renderer. Docs, playground, and
changelog: [toonstrip.danielkimdev.com](https://toonstrip.danielkimdev.com).

## Install

```
npm install @toonstrip/react @toonstrip/pack-comic-chat
```

Serve the pack's files somewhere the browser can fetch them (`pack.json`,
`characters/`, `backdrops/`) — for example `public/packs/comic-chat/` in a
Vite app.

## Use

```tsx
import { ComicStrip } from "@toonstrip/react";
import doc from "./my-strip.json";

function App() {
  return <ComicStrip document={doc} packs={["/packs/comic-chat/"]} />;
}
```

| Prop | Type | Meaning |
|---|---|---|
| `document` | `ComicStripDocument` | The strip. Re-set on the element whenever it changes — updates the same element instance, no remount. |
| `packs` | `string[]` | Base URLs of asset packs, each serving `pack.json` and its files. Default `[]`. |
| `className` / `style` | — | Forwarded to the underlying `<comic-strip>` element. |

## Worked example

See `examples/react-vite` in the
[repo](https://github.com/dkdev24/toonstrip/tree/main/examples/react-vite)
for a complete, runnable Vite + React app. Full field reference:
[`docs/react.md`](https://github.com/dkdev24/toonstrip/blob/main/docs/react.md).

## License

MIT
