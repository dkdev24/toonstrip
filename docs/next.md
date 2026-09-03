# Embedding in Next.js

`@toonstrip/next` wraps [`@toonstrip/react`](./react.md) for Next.js App Router: a
`'use client'` boundary around `<ComicStrip>`, plus a server-only helper (§8's
headless-canvas render path, reused) that renders a real PNG placeholder for the server
render pass. `examples/next-app` is a full worked example — read it alongside this doc.

## Install

```
npm install @toonstrip/next @toonstrip/cli @toonstrip/pack-comic-chat
```

`@toonstrip/cli` must be your app's own direct dependency, not only reachable
transitively through `@toonstrip/next` — see "Native dependency" below for why.

Serve the pack's static files (`pack.json`, `characters/`, `backdrops/`) somewhere the
browser can fetch them — Next has no integration-hook system like Astro's, so
`examples/next-app/scripts/copy-pack-assets.mjs` copies them into
`public/packs/comic-chat/` as a `predev`/`prebuild` step (the same script
`examples/react-vite` and `examples/vue-vite` use).

## Embedding a strip

```tsx
// app/page.tsx — a Server Component; no "use client" needed here
import { ComicStrip } from "@toonstrip/next";
import doc from "./my-strip.json";

export default function Page() {
  return <ComicStrip document={doc} packs={["/packs/comic-chat/"]} />;
}
```

Same props as `@toonstrip/react`'s `<ComicStrip>` (see [`react.md`](./react.md)) — this
package re-exports it behind a `'use client'` module, the boundary React Server
Components require around anything using `useRef`/`useEffect`. You import it directly
from a Server Component; you don't mark your own page `'use client'`.

## SSR placeholder

```tsx
// app/page.tsx
import { ComicStrip } from "@toonstrip/next";
import { renderPlaceholder } from "@toonstrip/next/server";
import doc from "./my-strip.json";

export default async function Page() {
  const placeholder = await renderPlaceholder(doc, { width: 640 });
  return <ComicStrip document={doc} packs={["/packs/comic-chat/"]} placeholder={placeholder} />;
}
```

`renderPlaceholder` calls `@toonstrip/cli`'s `renderDocument` (the same function behind
`toonstrip render`, see [`cli`'s package](../packages/cli)) to produce a PNG on the
server, sized in CSS pixels to match the `width` you give it. `<ComicStrip>` renders that
as a light-DOM `<img slot="placeholder">` inside `<comic-strip>` — present in the raw
server HTML with no client JS, so it shows with JavaScript disabled and in "view source".
Once client JS hydrates and the live canvas is ready, `@toonstrip/element` hides the
placeholder and shows the live strip itself; nothing in this package drives that swap
directly.

Match the `width` you pass to `renderPlaceholder` to the CSS width your `<ComicStrip>` is
actually laid out at — a mismatch produces a placeholder sized differently than the live
strip, which shows up as a layout shift on hydration.

`renderPlaceholder` is a separate entry point (`@toonstrip/next/server`, not the package
root) because it pulls in `@toonstrip/cli`, which loads `@napi-rs/canvas` — a native Node
addon that must never end up in a client bundle. Only call it from a Server Component or
other server-only code.

## Native dependency

`@toonstrip/cli`'s native dependency needs handling in your app's own `next.config`:

```js
// next.config.mjs
export default {
  serverExternalPackages: ["@napi-rs/canvas", "@toonstrip/cli"],
};
```

Under pnpm's default strict `node_modules` layout, `@toonstrip/cli` must also be your
app's own direct dependency (not only transitively reachable through `@toonstrip/next`) —
`renderPlaceholder` loads it via a `webpackIgnore`d dynamic `import()` (a workaround for
webpack statically bundling `@napi-rs/canvas`'s per-platform binary `require()`s when the
importer is a symlinked local workspace package rather than a `node_modules` one), and
that import resolves relative to the *bundled output file's* location at request time.
See `examples/next-app`'s `next.config.mjs` and `package.json` for a working setup.

## Worked example

`examples/next-app` is the complete pattern: a Server Component page rendering a strip
with a placeholder, and the local `@toonstrip/pack-comic-chat` pack copied into `public/`
at build time. Run it locally:

```
pnpm --filter next-app-example build && pnpm --filter next-app-example start
```

## Current limitations

- Tested against Next.js 15 (App Router) and React 18. Pages Router isn't covered.
- No Nuxt-equivalent wrapper yet — see [`vue.md`](./vue.md)'s note on that.
