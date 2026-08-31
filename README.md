# toonstrip

A framework-embeddable library that renders a comic strip — panels,
characters, poses, emotions, speech/thought balloons, backdrops — from
caller-supplied data, as a live, responsive, canvas-based widget. Not a flat
pre-rendered image: panels are drawn on real `<canvas>` elements and
re-render as their container resizes.

toonstrip does not generate content. You supply panels, dialogue, and
emotion as data (by hand, by script, by calling an LLM yourself); toonstrip
only renders it. See `TOONSTRIP_DEV_PLAN.md` §0 for the full list of
non-goals.

## Packages

| Package | What it is |
|---|---|
| `packages/schema` | The `ComicStripDocument` v1 types, JSON Schema, and a runtime validator |
| `packages/core` | The framework-agnostic rendering engine (figures, balloons, backdrops, layout) |
| `packages/element` | `<comic-strip>`, a zero-framework-deps custom element wrapping `core` |
| `packages/astro` | An Astro integration + `<ComicStrip>` component wrapping `element` |
| `packages/pack-comic-chat` | The default asset pack: the original 15-character Comic Chat roster + 3 backdrops (MIT, see its `NOTICE`) |
| `packages/pack-example` | A second, small, wholly original pack proving the pack contract isn't coupled to `pack-comic-chat` |
| `packages/cli` | The `toonstrip` CLI (`pack validate`, and later the static-PNG fallback) |
| `examples/astro-blog` | A minimal Astro site embedding a live strip in a blog post |

Dependency direction is one-way: `schema → core → element → astro`. Asset
packs depend on `schema` only.

## Quick start (development)

```
pnpm install
pnpm build
pnpm test
```

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the full workspace guide,
including how to add a new character or asset pack.

## Documents

- [`docs/schema.md`](./docs/schema.md) — the `ComicStripDocument` format
- [`docs/packs.md`](./docs/packs.md) — the asset pack contract, and a
  worked walkthrough for adding a character
- [`docs/astro.md`](./docs/astro.md) — embedding a strip in Astro
- [`TOONSTRIP_DEV_PLAN.md`](./TOONSTRIP_DEV_PLAN.md) — the full project plan
- [`HANDOFF.md`](./HANDOFF.md) / [`WORKLOG.md`](./WORKLOG.md) — cross-session
  state and version history, for anyone (human or agent) picking up this
  project across sessions

## License

MIT (see `LICENSE`). The default `pack-comic-chat` asset pack incorporates
Microsoft Comic Chat art under the same license, with its own attribution —
see `NOTICE` and `THIRD_PARTY.md` at the repo root, and
`packages/pack-comic-chat/NOTICE`.
