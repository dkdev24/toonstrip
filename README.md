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

**Site:** [toonstrip.danielkimdev.com](https://toonstrip.danielkimdev.com) — intro,
docs, playground, changelog. Source in `site/`.

## Packages

| Package | What it is |
|---|---|
| `packages/schema` | The `ComicStripDocument` v1 types, JSON Schema, and a runtime validator |
| `packages/core` | The framework-agnostic rendering engine (figures, balloons, backdrops, layout) |
| `packages/element` | `<comic-strip>`, a zero-framework-deps custom element wrapping `core` |
| `packages/astro` | An Astro integration + `<ComicStrip>` component wrapping `element` |
| `packages/react` | A `<ComicStrip>` React component wrapping `element` |
| `packages/vue` | A `<ComicStrip>` Vue component wrapping `element` |
| `packages/next` | `react`'s `<ComicStrip>` behind an App-Router-safe `'use client'` boundary, plus an SSR-placeholder helper (`@toonstrip/next/server`) built on `cli` |
| `packages/pack-comic-chat` | The default asset pack: the original 15-character Comic Chat roster + 3 backdrops (MIT, see its `NOTICE`) |
| `packages/pack-example` | A second, small, wholly original pack proving the pack contract isn't coupled to `pack-comic-chat` |
| `packages/cli` | The `toonstrip` CLI (`pack validate`, `render` to PNG) |
| `packages/asset-packager` | The `toonstrip-pack` CLI: turns per-pose PNGs *or* grid sheets into a valid pack (validate, slice, register, sheet-pack, derive join anchors). No model, no network |
| `examples/astro-blog` | A minimal Astro site embedding a live strip in a blog post |
| `examples/react-vite` | A minimal Vite + React app embedding a live strip, prop-updated without a remount |
| `examples/vue-vite` | A minimal Vite + Vue app embedding a live strip, prop-updated without a remount |
| `examples/next-app` | A minimal Next.js App Router app: server-rendered PNG placeholder swapped for the live canvas on hydration |
| `examples/vanilla-html` | A single `.html` file embedding a live strip with no build step — CDN imports, no `package.json` |
| `skills/toonstrip` | An agent skill teaching an AI coding agent to author and validate a `ComicStripDocument`, and to build an asset pack from generated art |
| `site` | toonstrip.danielkimdev.com (Astro; deployed by Cloudflare Pages on push) |

Dependency direction is one-way: `schema → core → element → astro`, and
`element → react → next` and `element → vue` alongside it (`next` also
depends on `cli` for its SSR placeholder). Asset packs depend on `schema`
only.

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
- [`docs/asset-image-spec.md`](./docs/asset-image-spec.md) — the rules a
  character/backdrop PNG must follow to be packed by
  [`@toonstrip/asset-packager`](./packages/asset-packager) into a pack
- [`docs/asset-sheets.md`](./docs/asset-sheets.md) — sheet input: one generated
  image holding a grid of poses or scenes, sliced into many pack assets
- [`docs/astro.md`](./docs/astro.md) — embedding a strip in Astro
- [`docs/react.md`](./docs/react.md) — embedding a strip with `@toonstrip/react`
- [`docs/vue.md`](./docs/vue.md) — embedding a strip with `@toonstrip/vue`
- [`docs/next.md`](./docs/next.md) — embedding a strip with `@toonstrip/next`,
  including the SSR placeholder
- [`docs/vanilla-html.md`](./docs/vanilla-html.md) — embedding a strip with
  no build step at all (plain HTML, CDN imports)
- [`TOONSTRIP_DEV_PLAN.md`](./TOONSTRIP_DEV_PLAN.md) — the full project plan
- [`SITE_DEV_PLAN.md`](./SITE_DEV_PLAN.md) / [`DESIGN.md`](./DESIGN.md) — the M7
  plan and UI/UX guide for the public site, toonstrip.danielkimdev.com
- [`HANDOFF.md`](./HANDOFF.md) / [`WORKLOG.md`](./WORKLOG.md) — cross-session
  state and version history, for anyone (human or agent) picking up this
  project across sessions

## License

MIT (see `LICENSE`). The default `pack-comic-chat` asset pack incorporates
Microsoft Comic Chat art under the same license, with its own attribution —
see `NOTICE` and `THIRD_PARTY.md` at the repo root, and
`packages/pack-comic-chat/NOTICE`.
