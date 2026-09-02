# @toonstrip/schema

The `ComicStripDocument` v1 type, its JSON Schema, and a runtime validator.
This is the data format every other `@toonstrip/*` package renders — the
common contract between a caller (who writes panels, dialogue, and emotion)
and toonstrip (which only draws them).

Part of [toonstrip](https://github.com/dkdev24/toonstrip), a
framework-embeddable comic-strip renderer. Docs, playground, and
changelog: [toonstrip.danielkimdev.com](https://toonstrip.danielkimdev.com). toonstrip generates no content —
you supply the document.

## Install

```
npm install @toonstrip/schema
```

## Usage

```ts
import { validateDocument, type ComicStripDocument } from "@toonstrip/schema";

const doc: ComicStripDocument = {
  version: 1,
  panels: [
    {
      backdrop: "pastoral",
      camera: "medium",
      bodies: [{ character: "dan", emotion: { angle: 0, intensity: 0.5 } }],
      speakers: [{ speaker: "dan", balloon: "speech", text: "Hello." }],
    },
  ],
};

validateDocument(doc); // throws ComicStripValidationError on a malformed shape
```

## Shape

- `ComicStripDocument` — `{ version: 1, panels: Panel[] }`
- `Panel` — a backdrop id, optional room title/camera preset/darkness, the
  `Body[]` on stage, and the `Line[]` spoken this panel
- `Body` — a character id, an `Emotion` (`angle`/`intensity` on the emotion
  wheel), an optional gesture (`"wave" | "point" | "shrug"`)
- `Line` — a speaker (a character id, or `"caption"`), a `BalloonKind`
  (`"speech" | "thought" | "caption"`), and text
- `CameraPreset` — one of `"reaction" | "establishing" | "wide" | "close-up" |
  "over-shoulder" | "medium"`

`character` and `backdrop` ids are just strings here — this package does not
know about asset packs. Resolving them against a real pack's roster happens
in `@toonstrip/core`/`@toonstrip/element` at render time.

See [`docs/schema.md`](https://github.com/dkdev24/toonstrip/blob/main/docs/schema.md)
in the repo for the full field reference and the emotion-wheel cheat sheet.

## License

MIT
