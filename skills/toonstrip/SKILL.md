---
name: toonstrip
description: Author and validate a toonstrip ComicStripDocument (panels, characters, emotions, balloons, backdrops) for the toonstrip comic-strip renderer, and build new asset packs from per-pose PNGs. Use whenever asked to write, generate, or fix a toonstrip document/strip, work with @toonstrip/schema or @toonstrip/cli, render a comic strip to PNG with `toonstrip render`, or create a toonstrip character/backdrop asset pack (writing the image-generation prompts and running @toonstrip/asset-packager).
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

## Making a new asset pack (new characters or backdrops)

When the ask is a character or backdrop the installed packs don't have, the answer is a
new asset pack — **not** a change to the document schema and not a rendering tweak. The
path is: generate (or receive) one PNG per pose → `@toonstrip/asset-packager` → a pack
you can `--pack` at the CLI. You write the prompts; the packager never calls a model.

**If the art will come from an image model, prefer a sheet** (one image holding a grid
of labelled cells) over one generation per pose — see "Sheets" below. It is one pass, so
the character cannot drift between poses, and the packager can register every pose
against the NEUTRAL cell. Per-pose files remain right for hand-drawn art, and for
regenerating a single weak cell.

**The full input rules are in `docs/asset-image-spec.md` (and `docs/asset-sheets.md` for
sheets) — read them before writing prompts.** The essentials you must get into every
prompt:

- **One pose per image**, square canvas, **1024×1024**, **transparent background**
  (PNG with alpha, background fully erased — not white, not a checkerboard).
- Flat colour, clean hard-edged line art. **No** drop shadow, ground shadow, gradient,
  glow, frame, border, watermark, text or background scenery.
- A **face** image is a head (skull, hair, features) plus a **short neck stub**, centred,
  filling ~70% of the canvas width, with nothing drawn below the stub's bottom edge.
- A **torso** image is shoulders to waist, centred, filling ~85% of the canvas width,
  with the **neck line at the top of the drawing** and the body **running off the bottom
  edge** of the canvas.
- A **backdrop** is a fully painted square scene (1024×1024), horizon in the lower third,
  no characters, no text.
- **Consistency across a character's poses is the whole game**: same art style, same
  colours, same head size and position in the face canvas (only eyes/brows/mouth change),
  same body size and position in the torso canvas (only arms change). Put a fixed
  "character sheet" description — hair, skin, clothing, colours, line weight — verbatim
  in every prompt for that character, and vary only the pose clause.

Filenames are the contract; the emotion must be one of the exact names below:

```
characters/<id>/face-<EMOTION>.png     NEUTRAL HAPPY COY BORED SCARED SAD ANGRY SHOUT LAUGH
characters/<id>/torso-<EMOTION>.png    NEUTRAL WAVE POINTOTHER POINTSELF DOUBLEPOINT SHRUG
backdrops/<id>.png
```

Minimum viable character: `face-NEUTRAL.png` + `torso-NEUTRAL.png`. Good first batch:
all nine faces plus `torso-NEUTRAL`, `torso-WAVE`, `torso-SHRUG`, `torso-POINTOTHER`.

A prompt that works, as a template — keep the bracketed style block identical across the
whole batch and change only the last line:

```
Character sheet reference: [a wiry man in his 40s, short dark hair, olive skin,
teal collarless shirt, thick uniform black outlines, flat cel shading, 4 colours].
Comic-strip cartoon style, big head proportions.

Output: a single 1024x1024 PNG with a fully transparent background. Draw only the
subject, centred, no background, no shadow, no frame, no text.

Subject: [the character's head and a short neck stub, front view, filling about 70%
of the image width, nothing drawn below the neck stub].

Expression: [mouth open in a wide grin, eyes crinkled, brows raised — happy].
```

Then run the packager (the join preview is not optional — it is the only thing that
catches a head that lands off the neck):

```
npx toonstrip-pack init ./my-source --name my-pack
# ...write the PNGs into ./my-source/characters/<id>/ ...
npx toonstrip-pack validate ./my-source
npx toonstrip-pack build ./my-source --out ./my-pack --preview joins.png
npx toonstrip pack validate ./my-pack
npx toonstrip render doc.json --out strip.png --pack ./my-pack
```

Inside the toonstrip monorepo, use `node packages/asset-packager/dist/bin.js` instead of
`npx toonstrip-pack`.

### Sheets: one image, many assets

When the model accepts a reference image, generate a grid instead of separate files.
**The grid shape is yours** — declare it; nothing is fixed at 3x3.

```
npx toonstrip-pack template --out ref-character.png
npx toonstrip-pack template --out ref-scenes.png --kind backdrop --ids hall,cellar,attic,kitchen --columns 2
```

Each run prints the `source.json` fragment for that sheet **and** a prompt skeleton with
one bracketed slot to fill in. Use them: hand the model the reference image, paste the
prompt, describe the character (or the world) in the bracket. Then save the returned
image where the fragment says, paste the fragment into `source.json`, and run
`validate` / `build --preview` exactly as above.

Two prompt rules the template cannot enforce, so keep them in the text:

- "Reproduce this grid exactly — same columns, rows, order, cell boundaries, labels."
- "Do not draw the pale grey guide lines or their captions; they mark where things go."

Sheet-specific things to know:

- A flat **white background is fine on a sheet** (`keyBackground` is on by default) —
  most image models cannot emit transparency. A *gradient* or drawn background is not
  keyable: ask for plain single-colour.
- Backdrop cells are centre-cropped to a square, so keep each scene's subject central.
- Diagnostics name the cell (`sheet.png[2,1] -> face-SAD`). "Blank cell" means the sheet
  has fewer scenes than the grid declares; "changed scale mid-sheet" means one pose was
  drawn bigger than NEUTRAL and will not composite at the same size; "near-identical
  scenes" means the model repeated a cell. All three are regenerate-and-retry, not
  packager bugs.
- **A per-pose file overrides a sheet cell of the same name.** That is the fix for one
  bad cell: regenerate just that pose (using the sheet as the reference image so it stays
  in style), drop it in as `characters/<id>/<kind>-<EMOTION>.png`, rebuild. No
  `source.json` change.
- Denser grid = smaller cells. If the packager says the cells are below the pack's cell
  size, split the poses across two sheets rather than shrinking the art.

How to read what comes back:

- **Errors** block the build. Fix the file (or the prompt) and re-run — never `--force`
  to get past them.
- **Warnings** build but usually mean it will look wrong. `background is not
  transparent` and `torso stops Npx above the bottom` are prompt problems: regenerate.
  `drawing fills X% of the canvas width` means that pose is out of proportion with the
  rest of the pack.
- **Then look at `joins.png`.** A valid pack can still have the head floating above the
  collar or sunk into the chest, and no validator can see it. If a join is wrong, fix the
  drawing per the spec, or mark the join explicitly: a single opaque magenta `#ff00ff`
  pixel at the join point in the NEUTRAL pose (erased at pack time), or an `anchors`
  entry in `source.json`. Bump `joinOverlap` (3–6) if the head sits a touch high.

Report the ids the pack declares back to the user — those ids are what a document's
`character` and `backdrop` fields must use.

## Common mistakes to avoid

- Forgetting `Body.emotion` — it is required, there is no default.
- Passing a bare number or string for `emotion` instead of `{ angle, intensity }`.
- Inventing a `camera` value outside the six listed presets.
- Inventing a character/backdrop id not in the registered pack's roster.
- Adding an extra key the schema doesn't define (typos are rejected, not ignored).
- Trying to add a character by editing a pack's `pack.json` or a manifest's rect table by
  hand — build a source pack and run the packager instead.
- Generating pose images at different sizes, on white backgrounds, or with the head at a
  different scale in each file. Consistency across a character's poses is what makes the
  face/torso join work. (On a *sheet*, white is fine and consistency comes free — that is
  the reason to prefer one.)
- Assuming a sheet must be 3x3, or hand-slicing a sheet into files yourself. Declare the
  grid you actually generated and let the packager slice it.
- Claiming a new pack works without looking at `joins.png`.
- Treating this schema as a place for AI-generated prose about *how* to write a story —
  toonstrip only renders the document; producing the panels/dialogue content is the
  caller's job, not something this skill or the renderer does for you.
