# Sheet input: one image, many assets

`@toonstrip/asset-packager` takes two kinds of input. One transparent PNG per
pose is the plain path, documented in
[`docs/asset-image-spec.md`](./asset-image-spec.md). This page is the other one:
**sheets** — a single image holding a grid of labelled cells, sliced into many
pack assets.

Use a sheet when the art comes from an image model. Two reasons:

- **Identity holds.** Nine separately generated faces are nine chances for the
  hair colour, the line weight or the head size to drift, and no validator can
  see it. One sheet is one generation pass: one character, one style.
- **The join gets more accurate, not less.** Every cell of a sheet was drawn at
  one scale, so the packager can align each pose to the character's NEUTRAL
  cell and correct a pose drawn a few pixels off, instead of deriving a
  slightly wrong join from that pose alone.

Use per-pose files when you are drawing by hand, or when you want maximum
resolution for one particular pose. The two mix freely — see
[Mixing sheets and files](#mixing-sheets-and-files).

## The grid is yours to choose

Nothing is fixed at 3×3. A backdrop sheet declares the ids it holds, in reading
order, and (optionally) how many columns; the rows follow. A character sheet
declares a `layout`, so its shape is whatever you drew. Cells no name reaches
are simply unused — a model that fills out an awkward last row does no harm.

Several sheets of different shapes can live in one pack, alongside individual
files.

## Start from a template

```sh
toonstrip-pack template --out ref-character.png
toonstrip-pack template --out ref-scenes.png --kind backdrop \
  --ids hall,cellar,attic,kitchen --columns 2
```

Each run writes the reference image **and prints the `source.json` fragment for
it plus a prompt skeleton**. Hand the image to a model that accepts a reference
image, paste the prompt, and describe the character (or the world) in the one
bracketed slot the skeleton leaves for you.

The template carries what a prompt says badly: the grid, the cell order, the
label position, the chin and neck rules, the framing. Tell the model — the
printed prompt already does — not to reproduce the pale grey guide lines or
their captions, and to keep the printed cell labels.

## Declaring a character sheet

```json
{
  "characters": [
    {
      "id": "pim",
      "name": "Pim",
      "sheet": {
        "file": "characters/pim/sheet.png",
        "layout": [
          ["face-NEUTRAL", "face-HAPPY", "face-SAD"],
          ["torso-NEUTRAL", "torso-WAVE", null]
        ],
        "labelBand": 0.1,
        "keyBackground": true
      }
    }
  ]
}
```

A layout cell is a part filename without the `.png` — the same
`<kind>-<EMOTION>[@intensity][-variant]` naming the per-pose path uses, so
`face-SAD@0.5`, `face-HAPPY-2` and `torso-WAVE` are all valid cells. `null`
skips a cell.

Cell art follows the same placement rules as an individual file: head plus a
short neck stub with the stub's base as the join, torso from the neck line
running off the bottom edge of its cell.

## Declaring backdrop sheets

```json
{
  "backdropSheets": [
    { "file": "backdrops/interiors.png", "ids": ["hall", "cellar", "attic", "kitchen"], "columns": 2, "labelBand": 0.1 },
    { "file": "backdrops/exteriors.png", "ids": ["yard", "lane", "dock", "market", "ridge"], "columns": 3, "labelBand": 0.1 }
  ]
}
```

Five ids at three columns is a 3×2 grid with one cell spare. Each cell should be
a complete scene filling its cell edge to edge; the packager keeps the largest
**centred square** of it, so keep the subject central.

## Sheet options

| Key | Default | What it does |
|---|---|---|
| `file` | — | Source-relative path to the sheet image. Required. |
| `ids` / `layout` | — | What the cells are. Required (`ids` for backdrops, `layout` for characters). |
| `columns` / `rows` | derived | Declare either, both, or neither. |
| `labelBand` | `0` | Fraction of each cell's height taken by a printed label, cropped before anything else looks at the cell. Use `0.1` with the template. |
| `inset` | `0.02` | Fraction trimmed off all four sides of each cell, to drop the half of a painted gutter stroke that lands inside the cell. |
| `keyBackground` | `true` for character sheets, `false` for backdrop sheets | Erase a flat background by flood-filling in from the cell's edges. `true` uses the default tolerance; a number sets it. |
| `gutterWindow` | `0.2` | How far from its nominal position a gutter may be found, as a fraction of the cell. |

### About `keyBackground`

Most image models cannot reliably emit transparency, so a character sheet
usually arrives on flat white — which the per-pose path rejects outright. On a
sheet it is expected and handled: keying floods in from each cell's edges, so a
white shirt or a white eye stays white because neither is connected to the edge.

A background that is *not* flat — a gradient, a drawn room, a checkerboard
pattern standing in for transparency — cannot be keyed. Ask for a plain
single-colour background, and the error you get if you don't is
`background is not transparent`.

## What the slicer checks

The declared grid is the expectation; the pixels are the measurement. Cell
boundaries start at an even division and are pulled to the gutters actually
present, so a model's imprecision is absorbed rather than fatal.

**Errors** (the pack will not build):

- a cell an id points at is blank — the sheet has fewer scenes than the grid declares
- more ids than the grid has cells
- a layout cell name that is not a part filename
- a grid so dense the cells cannot carry `spec.cell` (or `spec.backdropSize`) at half size or better
- the sheet file is missing or unreadable

**Warnings** (it builds; look before shipping):

- a drawing running into the gutter — the slice may have cut through it
- a pose drawn more than 12% wider or narrower than the NEUTRAL cell: the model
  changed scale mid-sheet, so that pose will not composite at the same size
- two backdrop cells that are near-identical: the model repeated a scene
- cells below `spec.cell` but above half of it — it will build, and look soft

Every diagnostic names the cell it is about, as
`sheet.png[column,row] -> name`.

## Mixing sheets and files

Where a sheet cell and an individual file describe the same asset, **the file
wins**. That is the intended workflow when one cell comes out badly:

1. Generate the sheet, build, look at `--preview`.
2. Regenerate the weak pose on its own, using the sheet as the reference image
   so it stays in style.
3. Drop it in as `characters/<id>/face-LAUGH.png` and rebuild. No edit to
   `source.json` needed.

The same applies to backdrops: a `backdrops/<id>.png` file overrides the sheet
cell that claimed that id.

## Resolution, honestly

A sheet costs detail, and the denser the grid the more it costs. A model
capping out at 1536px gives roughly 512px cells on a 3×3, about 300px on a 5×4.
Against the default 256px `cell` a 3×3 is comfortable and a 5×4 is marginal; the
packager tells you when the grid cannot carry the pack's cell size.

Two ways to spend that budget: several smaller sheets instead of one large grid
(they slice independently, and shapes may differ), or a sheet to lock identity
plus per-pose regeneration of the cells that matter most.

## Checking your work

```sh
toonstrip-pack validate ./my-source
toonstrip-pack build ./my-source --out ./my-pack --preview joins.png
toonstrip pack validate ./my-pack
```

`joins.png` still matters with sheet input. Registration corrects drift
*between* poses; it cannot know that the reference cell's own chin was drawn
where the guide said. Look at the preview before shipping the pack.

`packages/asset-packager/fixtures/source-sheets` is a working sheet pack —
white background, painted gutters, printed labels, deliberate per-cell drift —
generated by `scripts/make-sheet-fixture.mjs` with no model involved. Compare
against it when something slices oddly.
