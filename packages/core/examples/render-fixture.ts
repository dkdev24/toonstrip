/**
 * Standalone Node caller: renders a 3-panel document to PNG using the real
 * `@toonstrip/pack-comic-chat` default pack (M2) and only the built surface
 * of `@toonstrip/core` (no web component exists yet — this script is the
 * milestone's "only caller").
 *
 * Run after building the workspace:
 *   pnpm build
 *   node --experimental-strip-types packages/core/examples/render-fixture.ts
 */
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Panel } from "../../schema/dist/index.js";
import { loadCastManifest } from "../../pack-comic-chat/dist/index.js";
import { layoutStrip, renderPanel, type Cast } from "../dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));

async function buildCast(): Promise<Cast> {
  const manifest = loadCastManifest();
  const dan = manifest.cast.dan;
  const tiki = manifest.cast.tiki;
  const pastoral = manifest.backdrops.find((b) => b.id === "pastoral")!;

  const sheets = new Map([
    ["dan", await loadImage(dan.sheet)],
    ["tiki", await loadImage(tiki.sheet)],
  ]);
  const backdrops = new Map([["pastoral", await loadImage(pastoral.file)]]);

  return {
    manifest: { version: 1, cast: { dan, tiki }, backdrops: [pastoral] },
    sheets,
    backdrops,
  };
}

const panels: Panel[] = [
  {
    backdrop: "pastoral",
    camera: "medium",
    bodies: [{ character: "dan", emotion: { angle: 0, intensity: 0.5 } }],
    speakers: [{ speaker: "dan", balloon: "speech", text: "Rendered from a Node script." }],
  },
  {
    backdrop: "pastoral",
    camera: "close-up",
    bodies: [{ character: "tiki", emotion: { angle: 0, intensity: 1 } }],
    speakers: [{ speaker: "caption", balloon: "caption", text: "No web component yet." }],
  },
  {
    backdrop: "pastoral",
    camera: "wide",
    dark: true,
    bodies: [],
    speakers: [{ speaker: "caption", balloon: "caption", text: "This panel is dark." }],
  },
];

const cast = await buildCast();
const { panelWidth, panelHeight } = layoutStrip(900);
const outDir = join(here, "output");
mkdirSync(outDir, { recursive: true });

for (const [i, panel] of panels.entries()) {
  const canvas = createCanvas(panelWidth, panelHeight);
  const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
  renderPanel(ctx, panel, cast, panelWidth, panelHeight);
  const path = join(outDir, `panel-${i}.png`);
  writeFileSync(path, canvas.toBuffer("image/png"));
  console.log(`wrote ${path}`);
}
