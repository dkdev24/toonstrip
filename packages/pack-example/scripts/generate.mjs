#!/usr/bin/env node
// Generates this pack's art from scratch — no AI image generation, no
// Comic-Chat-derived source material (per the project's own non-goals and
// §12's attribution scope, which covers only the default pack). Simple
// procedurally-drawn shapes, in the same spirit as packages/core's M1
// fixture cast (test/fixtures/cast.ts) — just persisted as a real pack
// instead of an in-memory test double, to prove the pack contract isn't
// secretly coupled to pack-comic-chat's decoded-.avb origin.
import { createCanvas } from "@napi-rs/canvas";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHAR_DIR = join(ROOT, "characters", "pip");
const BACKDROP_DIR = join(ROOT, "backdrops");
mkdirSync(CHAR_DIR, { recursive: true });
mkdirSync(BACKDROP_DIR, { recursive: true });

const TORSO_W = 80;
const TORSO_H = 90;
const FACE_W = 70;
const FACE_H = 70;
const SHEET_W = TORSO_W * 3;
const SHEET_H = TORSO_H + FACE_H;

const canvas = createCanvas(SHEET_W, SHEET_H);
const ctx = canvas.getContext("2d");

function drawTorso(x, mode) {
  ctx.fillStyle = "#5b8def";
  ctx.beginPath();
  ctx.roundRect(x + 10, 10, TORSO_W - 20, TORSO_H - 20, 14);
  ctx.fill();
  ctx.strokeStyle = "#1b3a7a";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.strokeStyle = "#1b3a7a";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  const shoulderY = 24;
  if (mode === "wave") {
    ctx.beginPath();
    ctx.moveTo(x + 14, shoulderY);
    ctx.lineTo(x - 4, shoulderY - 22);
    ctx.stroke();
  } else if (mode === "shrug") {
    ctx.beginPath();
    ctx.moveTo(x + 12, shoulderY);
    ctx.lineTo(x, shoulderY - 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + TORSO_W - 12, shoulderY);
    ctx.lineTo(x + TORSO_W, shoulderY - 10);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x + 14, shoulderY);
    ctx.lineTo(x + 6, TORSO_H - 16);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + TORSO_W - 14, shoulderY);
    ctx.lineTo(x + TORSO_W - 6, TORSO_H - 16);
    ctx.stroke();
  }
}

function drawFace(x, mood) {
  const y = TORSO_H;
  const cx = x + FACE_W / 2;
  const cy = y + FACE_H / 2;
  ctx.fillStyle = "#ffd9a0";
  ctx.beginPath();
  ctx.arc(cx, cy, FACE_W / 2 - 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a4a1b";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#2a2a2a";
  ctx.beginPath();
  ctx.arc(cx - 12, cy - 6, 4, 0, Math.PI * 2);
  ctx.arc(cx + 12, cy - 6, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#7a4a1b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (mood === "happy") {
    ctx.arc(cx, cy + 6, 14, 0.15 * Math.PI, 0.85 * Math.PI);
  } else {
    ctx.moveTo(cx - 12, cy + 14);
    ctx.lineTo(cx + 12, cy + 14);
  }
  ctx.stroke();
}

drawTorso(0, "neutral");
drawTorso(TORSO_W, "wave");
drawTorso(TORSO_W * 2, "shrug");
drawFace(0, "neutral");
drawFace(FACE_W, "happy");

writeFileSync(join(CHAR_DIR, "sheet.png"), canvas.toBuffer("image/png"));

const rect = (x, y, width, height) => ({ x, y, width, height });

const avatar = {
  name: "Pip",
  type: "COMPLEX",
  torsoFirst: false,
  sheet: "sheet.png",
  sheetWidth: SHEET_W,
  sheetHeight: SHEET_H,
  torsos: [
    {
      kind: "torso", index: 0, emotion: "NEUTRAL", angle: 0, intensity: 0,
      cx: 40, cy: 8, cxDelta: 0, cyDelta: 0, x: 40,
      figure: rect(0, 0, TORSO_W, TORSO_H), aura: null,
    },
    {
      kind: "torso", index: 1, emotion: "WAVE", angle: 1001, intensity: 1,
      cx: 40, cy: 8, cxDelta: 0, cyDelta: 0, x: 40,
      figure: rect(TORSO_W, 0, TORSO_W, TORSO_H), aura: null,
    },
    {
      kind: "torso", index: 2, emotion: "SHRUG", angle: 1005, intensity: 1,
      cx: 40, cy: 8, cxDelta: 0, cyDelta: 0, x: 40,
      figure: rect(TORSO_W * 2, 0, TORSO_W, TORSO_H), aura: null,
    },
  ],
  faces: [
    {
      kind: "face", index: 0, emotion: "NEUTRAL", angle: 0, intensity: 0,
      cx: 35, cy: 40, cxDelta: 0, cyDelta: 0, x: 35,
      figure: rect(0, TORSO_H, FACE_W, FACE_H), aura: null,
    },
    {
      kind: "face", index: 1, emotion: "HAPPY", angle: 0, intensity: 1,
      cx: 35, cy: 40, cxDelta: 0, cyDelta: -2, x: 35,
      figure: rect(FACE_W, TORSO_H, FACE_W, FACE_H), aura: null,
    },
  ],
  bodies: [],
};

writeFileSync(join(CHAR_DIR, "pip.json"), JSON.stringify(avatar, null, 2) + "\n");

// A small original backdrop: a two-tone meadow, not a Comic-Chat conversion.
const BACKDROP_SIZE = 240;
const bg = createCanvas(BACKDROP_SIZE, BACKDROP_SIZE);
const bctx = bg.getContext("2d");
const sky = bctx.createLinearGradient(0, 0, 0, BACKDROP_SIZE);
sky.addColorStop(0, "#bfe3ff");
sky.addColorStop(1, "#eaf7ff");
bctx.fillStyle = sky;
bctx.fillRect(0, 0, BACKDROP_SIZE, BACKDROP_SIZE * 0.62);
bctx.fillStyle = "#fff6b0";
bctx.beginPath();
bctx.arc(BACKDROP_SIZE * 0.78, BACKDROP_SIZE * 0.2, 24, 0, Math.PI * 2);
bctx.fill();
bctx.fillStyle = "#7bc47f";
bctx.fillRect(0, BACKDROP_SIZE * 0.62, BACKDROP_SIZE, BACKDROP_SIZE * 0.38);
bctx.fillStyle = "#5da862";
for (let i = 0; i < 6; i++) {
  bctx.beginPath();
  bctx.arc(20 + i * 40, BACKDROP_SIZE * 0.62 + 6, 10, Math.PI, 0);
  bctx.fill();
}
writeFileSync(join(BACKDROP_DIR, "meadow.png"), bg.toBuffer("image/png"));

const packJson = {
  name: "example",
  version: "0.1.0",
  license: "MIT",
  characters: [
    { id: "pip", name: "Pip", manifest: "characters/pip/pip.json", sheet: "characters/pip/sheet.png" },
  ],
  backdrops: [
    { id: "meadow", file: "backdrops/meadow.png", width: BACKDROP_SIZE, height: BACKDROP_SIZE },
  ],
};
writeFileSync(join(ROOT, "pack.json"), JSON.stringify(packJson, null, 2) + "\n");

console.log("generated packages/pack-example: characters/pip, backdrops/meadow, pack.json");
