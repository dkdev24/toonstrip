// A Server Component (no "use client" here) — proves the M12 exit criterion:
// importing @toonstrip/next's client boundary and calling its server-only
// renderPlaceholder helper causes no document/window/customElements error
// during Next's server render pass.
import { ComicStrip } from "@toonstrip/next";
import { renderPlaceholder } from "@toonstrip/next/server";
import type { ComicStripDocument } from "@toonstrip/schema";

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
  const placeholder = await renderPlaceholder(DOC, { width: WIDTH });

  return (
    <main>
      <h1>toonstrip + Next.js (SSR)</h1>
      <p>
        <code>@toonstrip/next</code>&apos;s <code>&lt;ComicStrip&gt;</code>, server-rendered with a real PNG
        placeholder (<code>renderPlaceholder</code>, M13) that swaps for the live canvas on hydration. Disable
        JavaScript and reload — the strip below still shows.
      </p>
      <div style={{ maxWidth: WIDTH }}>
        <ComicStrip document={DOC} packs={["/packs/comic-chat/"]} placeholder={placeholder} />
      </div>
    </main>
  );
}
