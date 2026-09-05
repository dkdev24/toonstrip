/**
 * Generates `fixtures/source` — a spec-conforming source pack drawn with
 * plain canvas calls, so the packager has something to build in tests and in
 * the docs without shipping model-generated art.
 *
 * Two characters on purpose: `nib` leaves its join to the convention (chin =
 * bottom-centre of the face drawing), `bo` marks its join with a magenta
 * marker pixel. Between them they cover both anchor paths.
 *
 * Run: node scripts/make-fixture.mjs
 */
import { createCanvas } from "@napi-rs/canvas";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drawFace, drawTorso, write as writeFile } from "./draw.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "source");
const EDGE = 512;

function write(relative, buffer) {
  writeFile(ROOT, relative, buffer);
}

/** A head: 70% of the canvas wide, chin sitting at 88% of the canvas height. */
function face({ emotion, skin, hair, mouth, brow, marker }) {
  const c = createCanvas(EDGE, EDGE);
  const ctx = c.getContext("2d");
  const { chin, cx, ry } = drawFace(ctx, EDGE, { skin, hair, mouth, brow });

  if (marker) {
    ctx.fillStyle = "#ff00ff";
    ctx.fillRect(Math.round(cx) - 1, Math.round(chin + EDGE * 0.1 - ry * 0.12) - 1, 3, 3);
  }
  return { emotion, png: c.toBuffer("image/png") };
}

/** A torso: shoulders at 8% of the canvas height, cut off by the bottom edge. */
function torso({ emotion, shirt, arms, marker }) {
  const c = createCanvas(EDGE, EDGE);
  const ctx = c.getContext("2d");
  const { cx, neck } = drawTorso(ctx, EDGE, { shirt, arms });

  if (marker) {
    ctx.fillStyle = "#ff00ff";
    ctx.fillRect(Math.round(cx) - 1, Math.round(neck) - 1, 3, 3);
  }
  return { emotion, png: c.toBuffer("image/png") };
}

function backdrop(id, sky, ground) {
  const c = createCanvas(EDGE, EDGE);
  const ctx = c.getContext("2d");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, EDGE, EDGE);
  ctx.fillStyle = ground;
  ctx.fillRect(0, EDGE * 0.62, EDGE, EDGE * 0.38);
  ctx.strokeStyle = "#101010";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, EDGE * 0.62);
  ctx.lineTo(EDGE, EDGE * 0.62);
  ctx.stroke();
  write(`backdrops/${id}.png`, c.toBuffer("image/png"));
}

const CHARACTERS = [
  {
    id: "nib",
    name: "Nib",
    marker: false,
    skin: "#f6d7bd",
    hair: "#3b2a1e",
    shirt: "#8ec5d6",
  },
  {
    id: "bo",
    name: "Bo",
    marker: true,
    skin: "#e8bb96",
    hair: "#8c2f2f",
    shirt: "#c8b264",
  },
];

const FACES = [
  { emotion: "NEUTRAL", mouth: 0, brow: 0 },
  { emotion: "HAPPY", mouth: 40, brow: 8 },
  { emotion: "SAD", mouth: -30, brow: -10 },
  { emotion: "ANGRY", mouth: -20, brow: 26 },
];

const TORSOS = [
  { emotion: "NEUTRAL", arms: [[-1, 0], [1, 0]] },
  { emotion: "WAVE", arms: [[-1, 0], [1, 1]] },
  { emotion: "SHRUG", arms: [[-1, 0.6], [1, 0.6]] },
];

for (const character of CHARACTERS) {
  for (const spec of FACES) {
    const { png } = face({ ...spec, skin: character.skin, hair: character.hair, marker: character.marker });
    write(`characters/${character.id}/face-${spec.emotion}.png`, png);
  }
  for (const spec of TORSOS) {
    const { png } = torso({ ...spec, shirt: character.shirt, marker: character.marker });
    write(`characters/${character.id}/torso-${spec.emotion}.png`, png);
  }
}

backdrop("yard", "#cfe6f2", "#bcd9a4");

write(
  "source.json",
  `${JSON.stringify(
    {
      name: "fixture",
      version: "0.1.0",
      license: "MIT",
      description: "Generated fixture pack for @toonstrip/asset-packager tests.",
      attribution: "Drawn by scripts/make-fixture.mjs — no model involved.",
      spec: { cell: 256, backdropSize: 512, joinOverlap: 4 },
      characters: CHARACTERS.map((c) => ({
        id: c.id,
        name: c.name,
        type: "COMPLEX",
        torsoFirst: false,
      })),
      backdrops: [{ id: "yard" }],
    },
    null,
    2,
  )}\n`,
);

console.log(`wrote fixture source pack to ${ROOT}`);
