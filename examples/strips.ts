import type { ComicStripDocument } from "@toonstrip/schema";

// Two documents to toggle between (App component), so the same <ComicStrip>
// updates on a document prop change rather than remounting — the M10 (react-vite)
// / M11 (vue-vite) exit criterion from TOONSTRIP_DEV_PLAN.md's milestone table.
export function makeStrips(framework: "React" | "Vue"): Record<"intro" | "punchline", ComicStripDocument> {
  return {
    intro: {
      version: 1,
      panels: [
        {
          backdrop: "pastoral",
          camera: "establishing",
          bodies: [{ character: "dan", emotion: { angle: 0, intensity: 0.6 } }],
          speakers: [{ speaker: "caption", balloon: "caption", text: `A Vite + ${framework} app, no Astro in sight.` }],
        },
        {
          backdrop: "pastoral",
          camera: "medium",
          bodies: [
            { character: "dan", emotion: { angle: 0, intensity: 0.7 } },
            { character: "anna", emotion: { angle: 2.356194490192345, intensity: 0.6 } },
          ],
          speakers: [
            { speaker: "dan", balloon: "speech", text: `Just @toonstrip/${framework.toLowerCase()} and a document prop.` },
            { speaker: "anna", balloon: "speech", text: "Click the button — same strip updates in place." },
          ],
        },
      ],
    },
    punchline: {
      version: 1,
      panels: [
        {
          backdrop: "room8bs",
          camera: "close-up",
          bodies: [{ character: "anna", emotion: { angle: 5.497787143782138, intensity: 0.9 } }],
          speakers: [{ speaker: "anna", balloon: "speech", text: "See? No remount — check the elements panel." }],
        },
      ],
    },
  };
}
