# The asset image specification

The rules an input PNG must follow for `@toonstrip/asset-packager` to pack it.
They are written to be hittable two ways: by a person drawing in any tool, and
by an image-generation prompt. Nothing here involves a model at build time —
the packager only ever sees finished PNGs.

The output side of the contract (`pack.json`, sprite sheets, rect tables) is
[`docs/packs.md`](./packs.md). Read this one if you are producing art; read that
one if you are hand-authoring a pack without the packager.

> **Generating with an image model?** One file per pose is the format below, and
> it works — but a **sheet** (one image holding a grid of labelled cells) keeps a
> character's identity consistent in a way separate generations cannot, and lets
> the packager register each pose against the character's NEUTRAL cell. Same
> placement rules, different container: see
> [`docs/asset-sheets.md`](./asset-sheets.md). The two mix freely.

## 1. Files and naming

```
my-source/
  source.json
  characters/<character-id>/
    face-NEUTRAL.png
    torso-NEUTRAL.png
    ...
  backdrops/<backdrop-id>.png
```

Part filenames are exactly:

```
<kind>-<EMOTION>[@<intensity>][-<variant>].png
```

- **`kind`** — `face` or `torso`. (`body` is parsed and packed, but the renderer
  composites face+torso figures only, so it warns.)
- **`EMOTION`** — one of the names below, uppercase. Anything else is an error.
- **`@intensity`** — optional, `0`–`1`. Defaults to `1`, except `NEUTRAL`, which
  defaults to `0` (that zero is what distinguishes NEUTRAL from HAPPY, which
  share an angle on the emotion wheel).
- **`-variant`** — optional integer. Several drawings for the same emotion are
  cycled round-robin by the renderer, so a character who is happy in three
  consecutive panels does not repeat one drawing.

Case matters: `Face-Happy.png` is ignored (with a warning), not accepted.
Anything else in the directory — reference sketches, notes — is ignored the same
way, so it is safe to keep it there.

### Emotion names

Faces (the eight wheel points plus neutral):

`NEUTRAL`, `HAPPY`, `COY`, `BORED`, `SCARED`, `SAD`, `ANGRY`, `SHOUT`, `LAUGH`

Torsos (gestures, plus neutral):

`NEUTRAL`, `WAVE`, `POINTOTHER`, `POINTSELF`, `DOUBLEPOINT`, `SHRUG`,
`3QRWALK`, `SIDEWALK`, `3QFWALK`

Required minimum: **`face-NEUTRAL.png` and `torso-NEUTRAL.png`**. Everything
else falls back to NEUTRAL, so a one-pose character renders — it just always
wears the same expression (the packager warns about that).

A good first pack: the nine faces above, plus `torso-NEUTRAL`, `torso-WAVE`,
`torso-SHRUG`, `torso-POINTOTHER`.

## 2. The canvas

- **Square.** Non-square is an error.
- **At least 256×256.** 1024×1024 is the recommended size — it is what most
  image models emit natively, and the packager downscales to the spec's `cell`
  (256 by default) on the way in.
- **PNG with a real alpha channel, background fully erased.** An opaque
  background — white, a colour, a checkerboard drawn as pixels — is an error,
  not something the packager can strip.
- **Hard edges.** Flat colour and clean line art. A soft, glowing or blurred
  outline earns a warning: more than 35% of the drawing being semi-transparent
  usually means an upscaled or feathered export.
- **One subject, no drop shadow, no ground shadow, no frame, no text.**

Same canvas size for every part of a character, faces and torsos alike. That is
what fixes the head-to-body proportion: the head fills most of its canvas, the
shoulders fill most of theirs, and the result is the big-headed cartoon
proportion the renderer is built around.

## 3. Placement inside the canvas

This is the part that decides whether the head lands on the neck.

**A face** is a head — skull, hair, features — with a **short neck stub** below
the chin. Draw it:

- centred horizontally,
- filling 50–98% of the canvas width (outside that window is a warning),
- with the **bottom edge of the neck stub** as the join point, so the drawing
  ends there and nothing hangs below it,
- not clipped at the top or the sides.

**A torso** is shoulders to waist:

- centred horizontally,
- filling 55–100% of the canvas width,
- with the **neck line at the top edge of the drawing** — the collar opening,
  where the stub will land,
- **cut off by the bottom edge of the canvas.** A torso floating above the
  bottom earns a warning; the renderer crops figures at the panel floor, so a
  torso needs to run off the bottom of its own canvas.

**A backdrop** is a fully painted **square** image, at least 400×400 (512 is the
default output size), with the horizon around the lower third — the renderer
covers the panel with it, anchored low. Transparency in a backdrop is a warning.

## 4. Poses must agree with each other

The join is derived **once per character, from its NEUTRAL pose**, and reused in
canvas space for every other pose of that kind. So across a character's files:

- the head stays the same size and in the same place in the face canvas —
  expressions change the eyes, brows and mouth, not the position or scale of
  the skull;
- the body stays the same size and in the same place in the torso canvas —
  gestures change the arms, not where the neck is.

A raised arm moves a torso's alpha bounding box; it must not move its neck.
Keeping the body still is what makes that safe.

## 5. Marking the join explicitly

When a pose cannot follow §3 — hair falling below the chin, a hunched
shoulder — mark the join instead. Two ways, both beating the convention:

1. **A marker pixel.** A single fully opaque magenta pixel (`#ff00ff`, alpha
   255) at the join point: the base of the neck stub on a face, the neck line on
   a torso. The packager finds it, uses it, and erases it before packing, so it
   never reaches the sheet. Draw it only on the NEUTRAL pose — that is the one
   the join is read from. (A marker larger than a dot earns a warning; it is
   averaged to its centroid.)

2. **An anchor in `source.json`**, in input-canvas pixels, which wins over
   everything:

```json
{
  "characters": [
    {
      "id": "nib",
      "anchors": { "face": { "x": 512, "y": 900 }, "torso": { "x": 512, "y": 80 } }
    }
  ]
}
```

## 6. `source.json`

```json
{
  "name": "my-pack",
  "version": "0.1.0",
  "license": "MIT",
  "description": "Four characters and a kitchen.",
  "attribution": "Art by A. Person.",
  "spec": { "cell": 256, "backdropSize": 512, "joinOverlap": 4 },
  "characters": [
    { "id": "nib", "name": "Nib", "type": "COMPLEX", "torsoFirst": false }
  ],
  "backdrops": [{ "id": "yard" }]
}
```

`name`, `version` and `license` are required — a pack without a license is not
publishable and the packager will not build one. `characters` and `backdrops`
are optional: omit them and the directory tree is scanned instead.

Spec knobs:

| Key | Default | What it does |
|---|---|---|
| `cell` | `256` | Part canvas size after downscale. Raise for crisper art at a cost in sheet size. |
| `minInput` | `256` | Smallest accepted input edge. |
| `backdropSize` | `512` | Output backdrop edge. |
| `joinOverlap` | `0` | Pixels (cell space) the head sinks into the collar. 3–6 usually reads better than 0. |

Per character: `name`, `type` (`COMPLEX`), `torsoFirst` (draw the torso over the
face's collar instead of under it), `anchors`, `joinOverlap`.

## 7. Errors vs warnings

An **error** means the pack cannot be built: unreadable file, non-square canvas,
undersized canvas, opaque background, blank image, unknown emotion name,
intensity outside 0–1, missing NEUTRAL, missing backdrop file, an anchor outside
the canvas.

A **warning** means it builds and renders but probably looks wrong: fill outside
the window, soft edges, clipping, a floating torso, a single face pose,
non-square or low-resolution backdrop, an unrecognised filename that got
skipped. A model-generated batch normally lands here — read the warnings, then
look at `--preview` before shipping.

## 8. Checking your work

```sh
toonstrip-pack template --out ref.png     # optional: a reference sheet to prompt with
toonstrip-pack validate ./my-source
toonstrip-pack build ./my-source --out ./my-pack --preview joins.png
toonstrip pack validate ./my-pack
toonstrip render strip.json --out strip.png --pack ./my-pack
```

`joins.png` is the one that catches a bad anchor: each character's NEUTRAL face
and torso composited, with the derived join crossed in pink. A head floating
above the collar or sunk into the chest means fix the placement (§3), mark the
join (§5), and rebuild.
