/**
 * Server-only SSR placeholder helper (dev plan §13.4). Reuses §8's existing
 * headless-canvas render path (`packages/cli`, already published) to produce
 * a real PNG of the strip at request/build time, ready to hand to
 * `<ComicStrip placeholder>` as the light-DOM image it shows until client JS
 * hydrates and paints the live canvas.
 *
 * A separate entry point ("@toonstrip/next/server", not the package root):
 * `@toonstrip/cli` pulls in `@napi-rs/canvas`, a native Node addon that must
 * never end up in a client bundle. Only import this from a Server Component
 * or other server-only code.
 *
 * `@toonstrip/cli` is imported dynamically with `webpackIgnore` rather than
 * statically: Next's `serverExternalPackages` opt-out is meant to stop it
 * being bundled, but a workspace package reached through a symlinked,
 * non-`node_modules` local package (`@toonstrip/cli`, here) doesn't reliably
 * hit that path, and webpack then tries to statically bundle
 * `@napi-rs/canvas`'s platform-detection `require()`s for every OS/arch and
 * fails on the binary `.node` files. `webpackIgnore` leaves this import
 * completely alone, so Node resolves and loads it normally at request time —
 * from the *bundled output file's* location, though, so the consuming app
 * must list `@toonstrip/cli` as its own direct dependency (not only reachable
 * transitively through `@toonstrip/next`) for that resolution to succeed
 * under pnpm's default strict `node_modules` layout.
 */
import type { ComicStripPlaceholder } from "@toonstrip/react";
import type { ComicStripDocument } from "@toonstrip/schema";
import type { RenderOptions } from "@toonstrip/cli";

export async function renderPlaceholder(doc: ComicStripDocument, options: RenderOptions = {}): Promise<ComicStripPlaceholder> {
  const { renderDocument } = await import(/* webpackIgnore: true */ "@toonstrip/cli");
  const { png, cssWidth, cssHeight } = await renderDocument(doc, options);
  // The <img>'s width/height are CSS pixels (RenderResult.cssWidth/cssHeight),
  // not the (possibly `scale`d-up) PNG's own pixel size — an `<img>` displays
  // at its width/height attributes regardless of the file's actual pixel
  // density, so using the PNG's raw pixel size here would render it 2x too
  // large (the default `scale`) and shift layout on hydration.
  return { src: `data:image/png;base64,${png.toString("base64")}`, width: cssWidth, height: cssHeight };
}
