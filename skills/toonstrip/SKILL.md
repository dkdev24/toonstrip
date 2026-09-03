---
name: toonstrip
description: Author and validate a toonstrip ComicStripDocument (panels, characters, emotions, balloons, backdrops) for the toonstrip comic-strip renderer. Use whenever asked to write, generate, or fix a toonstrip document/strip, work with @toonstrip/schema or @toonstrip/cli, or render a comic strip to PNG with `toonstrip render`.
---

# toonstrip: authoring a ComicStripDocument

toonstrip renders a comic strip from a single JSON document you author — it does not
generate content itself. Your job when this skill is loaded is to **produce a
schema-valid `ComicStripDocument`** (and, when a render/preview is asked for, actually
run the CLI to prove it renders) — never to guess the shape from memory.

## The document shape (v1)

```ts
interface ComicStripDocument {
  version: 1;
  panels: Panel[];
}

interface Panel {
  backdrop: string;              // a backdrop id the pack declares — see "Default pack" below
  roomTitle?: string;            // optional banner text
  dark?: boolean;                // paints the panel black, no figures drawn
  camera?: CameraPreset;         // default "medium" if omitted
  bodies: Body[];                // who is on stage, left to right
  speakers: Line[];              // balloons, drawn in array order
}

type CameraPreset =
  | "establishing" | "wide" | "medium" | "close-up" | "reaction" | "over-shoulder";

interface Body {
  character: string;                              // a character id the pack declares
  emotion: { angle: number; intensity: number };   // REQUIRED — see "Emotion wheel" below
  pose?: "wave" | "point" | "shrug";               // optional gesture, independent of emotion
  requested?: boolean;                             // stage even if silent (default: true if it has a line)
}

interface Line {
  speaker: string | "caption";   // a body's `character` id, or the bodiless "caption" channel
  balloon: "speech" | "thought" | "caption";
  text: string;
}
```

**Every object above is `additionalProperties: false`.** A typo'd key (`emotions`
instead of `emotion`, `title` instead of `roomTitle`) fails validation — it is never
silently ignored. `Body.emotion` is required on every body, even a NEUTRAL one.

## Emotion wheel

`emotion.angle` (radians) + `emotion.intensity` (0–1) together select the nearest
facial expression the pack has. Use these exact angles — do not invent your own:

| Name | angle (radians) | typical intensity |
|---|---|---|
| HAPPY | `0` | `0.4`–`1` |
| COY | `Math.PI / 4` | `0.4`–`1` |
| BORED | `Math.PI / 2` | `0.4`–`1` |
| SCARED | `(3 * Math.PI) / 4` | `0.4`–`1` |
| SAD | `Math.PI` | `0.4`–`1` |
| ANGRY | `(5 * Math.PI) / 4` | `0.4`–`1` |
| SHOUT | `(3 * Math.PI) / 2` | `0.4`–`1` |
| LAUGH | `(7 * Math.PI) / 4` | `0.4`–`1` |
| NEUTRAL | `0` | `0` (intensity 0 is what distinguishes it from HAPPY, same angle) |

Any angle/intensity in range is legal — the renderer picks the pack's nearest match —
but hitting one of these named points exactly is the reliable way to get a specific,
predictable expression instead of an interpolated guess.

`pose` is a separate, coarser channel from emotion: a character can be `"wave"`-ing
while `SAD`. Only three gestures are exposed at the document level: `"wave"`,
`"point"`, `"shrug"`. Omit `pose` for a character who is just standing.

## Default pack: `@toonstrip/pack-comic-chat`

Unless the caller names a different pack, author documents against this pack's ids —
**do not invent a character or backdrop id that isn't in this list**; an unresolved id
is a hard error at render time, not a silent fallback.

Characters (`Body.character`): `dan`, `anna`, `bolo`, `denise`, `kevin`, `lynnea`,
`margaret`, `rebecca`, `tiki`, `sage`, `kwensa`, `hugh`, `maynard`, `scotty`, `tongtyed`.

Backdrops (`Panel.backdrop`): `field`, `pastoral`, `room8bs`.

If the user's request needs a character or backdrop outside this list, either pick the
closest fit from this roster and say so, or point them at `docs/packs.md` (in the
toonstrip repo) for how to add a new one — don't fabricate an id and hope it exists.

## Writing a document: a minimal example

```json
{
  "version": 1,
  "panels": [
    {
      "backdrop": "pastoral",
      "camera": "establishing",
      "bodies": [{ "character": "dan", "emotion": { "angle": 0, "intensity": 0.6 } }],
      "speakers": [{ "speaker": "caption", "balloon": "caption", "text": "A field outside town." }]
    },
    {
      "backdrop": "pastoral",
      "camera": "medium",
      "bodies": [
        { "character": "dan", "emotion": { "angle": 0, "intensity": 0.8 }, "pose": "wave" },
        { "character": "anna", "emotion": { "angle": 3.14159, "intensity": 0.7 } }
      ],
      "speakers": [
        { "speaker": "dan", "balloon": "speech", "text": "Hey, Anna!" },
        { "speaker": "anna", "balloon": "thought", "text": "Oh no, not again." }
      ]
    }
  ]
}
```

Notes:
- A body only needs to appear in `bodies` once per panel; it stays on stage across
  panels only if you list it again (there is no implicit persistence).
- `speakers` order is draw order: put `"caption"` lines first if you want a banner-style
  caption to read before the dialogue.
- A body can be `bodies`-listed with no matching line in `speakers` (silent on stage) —
  useful for a reaction shot. Set `requested: false` explicitly only if you want a body
  *with* a line to NOT be drawn (rare).

## Validating and rendering — do this before claiming a document works

Never hand back a document without running it through the tooling at least once.

**Option A — validate programmatically** (fastest, no image produced):

```js
import { validateDocument, ComicStripValidationError } from "@toonstrip/schema";

try {
  validateDocument(doc); // throws on any structural problem
  console.log("valid");
} catch (err) {
  if (err instanceof ComicStripValidationError) console.error(err.message); // one line per problem, e.g. "/panels/0/camera must be equal to one of the allowed values"
}
```

**Option B — render to PNG** (validates AND proves character/backdrop ids resolve
against a real pack — the stronger check, prefer this when a pack is available):

```
npx @toonstrip/cli render doc.json --out strip.png
```

or, inside the toonstrip monorepo during development:

```
node packages/cli/dist/bin.js render doc.json --out strip.png
```

`render` fails loudly (`FAIL: <message>`, exit 1) on a schema error OR an unresolved
character/backdrop id — either kind of failure means the document needs fixing, not
that the tool is wrong. Fix top-to-bottom and re-run; don't stop after the first
error if the output lists more than one.

If no pack is installed in the working project, point `--pack` at
`@toonstrip/pack-comic-chat`'s directory directly (or install it as a dependency —
`render` uses it by default when installed).

## Common mistakes to avoid

- Forgetting `Body.emotion` — it is required, there is no default.
- Passing a bare number or string for `emotion` instead of `{ angle, intensity }`.
- Inventing a `camera` value outside the six listed presets.
- Inventing a character/backdrop id not in the registered pack's roster.
- Adding an extra key the schema doesn't define (typos are rejected, not ignored).
- Treating this schema as a place for AI-generated prose about *how* to write a story —
  toonstrip only renders the document; producing the panels/dialogue content is the
  caller's job, not something this skill or the renderer does for you.
