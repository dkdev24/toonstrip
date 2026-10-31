# Asset packs

An asset pack is what supplies the actual character art and backdrop images a
`ComicStripDocument` references by id. toonstrip ships one default pack
(`@toonstrip/pack-comic-chat`, the 15-character Comic Chat roster) and one
small original pack used only to prove the contract (`@toonstrip/pack-example`,
one character — see the end of this doc). Anyone can write a new pack; this
document is that walkthrough.

> **Don't want to hand-write a rect table?** If you have (or can generate) one
> transparent PNG per pose, `@toonstrip/asset-packager` builds everything below
> for you — sheets, rects, join anchors, `pack.json`. The input rules are in
> [`docs/asset-image-spec.md`](./asset-image-spec.md). Read on if you would
> rather assemble a pack yourself, or want to know what the packager emits.

## Directory layout

```
my-pack/
  pack.json                              # manifest index (below)
  characters/<id>/sheet.png              # one sprite sheet per character
  characters/<id>/<id>.json              # that character's pose→rect table
  backdrops/<id>.png                     # one image per backdrop
  NOTICE                                 # required if the art isn't wholly your own (see Licensing)
```

`@toonstrip/pack-comic-chat` and `@toonstrip/pack-example` are both built this
way — read either as a working reference alongside this doc.

## `pack.json`

```json
{
  "name": "my-pack",
  "version": "0.1.0",
  "license": "MIT",
  "characters": [
    { "id": "pip", "name": "Pip", "manifest": "characters/pip/pip.json", "sheet": "characters/pip/sheet.png" }
  ],
  "backdrops": [
    { "id": "meadow", "file": "backdrops/meadow.png", "width": 240, "height": 240 }
  ]
}
```

- `name` is the pack's identity — this is what a runtime consumer references
  it by (see "Loading a pack at runtime" below), not the npm package name.
- `license` is required on every pack (not inherited from the repo) — see
  "Licensing" below.
- Each `characters[]` entry points at that character's own manifest + sheet,
  relative to the pack root.
- Each `backdrops[]` entry declares the image's pixel dimensions; `toonstrip
  pack validate` checks the file actually matches.

## A character's manifest (`characters/<id>/<id>.json`)

This is a `PackedAvatar` (typed in `packages/core/src/cast-manifest.ts`, and
independently duplicated — deliberately, see "Why types are duplicated"
below — in each pack package's own `src/types.ts`):

```ts
interface PackedAvatar {
  name: string;
  type: string;           // informational; the renderer doesn't branch on it today
  torsoFirst: boolean;    // does the torso draw over the face's collar, or under it?
  sheet: string;          // relative path to the sprite sheet, from this manifest's directory
  sheetWidth: number;
  sheetHeight: number;
  faces: PackedPart[];
  torsos: PackedPart[];
  bodies: PackedPart[];   // unused by the current renderer — leave empty
}

interface PackedPart {
  kind: "face" | "torso" | "body";
  index: number;
  emotion: string;        // a name, e.g. "NEUTRAL", "HAPPY" — free-form, but see below
  angle: number;          // position on the emotion wheel, in radians (or a gesture sentinel, see below)
  intensity: number;      // 0–1
  cx: number;             // neck-socket x (torso), or its counterpart in the face image
  cy: number;
  cxDelta: number;        // per-face nudge on the socket (a tilted head, a thrown-back laugh)
  cyDelta: number;
  x: number;              // where a speech-balloon tail attaches
  figure: { x: number; y: number; width: number; height: number };  // this part's rect in the sheet
  aura: { x: number; y: number; width: number; height: number } | null; // a halo, drawn before the figure
}
```

The renderer composites one `face` and one `torso` at draw time (see
`packages/core/src/figure.ts`'s `figureFor`) — a pack ships parts, not
pre-baked figures, which is what lets the same character round-robin distinct
face/torso pairings across panels instead of freezing one drawing per emotion.

**Minimum requirement:** every character needs at least one `face` with
`emotion: "NEUTRAL"` and at least one `torso` (any emotion — it's the fallback
every other pose selection degrades to). `toonstrip pack validate` enforces
the `NEUTRAL` face; a character with faces but zero torsos will validate but
silently fail to render (`figureFor` returns `null` and nothing is drawn) —
this is a known gap, see `NOTES.md` "M5".

**Gestures:** `pose`/`Body.pose` in a `ComicStripDocument` (`"wave"` /
`"point"` / `"shrug"`) resolves against a torso whose `angle` matches the
corresponding sentinel value (`1001`/`1002`/`1005` — see
`packages/core/src/emotion.ts` and `render.ts`'s `emotionOptionsFor`), not
against the normal 0–2π emotion-wheel range. To support a gesture, declare a
torso at that exact angle; you don't need to support all three.

## Backdrops

A backdrop is just an id + a PNG. There's no room graph, no implicit
adjacency — a `Panel.backdrop` in a document names one directly. `toonstrip
pack validate` checks that the declared `width`/`height` in `pack.json`
actually match the PNG's own dimensions.

## Validating a pack

```
npx -p @toonstrip/cli toonstrip pack validate ./my-pack
```

(or, inside this monorepo during development: `node packages/cli/dist/bin.js
pack validate ./my-pack`, or `pnpm --filter @toonstrip/cli exec toonstrip
pack validate ./my-pack` once linked.)

Checks performed (`packages/cli/src/pack-validate.ts`):
- `pack.json` exists, is valid JSON, and has `name`/`version`/`license`
- every declared character's `manifest` and `sheet` files exist
- every character has at least one `NEUTRAL` face
- every declared backdrop file exists and its real PNG dimensions match
  `pack.json`

A passing pack prints `OK: <dir> is a valid pack` and exits 0; a failing one
prints every issue found and exits 1 — fix all of them, `pack validate`
doesn't stop at the first.

## Loading a pack at runtime

Two different loaders exist for two different environments — both consume
the same manifest shape (`CastManifest`, `packages/core/src/cast-manifest.ts`):

- **Node** (rendering with `@napi-rs/canvas`, or writing tooling): a pack
  package exports `loadPackJson()`/`loadCastManifest()` reading straight off
  disk (see `packages/pack-comic-chat/src/index.ts` or
  `packages/pack-example/src/index.ts` — copy this pattern for a new pack
  that ships as its own npm package).
- **Browser** (`<comic-strip>`, `packages/element`): packs are registered by
  URL. Set the element's `.packs` property to a list of base URLs, each
  pointing at a directory containing that pack's `pack.json` + `characters/`
  + `backdrops/`:

  ```js
  el.packs = ["/packs/comic-chat/", "/packs/my-pack/"];
  el.document = myComicStripDocument;
  ```

  A `character`/`backdrop` id declared by more than one registered pack is a
  **hard error** at load time (`packages/element/src/load-pack.ts`), not a
  silent first-match — a collision means two packs are fighting over the same
  id and the caller needs to know immediately, per §6 of the dev plan.

  In Astro, `@toonstrip/astro`'s `toonstrip({ packs: [...] })` integration
  takes this a level higher: you list pack **package specifiers** (e.g.
  `"@toonstrip/pack-comic-chat"`), and it copies each pack's files into the
  site's `public/_toonstrip/<pack.json name>/` at build/dev-server-setup
  time. The `<ComicStrip>` component's own `packs` prop then takes pack
  **names** (the `pack.json` `name` field, e.g. `"comic-chat"`), which it maps
  to that same URL convention. See [`astro.md`](./astro.md).

## Licensing

`pack.json`'s `license` field is required — don't leave it out, and don't
assume the surrounding repo's license applies to a pack's art by default.

If a pack incorporates *any* third-party art (converted, adapted, or
otherwise not wholly your own), ship a `NOTICE` file crediting the original
source, its license, and any trademark disclaimer that applies —
`packages/pack-comic-chat/NOTICE` is the worked example (Microsoft Comic
Chat art, MIT-licensed, with a trademark disclaimer since "Comic Chat" is a
Microsoft mark). If every asset in the pack is your own original work (drawn,
scripted, or otherwise authored by you), a short `NOTICE` saying so is still
good practice — `packages/pack-example/NOTICE` is that worked example — but
strictly required only when there's something to attribute.

## Worked example: adding a new character

This walkthrough is also the actual self-test used to verify this document
while writing it (see `NOTES.md` "M5") — every command below was run for
real against `@toonstrip/pack-example`.

1. **Draw or generate art.** Pip's sheet (`packages/pack-example/characters/pip/sheet.png`)
   is drawn by a small script (`packages/pack-example/scripts/generate.mjs`)
   using `@napi-rs/canvas` — you don't need a script; any image editor
   producing a single sheet image works too. At minimum you need one
   `NEUTRAL` face and one torso drawn somewhere in the sheet, each as a
   rectangular region.
2. **Write the character manifest.** Record each part's rectangle in the
   sheet plus its socket coordinates (`cx`/`cy`) as a `PackedAvatar` JSON file
   (see the shape above). Reuse an existing character's manifest as a
   template — the numbers matter (they're pixel offsets into your specific
   sheet image), but the structure doesn't change.
3. **Register it in `pack.json`.** Add an entry to `characters[]` pointing at
   the manifest and sheet you just made.
4. **Validate.**
   ```
   node packages/cli/dist/bin.js pack validate packages/my-pack
   ```
   Fix anything it reports before moving on.
5. **Render it to confirm.** The fastest proof is a small script using
   `@toonstrip/core`'s `renderPanel` directly against your pack's
   `loadCastManifest()` output (see `packages/core/test/pack-example.test.ts`
   for exactly this, written against `pip`) — render one panel referencing
   your new character, write the canvas to a PNG, and open it.

If you get this far and the character renders, you're done — that's the
whole contract.

## Why types are duplicated

`@toonstrip/pack-comic-chat` and `@toonstrip/pack-example` each keep their own
copy of `SheetRect`/`PackedPart`/`PackedAvatar`/`PackedBackdrop`/`CastManifest`
in a local `src/types.ts`, rather than importing them from
`@toonstrip/core`. This is intentional, not duplication-by-oversight: per the
dev plan's dependency direction (`schema → core → element → astro`), a pack
depends on `@toonstrip/schema` only — it ships a manifest plus images and
never imports rendering code. TypeScript's structural typing unifies the two
copies automatically the moment a caller passes a pack's `CastManifest` into
`packages/core`'s renderer; no explicit import is needed in either direction,
and packs stay free of a `packages/core` version-lockstep dependency.
