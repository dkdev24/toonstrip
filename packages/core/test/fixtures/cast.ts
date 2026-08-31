/**
 * A synthetic cast for M1 fixture tests — procedurally drawn shapes standing
 * in for real character art. M1 ports the compositing, pose-selection, and
 * layout algorithms; the actual decoded Comic Chat roster is M2's job. This
 * builder exercises the same code path (`figureFor`/`drawFigure`/pose
 * selection) a real pack would.
 */
import { createCanvas, type Image } from "@napi-rs/canvas";
import { loadImage } from "@napi-rs/canvas";
import type { PackedAvatar, CastManifest } from "../../src/cast-manifest.js";
import type { Cast } from "../../src/figure.js";

const TORSO_W = 80;
const TORSO_H = 100;
const FACE_W = 60;
const FACE_H = 60;

async function buildCharacterSheet(hue: number): Promise<{ image: Image; avatar: PackedAvatar }> {
  const canvas = createCanvas(TORSO_W * 3, TORSO_H + FACE_H);
  const ctx = canvas.getContext("2d");

  const torsoColor = `hsl(${hue}, 55%, 55%)`;
  const drawTorso = (x: number, label: string) => {
    ctx.fillStyle = torsoColor;
    ctx.fillRect(x, 0, TORSO_W, TORSO_H);
    ctx.strokeStyle = "#000";
    ctx.strokeRect(x, 0, TORSO_W, TORSO_H);
    ctx.fillStyle = "#000";
    ctx.font = "10px sans-serif";
    ctx.fillText(label, x + 4, 14);
  };
  drawTorso(0, "neutral");
  drawTorso(TORSO_W, "wave");
  drawTorso(TORSO_W * 2, "shrug");

  const faceColor = `hsl(${hue}, 70%, 80%)`;
  const drawFace = (x: number, mouth: "flat" | "smile" | "frown") => {
    const y = TORSO_H;
    ctx.fillStyle = faceColor;
    ctx.beginPath();
    ctx.arc(x + FACE_W / 2, y + FACE_H / 2, FACE_W / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.stroke();
    ctx.beginPath();
    const my = y + FACE_H * 0.65;
    if (mouth === "flat") {
      ctx.moveTo(x + 20, my);
      ctx.lineTo(x + 40, my);
    } else if (mouth === "smile") {
      ctx.arc(x + 30, my - 6, 10, 0.2 * Math.PI, 0.8 * Math.PI);
    } else {
      ctx.arc(x + 30, my + 6, 10, 1.2 * Math.PI, 1.8 * Math.PI);
    }
    ctx.stroke();
  };
  drawFace(0, "flat");
  drawFace(FACE_W, "smile");
  drawFace(FACE_W * 2, "frown");

  const buffer = canvas.toBuffer("image/png");
  const image = await loadImage(buffer);

  const avatar: PackedAvatar = {
    name: `fixture-${hue}`,
    type: "COMPLEX",
    torsoFirst: false,
    sheet: `fixture-${hue}.png`,
    sheetWidth: canvas.width,
    sheetHeight: canvas.height,
    torsos: [
      {
        kind: "torso", index: 0, emotion: "NEUTRAL", angle: 0, intensity: 0,
        cx: 40, cy: 8, cxDelta: 0, cyDelta: 0, x: 40,
        figure: { x: 0, y: 0, width: TORSO_W, height: TORSO_H }, aura: null,
      },
      {
        kind: "torso", index: 1, emotion: "WAVE", angle: 1001, intensity: 1,
        cx: 40, cy: 8, cxDelta: 0, cyDelta: 0, x: 40,
        figure: { x: TORSO_W, y: 0, width: TORSO_W, height: TORSO_H }, aura: null,
      },
      {
        kind: "torso", index: 2, emotion: "SHRUG", angle: 1005, intensity: 1,
        cx: 40, cy: 8, cxDelta: 0, cyDelta: 0, x: 40,
        figure: { x: TORSO_W * 2, y: 0, width: TORSO_W, height: TORSO_H }, aura: null,
      },
    ],
    faces: [
      {
        kind: "face", index: 0, emotion: "NEUTRAL", angle: 0, intensity: 0,
        cx: 30, cy: 55, cxDelta: 0, cyDelta: 0, x: 30,
        figure: { x: 0, y: TORSO_H, width: FACE_W, height: FACE_H }, aura: null,
      },
      {
        kind: "face", index: 1, emotion: "HAPPY", angle: 0, intensity: 1,
        cx: 30, cy: 55, cxDelta: 0, cyDelta: -2, x: 30,
        figure: { x: FACE_W, y: TORSO_H, width: FACE_W, height: FACE_H }, aura: null,
      },
      {
        kind: "face", index: 2, emotion: "SAD", angle: Math.PI, intensity: 1,
        cx: 30, cy: 55, cxDelta: 0, cyDelta: 2, x: 30,
        figure: { x: FACE_W * 2, y: TORSO_H, width: FACE_W, height: FACE_H }, aura: null,
      },
    ],
    bodies: [],
  };

  return { image, avatar };
}

/** Two characters ("alex", "sam") and one backdrop, all procedurally drawn. */
export async function buildFixtureCast(): Promise<Cast> {
  const [alex, sam] = await Promise.all([buildCharacterSheet(210), buildCharacterSheet(20)]);

  const backdropCanvas = createCanvas(315, 315);
  const bctx = backdropCanvas.getContext("2d");
  bctx.fillStyle = "#bcd9ea";
  bctx.fillRect(0, 0, 315, 315);
  bctx.fillStyle = "#7ca873";
  bctx.fillRect(0, 200, 315, 115);
  bctx.fillStyle = "#f4e04d";
  bctx.beginPath();
  bctx.arc(250, 60, 30, 0, Math.PI * 2);
  bctx.fill();
  const backdropImage = await loadImage(backdropCanvas.toBuffer("image/png"));

  const manifest: CastManifest = {
    version: 1,
    cast: { alex: alex.avatar, sam: sam.avatar },
    backdrops: [{ id: "meadow", file: "meadow.png", width: 315, height: 315 }],
  };

  return {
    manifest,
    sheets: new Map([["alex", alex.image], ["sam", sam.image]]),
    backdrops: new Map([["meadow", backdropImage]]),
  };
}
