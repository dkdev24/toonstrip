# @toonstrip/cli

The `toonstrip` command-line tool. Currently one command: validating an
asset pack against the toonstrip pack contract.

Part of [toonstrip](https://github.com/dkdev24/toonstrip), a
framework-embeddable comic-strip renderer.

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
