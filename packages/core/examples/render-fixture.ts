/**
 * Standalone Node caller: renders a fixture 3-panel document to PNG using
 * only the built surface of @toonstrip/core (no web component exists yet —
 * this script is M1's "the only caller").
 *
 * Run after building the workspace:
 *   pnpm build
 *   node --experimental-strip-types packages/core/examples/render-fixture.ts
 */
import { createCanvas, loadImage, type Image } from "@napi-rs/canvas";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Panel } from "../../schema/dist/index.js";
import {
  layoutStrip, renderPanel,
  type Cast, type CastManifest, type PackedAvatar,
} from "../dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));

async function buildCharacter(hue: number): Promise<{ image: Image; avatar: PackedAvatar }> {
  const canvas = createCanvas(240, 160);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = `hsl(${hue}, 55%, 55%)`;
  ctx.fillRect(0, 0, 80, 100);
  ctx.fillStyle = `hsl(${hue}, 70%, 80%)`;
  ctx.beginPath();
  ctx.arc(30, 130, 28, 0, Math.PI * 2);
  ctx.fill();
  const image = await loadImage(canvas.toBuffer("image/png"));
  const avatar: PackedAvatar = {
    name: `fixture-${hue}`, type: "COMPLEX", torsoFirst: false,
    sheet: `fixture-${hue}.png`, sheetWidth: canvas.width, sheetHeight: canvas.height,
    torsos: [{
      kind: "torso", index: 0, emotion: "NEUTRAL", angle: 0, intensity: 0,
      cx: 40, cy: 8, cxDelta: 0, cyDelta: 0, x: 40,
      figure: { x: 0, y: 0, width: 80, height: 100 }, aura: null,
    }],
    faces: [{
      kind: "face", index: 0, emotion: "NEUTRAL", angle: 0, intensity: 0,
      cx: 30, cy: 55, cxDelta: 0, cyDelta: 0, x: 30,
      figure: { x: 0, y: 100, width: 60, height: 60 }, aura: null,
    }],
    bodies: [],
  };
  return { image, avatar };
}

async function buildCast(): Promise<Cast> {
  const { image, avatar } = await buildCharacter(150);
  const manifest: CastManifest = {
    version: 1,
    cast: { narrator: avatar },
    backdrops: [],
  };
  return { manifest, sheets: new Map([["narrator", image]]), backdrops: new Map() };
}

const panels: Panel[] = [
  {
    backdrop: "none",
    camera: "medium",
    bodies: [{ character: "narrator", emotion: { angle: 0, intensity: 0.5 } }],
    speakers: [{ speaker: "narrator", balloon: "speech", text: "Rendered from a Node script." }],
  },
  {
    backdrop: "none",
    camera: "close-up",
    bodies: [{ character: "narrator", emotion: { angle: 0, intensity: 1 } }],
    speakers: [{ speaker: "caption", balloon: "caption", text: "No web component yet." }],
  },
  {
    backdrop: "none",
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
