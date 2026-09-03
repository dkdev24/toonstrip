# @toonstrip/next

`@toonstrip/react`'s `<ComicStrip>` behind an App-Router-safe `'use client'` boundary,
plus `@toonstrip/next/server`'s `renderPlaceholder` for a real SSR PNG placeholder — no
layout shift on hydration, and content visible with JavaScript disabled.

Part of [toonstrip](https://github.com/dkdev24/toonstrip), a
framework-embeddable comic-strip renderer. Docs, playground, and
changelog: [toonstrip.danielkimdev.com](https://toonstrip.danielkimdev.com).

## Install

```
npm install @toonstrip/next @toonstrip/cli @toonstrip/pack-comic-chat
```

`@toonstrip/cli` must be your app's own direct dependency, not only reachable
transitively through `@toonstrip/next` — see
[`docs/next.md`](https://github.com/dkdev24/toonstrip/blob/main/docs/next.md#native-dependency)
for why, and for the `next.config.mjs` `serverExternalPackages` setting it also needs.

## Use

```tsx
// app/page.tsx — a Server Component; no "use client" needed here
import { ComicStrip } from "@toonstrip/next";
import { renderPlaceholder } from "@toonstrip/next/server";
import doc from "./my-strip.json";

export default async function Page() {
  const placeholder = await renderPlaceholder(doc, { width: 640 });
  return (
    <ComicStrip
      document={doc}
      packs={["/packs/comic-chat/"]}
      placeholder={placeholder}
    />
  );
}
```

Same props as `@toonstrip/react`'s `<ComicStrip>`. `renderPlaceholder` is a separate
`@toonstrip/next/server` entry point (not the package root) because it pulls in
`@toonstrip/cli`'s native canvas dependency — call it only from a Server Component or
other server-only code.

## Worked example

See `examples/next-app` in the
[repo](https://github.com/dkdev24/toonstrip/tree/main/examples/next-app) for a complete,
runnable App Router app. Full field reference:
[`docs/next.md`](https://github.com/dkdev24/toonstrip/blob/main/docs/next.md).

## License

MIT
