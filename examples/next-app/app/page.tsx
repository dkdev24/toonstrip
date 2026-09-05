// A Server Component (no "use client" here) — proves the M12 exit criterion:
// importing @toonstrip/react's "use client" <ComicStrip> and calling
// @toonstrip/cli's server-only renderPlaceholder causes no
// document/window/customElements error during Next's server render pass.
// (@toonstrip/next used to wrap both of these; it's deprecated — see
// docs/next.md — now that react and cli carry them directly.)
import { ComicStrip } from "@toonstrip/react";
import type { ComicStripDocument } from "@toonstrip/schema";
import type { RenderOptions } from "@toonstrip/cli";

const DOC: ComicStripDocument = {
  version: 1,
  panels: [
    {
      backdrop: "pastoral",
      camera: "establishing",
      bodies: [{ character: "dan", emotion: { angle: 0, intensity: 0.6 } }],
      speakers: [{ speaker: "caption", balloon: "caption", text: "Server-rendered in Next.js App Router." }],
    },
    {
      backdrop: "pastoral",
      camera: "medium",
      bodies: [
        { character: "dan", emotion: { angle: 0, intensity: 0.7 } },
        { character: "anna", emotion: { angle: 2.356194490192345, intensity: 0.6 } },
      ],
      speakers: [
        { speaker: "dan", balloon: "speech", text: "View source: this panel is a real PNG, no JS run yet." },
        { speaker: "anna", balloon: "speech", text: "Once hydrated, it's swapped for the live canvas." },
      ],
    },
  ],
};

const WIDTH = 640;

export default async function Page() {
  // M13: render the strip to a real PNG on the server (§8's existing
  // headless-canvas path via @toonstrip/cli), sized to the same container
  // width the client renders at, so hydration causes no layout shift.
  //
  // Dynamic + webpackIgnore, not a static import: @toonstrip/cli pulls in
  // @napi-rs/canvas, a native addon with per-platform binary builds. Static
  // resolution through a symlinked local workspace package (as here) makes
  // webpack try to bundle those .node files as JS and fail; `serverExternalPackages`
  // (see next.config.mjs) can't reliably stop that for a workspace-linked
  // import specifically, only for a real node_modules one. This is the same
  // workaround @toonstrip/next/server used to apply internally.
  const { renderPlaceholder } = (await import(/* webpackIgnore: true */ "@toonstrip/cli")) as {
    renderPlaceholder: (input: unknown, options?: RenderOptions) => Promise<{ src: string; width: number; height: number }>;
  };
  const placeholder = await renderPlaceholder(DOC, { width: WIDTH });

  return (
    <main>
      <h1>toonstrip + Next.js (SSR)</h1>
      <p>
        <code>@toonstrip/react</code>&apos;s <code>&lt;ComicStrip&gt;</code>, server-rendered with a real PNG
        placeholder (<code>renderPlaceholder</code>, M13) that swaps for the live canvas on hydration. Disable
        JavaScript and reload — the strip below still shows.
      </p>
      <div style={{ maxWidth: WIDTH }}>
        <ComicStrip document={DOC} packs={["/packs/comic-chat/"]} placeholder={placeholder} />
      </div>
    </main>
  );
}
