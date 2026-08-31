# The Comic Strip Document

`@toonstrip/schema` defines the one public data format toonstrip renders: a
`ComicStripDocument`. Everything downstream — `packages/core`'s renderer,
`<comic-strip>`, the Astro component — takes this shape as input. You can
hand-write one, generate it with a script in any language, or produce it from
a CMS; nothing about authoring a document requires TypeScript or Node.

## Shape (v1)

```ts
interface ComicStripDocument {
  version: 1;
  panels: Panel[];
}

interface Panel {
  backdrop: string;          // an id an active asset pack resolves
  roomTitle?: string;        // optional banner text
  dark?: boolean;            // paints the panel black, figures omitted
  camera?: CameraPreset;     // default "medium"
  bodies: Body[];            // who is on stage, left-to-right
  speakers: Line[];          // balloons, draw order: caption, then each body with a line
}

type CameraPreset =
  | "reaction" | "establishing" | "wide" | "close-up" | "over-shoulder" | "medium";

interface Body {
  character: string;                              // an id an active asset pack resolves
  emotion: { angle: number; intensity: number };   // required — see "Emotion" below
  pose?: "wave" | "point" | "shrug";               // optional gesture
  requested?: boolean;                             // stage even if silent (default true if it has a line)
}

interface Line {
  speaker: string | "caption";                     // a body's character id, or the bodiless caption channel
  balloon: "speech" | "thought" | "caption";
  text: string;
}
```

The exact types live in `packages/schema/src/types.ts`; the JSON Schema
(draft-07, `additionalProperties: false` throughout) lives in
`packages/schema/src/schema.json` and is the authoritative machine-checkable
version — use it if you're generating documents from a non-TypeScript
toolchain.

## Emotion

`Body.emotion` is a point on toonstrip's emotion wheel: `angle` (radians) and
`intensity` (0–1) together pick the nearest matching facial expression a pack
declares. You don't need to memorize the wheel to author documents by hand —
reasonable starting points:

| Feeling | angle | intensity |
|---|---|---|
| Neutral | `0` | `0` |
| Happy | `0` | `0.4`–`1` |
| Sad | `Math.PI` | `0.4`–`1` |

Packs are free to declare faces at any angle; the renderer picks the closest
one it has. `pose` is a separate, coarser channel — a gesture sentinel
(`wave`/`point`/`shrug`) that claims the torso independently of the face's
emotion, so a character can wave while looking sad.

## Validating a document

```ts
import { validateDocument, ComicStripValidationError } from "@toonstrip/schema";

try {
  const doc = validateDocument(JSON.parse(rawJson));
  // doc is now typed as ComicStripDocument
} catch (err) {
  if (err instanceof ComicStripValidationError) {
    // err.issues: ajv ErrorObject[]
    console.error(err.message);
  }
}
```

`validateDocument` checks structure only — required fields, types, enum
membership, `additionalProperties: false` (an unknown top-level or per-object
key is rejected, not silently ignored). It does **not** check that a
`character`/`backdrop` id is actually declared by a registered pack — that
happens at load time against whatever packs you've registered (see
[`packs.md`](./packs.md)), and an unresolved id there is a hard error, not a
silent fallback.

## What a validation error looks like

```
Invalid ComicStripDocument:
  /panels/0/camera must be equal to one of the allowed values
  /panels/0 must NOT have additional properties
```

Each line is one ajv issue: an [instance path](https://ajv.js.org/api.html#validation-errors)
into your document, plus what was wrong. Fix top-to-bottom — `additionalProperties`
errors are common typos (e.g. `emotions` instead of `emotion`).
