# @toonstrip/asset-packager

Turns character and backdrop images into a
[toonstrip](https://toonstrip.danielkimdev.com) asset pack: validates them, packs
sprite sheets, derives the face/torso join, and writes `pack.json` plus a
manifest per character. Input is either **one PNG per pose** or a **sheet** — one
image holding a grid of labelled cells, in any shape you declare.

Offline and deterministic. No model call, no network — it consumes finished
PNGs, whether they came out of an image model, Procreate, or Aseprite.

```sh
npm install -D @toonstrip/asset-packager
```

## Use it

```sh
# 1. scaffold a source pack
npx -p @toonstrip/asset-packager toonstrip-pack init ./my-source --name my-pack

# 1b. generating with an image model? get a reference sheet to prompt with
npx -p @toonstrip/asset-packager toonstrip-pack template --out ref.png

# 2. draw or generate the poses into ./my-source/characters/<id>/
#    following docs/asset-image-spec.md, then check them
npx -p @toonstrip/asset-packager toonstrip-pack validate ./my-source

# 3. build, and look at the join preview before shipping
npx -p @toonstrip/asset-packager toonstrip-pack build ./my-source --out ./my-pack --preview joins.png

# 4. the output is a normal pack
npx -p @toonstrip/cli toonstrip pack validate ./my-pack
npx -p @toonstrip/cli toonstrip render strip.json --out strip.png --pack ./my-pack
```

## Sheet input

When the art comes from an image model, generate a grid in one pass instead of a
file per pose: identity cannot drift between cells, and the packager registers
every pose against the character's NEUTRAL cell. Backdrops work the same way —
one image, many scenes.

```sh
# a reference sheet to prompt with; prints the source.json fragment and a prompt
npx -p @toonstrip/asset-packager toonstrip-pack template --out ref.png
npx -p @toonstrip/asset-packager toonstrip-pack template --out scenes.png --kind backdrop --ids hall,cellar,attic --columns 2
```

```json
{
  "characters": [
    { "id": "pim", "sheet": { "file": "characters/pim/sheet.png",
        "layout": [["face-NEUTRAL", "face-HAPPY"], ["torso-NEUTRAL", "torso-WAVE"]],
        "labelBand": 0.1 } }
  ],
  "backdropSheets": [
    { "file": "backdrops/interiors.png", "ids": ["hall", "cellar", "attic", "kitchen"], "columns": 2 }
  ]
}
```

Sheets are sliced on the gutters actually present, keyed (a flat white
background is expected — few models emit transparency), label bands cropped,
and every cell registered and checked. A per-pose file overrides a sheet cell of
the same name, so one weak cell can be regenerated on its own. Full details:
[`docs/asset-sheets.md`](../../docs/asset-sheets.md).

## Source pack layout

```
my-source/
  source.json                      # name, version, license, spec overrides
  characters/<id>/
    face-NEUTRAL.png               # required
    torso-NEUTRAL.png              # required
    face-HAPPY.png
    torso-WAVE.png
    face-SAD@0.5-2.png             # optional intensity and variant
  backdrops/<id>.png
```

Every part is a **square, transparent PNG, one pose per file**. The full rules
— canvas fill, join placement, the emotion names, what earns a warning — are in
[`docs/asset-image-spec.md`](../../docs/asset-image-spec.md). The output format
is documented in [`docs/packs.md`](../../docs/packs.md).

## The join

A face and a torso are separate drawings composited at render time, so the
packager has to know where the head meets the neck. Three routes, in priority
order:

1. `anchors` in `source.json` — explicit input-canvas pixel coordinates.
2. A single opaque magenta (`#ff00ff`) marker pixel in the art, erased before packing.
3. The convention — a face joins at the bottom-centre of its drawing, a torso at
   the top-centre of its.

The join is derived once per character from its **NEUTRAL** pose and reused for
every other pose, so keep the head and body in the same place across poses and
change only the expression or the arms.

A wrong join still produces a *valid* pack, which is what `--preview` is for:
it composites each character's NEUTRAL pair and crosses the join, so a floating
or buried head is visible at a glance.

## API

```ts
import { analyze, buildPack } from "@toonstrip/asset-packager";

const { report } = await analyze("./my-source");   // errors + warnings
const result = await buildPack({ source: "./my-source", out: "./my-pack" });
```

## Regenerating the test fixtures

Both are drawn by plain canvas calls, not by a model — `fixtures/source` for the
per-pose path, `fixtures/source-sheets` for sheet input (white ground, painted
gutters, printed labels, deliberate per-cell drift):

```sh
pnpm fixture
pnpm fixture:sheets
```

MIT.
