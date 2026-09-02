# @toonstrip/cli

The `toonstrip` command-line tool. Two commands: validating an
asset pack against the toonstrip pack contract, and rendering a Comic Strip
Document to a static PNG.

Part of [toonstrip](https://github.com/dkdev24/toonstrip), a
framework-embeddable comic-strip renderer. Docs, playground, and
changelog: [toonstrip.danielkimdev.com](https://toonstrip.danielkimdev.com).

## Install

```
npm install -g @toonstrip/cli
```

Or run without installing:

```
npx @toonstrip/cli pack validate ./my-pack
```

## Usage

```
toonstrip pack validate <dir>
```

Checks that `<dir>` is a valid toonstrip asset pack:

- `pack.json` exists and has the required shape (`name`, `version`,
  `license`, `characters`, `backdrops`)
- every declared character's sheet image and manifest file exist
- every character has at least a `NEUTRAL` face (the minimum pose a caller
  can always render)
- every declared backdrop file exists, with dimensions matching what
  `pack.json` declares

Exits `0` and prints `OK: <dir> is a valid pack` on success; exits `1` and
lists every problem found on failure.

```
$ toonstrip pack validate packages/pack-comic-chat
OK: packages/pack-comic-chat is a valid pack
```

See [`docs/packs.md`](https://github.com/dkdev24/toonstrip/blob/main/docs/packs.md)
in the repo for the full pack contract and a walkthrough for building one.

## License

MIT

## `toonstrip render`

Hangul or other non-Latin dialogue: pass `--font <file>` (repeatable) with a font file
such as Noto Sans KR so text does not fall back to whatever the OS has.


Render a `ComicStripDocument` to a single PNG in Node, with the same layout policy and
figure selection as the browser element. Useful for Open Graph images, RSS embeds, and a
`<noscript>` fallback.

```
npx toonstrip render strip.json --out strip.png
npx toonstrip render strip.json --out strip.png --width 900 --scale 2 --pack ./my-pack --transparent
```

| Flag | Default | Meaning |
|---|---|---|
| `--out <file>` | required | Output PNG path |
| `--width <px>` | `1200` | Container width; decides 1, 2, or 3 columns |
| `--scale <n>` | `2` | Backing-store scale (2 = retina) |
| `--pack <dir>` | installed `@toonstrip/pack-comic-chat` | A directory containing `pack.json`; repeatable |
| `--transparent` | off | Transparent background instead of white |
| `--background <css>` | `#ffffff` | Background colour |

Also available from code: `renderDocument(doc, options)` returns `{ png, width, height, columns }`.
