/**
 * Generates `fixtures/source-sheets` — a source pack whose art arrives as
 * sheets rather than one file per pose, drawn with plain canvas calls (no
 * model involved).
 *
 * It deliberately imitates what a model actually returns, so the slicer is
 * tested against the real failure surface rather than a tidy grid:
 *
 * - **opaque white background**, because most image models cannot emit
 *   transparency (the packager keys it out),
 * - **painted gutter strokes and label bands**, which the inset and label-band
 *   crops have to remove,
 * - **per-cell jitter**, so registration against the NEUTRAL cell has real
 *   work to do,
 * - **two backdrop sheets of different shapes** (2x2, and 3x2 carrying five
 *   scenes with one cell left over), because a grid is declared per sheet and
 *   nothing may assume 3x3.
 *
 * Run: node scripts/make-sheet-fixture.mjs
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  drawFace as drawFaceShared,
  drawTorso as drawTorsoShared,
  sheet as sharedSheet,
  write as writeFile,
} from "./draw.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "source-sheets");
const CELL = 512;
const LABEL_BAND = 0.1;

function write(relative, buffer) {
  writeFile(ROOT, relative, buffer);
}

function drawFace(ctx, edge, { skin, hair, mouth, brow }) {
  drawFaceShared(ctx, edge, {
    skin,
    hair,
    mouth,
    brow,
    lineWidth: 5,
    lineJoin: "miter",
    chinRatio: 0.86,
    rxRatio: 0.33,
    ryRatio: 0.34,
    eyeRx: 11,
    eyeRy: 13,
    neckHeightRatio: 0.09,
  });
}

function drawTorso(ctx, edge, { shirt, arms }) {
  drawTorsoShared(ctx, edge, {
    shirt,
    arms,
    outlineLineWidth: 5,
    outlineLineJoin: "miter",
    armLineWidth: 20,
    neckRatio: 0.09,
    halfWidthRatio: 0.4,
    shoulderDropRatio: 0.26,
    bottomRatio: 1.05,
    liftRatio: 0.32,
  });
}

function drawScene(ctx, edge, { sky, ground, feature, featureColor, horizon = 0.62 }, width = edge) {
  // Full bleed: a scene fills its cell, which is what the spec asks of a
  // backdrop cell (the packager centre-crops it to a square).
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, edge);
  ctx.fillStyle = ground;
  ctx.fillRect(0, edge * horizon, width, edge * (1 - horizon));
  ctx.strokeStyle = "#101010";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, edge * horizon);
  ctx.lineTo(width, edge * horizon);
  ctx.stroke();

  // Something different per scene, so no two cells hash alike.
  ctx.fillStyle = featureColor;
  if (feature === "tower") ctx.fillRect(width * 0.12, edge * 0.2, width * 0.14, edge * 0.42);
  else if (feature === "hill") {
    ctx.beginPath();
    ctx.ellipse(width * 0.7, edge * horizon, width * 0.28, edge * 0.16, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  } else if (feature === "door") {
    ctx.fillRect(width * 0.4, edge * 0.3, width * 0.2, edge * 0.32);
  } else if (feature === "bars") {
    for (let i = 0; i < 5; i++) ctx.fillRect(width * (0.13 + i * 0.16), edge * 0.18, width * 0.05, edge * 0.44);
  } else if (feature === "arch") {
    ctx.beginPath();
    ctx.arc(width * 0.5, edge * horizon, width * 0.24, Math.PI, Math.PI * 2);
    ctx.fill();
  }
}

const sheet = (options) => sharedSheet({ cell: CELL, labelBand: LABEL_BAND, ...options });

const CHARACTER = { skin: "#f2d3b6", hair: "#2f2a45", shirt: "#7fa7c8" };

const FACE_POSES = {
  "face-NEUTRAL": { mouth: 0, brow: 0 },
  "face-HAPPY": { mouth: 38, brow: 8 },
  "face-SAD": { mouth: -28, brow: -10 },
};
const TORSO_POSES = {
  "torso-NEUTRAL": { arms: [[-1, 0], [1, 0]] },
  "torso-WAVE": { arms: [[-1, 0], [1, 1]] },
};

// A few pixels of drift per cell — what a model does, and what registration
// against the NEUTRAL cell is there to undo.
const JITTER = { "face-HAPPY": [7, -5], "face-SAD": [-6, 4], "torso-WAVE": [5, 6] };

write(
  "characters/pim/sheet.png",
  sheet({
    columns: 3,
    rows: 2,
    names: ["face-NEUTRAL", "face-HAPPY", "face-SAD", "torso-NEUTRAL", "torso-WAVE", null],
    jitter: (_index, name) => JITTER[name] ?? [0, 0],
    draw: (ctx, _index, inner, name) => {
      if (name.startsWith("face")) drawFace(ctx, inner, { ...CHARACTER, ...FACE_POSES[name] });
      else drawTorso(ctx, inner, { ...CHARACTER, ...TORSO_POSES[name] });
    },
  }),
);

const INTERIORS = [
  { id: "hall", sky: "#efe6d2", ground: "#5c4326", feature: "door", featureColor: "#241608", horizon: 0.7 },
  { id: "cellar", sky: "#3c4148", ground: "#8d9199", feature: "bars", featureColor: "#e8ecf2", horizon: 0.45 },
  { id: "attic", sky: "#f7efe0", ground: "#9c7a4a", feature: "tower", featureColor: "#3a2a12", horizon: 0.8 },
  { id: "kitchen", sky: "#dceee0", ground: "#2f5540", feature: "arch", featureColor: "#e6f2ea", horizon: 0.55 },
];

const EXTERIORS = [
  { id: "yard", sky: "#cfe6f2", ground: "#4f7a34", feature: "hill", featureColor: "#d8ecc4", horizon: 0.66 },
  { id: "lane", sky: "#f4ecd8", ground: "#6b6046", feature: "tower", featureColor: "#1f1a10", horizon: 0.5 },
  { id: "dock", sky: "#2f4a58", ground: "#8fb0bd", feature: "bars", featureColor: "#f0f6fa", horizon: 0.75 },
  { id: "market", sky: "#f7dcb0", ground: "#8a5a2a", feature: "arch", featureColor: "#2c1a08", horizon: 0.4 },
  { id: "ridge", sky: "#c2d8e8", ground: "#39502c", feature: "door", featureColor: "#e2eed8", horizon: 0.6 },
];

const sceneSheet = (scenes, columns) =>
  sheet({
    columns,
    rows: Math.ceil(scenes.length / columns),
    names: scenes.map((s) => s.id),
    draw: (ctx, _index, inner, name, cell) => drawScene(ctx, inner, scenes.find((s) => s.id === name), cell),
  });

write("backdrops/interiors.png", sceneSheet(INTERIORS, 2));
write("backdrops/exteriors.png", sceneSheet(EXTERIORS, 3));

write(
  "source.json",
  `${JSON.stringify(
    {
      name: "fixture-sheets",
      version: "0.1.0",
      license: "MIT",
      description: "Generated sheet-input fixture pack for @toonstrip/asset-packager tests.",
      attribution: "Drawn by scripts/make-sheet-fixture.mjs — no model involved.",
      spec: { cell: 256, backdropSize: 512, joinOverlap: 4 },
      characters: [
        {
          id: "pim",
          name: "Pim",
          type: "COMPLEX",
          torsoFirst: false,
          sheet: {
            file: "characters/pim/sheet.png",
            layout: [
              ["face-NEUTRAL", "face-HAPPY", "face-SAD"],
              ["torso-NEUTRAL", "torso-WAVE", null],
            ],
            labelBand: 0.1,
            keyBackground: true,
          },
        },
      ],
      backdropSheets: [
        { file: "backdrops/interiors.png", ids: INTERIORS.map((s) => s.id), columns: 2, labelBand: 0.1 },
        { file: "backdrops/exteriors.png", ids: EXTERIORS.map((s) => s.id), columns: 3, labelBand: 0.1 },
      ],
    },
    null,
    2,
  )}\n`,
);

console.log(`wrote sheet fixture source pack to ${ROOT}`);
