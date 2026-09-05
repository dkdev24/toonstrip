/**
 * Sheet input (M15): one image holding many assets.
 *
 * `fixtures/source-sheets` (regenerate with `node scripts/make-sheet-fixture.mjs`)
 * imitates what a model actually returns — opaque white ground, painted
 * gutters, printed labels, a few pixels of drift per cell — so these tests
 * exercise keying, cropping, gutter snapping and registration together rather
 * than against a tidy grid.
 */
import { describe, expect, it } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validatePack } from "@toonstrip/cli";
import { analyze } from "../src/analyze.js";
import { buildPack } from "../src/build.js";
import { gridFor } from "../src/grid.js";
import { register } from "../src/register.js";
import { renderTemplate, DEFAULT_CHARACTER_CELLS } from "../src/template.js";
import type { Raster } from "../src/image.js";

const FIXTURE = join(import.meta.dirname, "..", "fixtures", "source-sheets");

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "toonstrip-sheets-"));
}

function messages(diagnostics: { message: string; file?: string }[]): string {
  return diagnostics.map((d) => `${d.file ?? ""} ${d.message}`).join("\n");
}

/**
 * Draws a labelled grid sheet on opaque white, the way a model returns one.
 * `cells` is row-major; a null cell is left blank.
 */
function sheetImage({
  columns,
  rows,
  cell = 320,
  labelBand = 0.1,
  draw,
}: {
  columns: number;
  rows: number;
  cell?: number;
  labelBand?: number;
  draw: (
    ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
    index: number,
    inner: number,
  ) => void;
}): Buffer {
  const canvas = createCanvas(columns * cell, rows * cell);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const band = cell * labelBand;
  for (let index = 0; index < columns * rows; index++) {
    ctx.save();
    ctx.translate((index % columns) * cell, Math.floor(index / columns) * cell);
    ctx.strokeStyle = "#909090";
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, cell - 3, cell - 3);
    ctx.save();
    ctx.translate(0, band);
    draw(ctx, index, cell - band);
    ctx.restore();
    ctx.restore();
  }
  return canvas.toBuffer("image/png");
}

/** A head-ish blob with a neck stub, offset by (dx, dy). */
function faceCell(
  ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
  inner: number,
  dx = 0,
  dy = 0,
): void {
  const cx = inner / 2 + dx;
  const chin = inner * 0.85 + dy;
  ctx.fillStyle = "#e8c9a8";
  ctx.beginPath();
  ctx.ellipse(cx, chin - inner * 0.32, inner * 0.32, inner * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - inner * 0.07, chin - inner * 0.04, inner * 0.14, inner * 0.08);
}

function torsoCell(
  ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
  inner: number,
): void {
  ctx.fillStyle = "#7fa7c8";
  ctx.fillRect(inner * 0.1, inner * 0.09, inner * 0.8, inner * 1.1);
}

function sourceWith(files: Record<string, Buffer | string>, meta: Record<string, unknown>): string {
  const dir = tmp();
  writeFileSync(
    join(dir, "source.json"),
    JSON.stringify({ name: "t", version: "0.1.0", license: "MIT", ...meta }),
  );
  for (const [relative, data] of Object.entries(files)) {
    const path = join(dir, relative);
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, data);
  }
  return dir;
}

describe("grid shapes are declared, never assumed", () => {
  it("derives whichever dimension was left out", () => {
    expect(gridFor(9)).toEqual({ columns: 3, rows: 3 });
    expect(gridFor(4)).toEqual({ columns: 2, rows: 2 });
    expect(gridFor(5, 3)).toEqual({ columns: 3, rows: 2 });
    expect(gridFor(10, 4)).toEqual({ columns: 4, rows: 3 });
    expect(gridFor(6, undefined, 2)).toEqual({ columns: 3, rows: 2 });
    expect(gridFor(2, 2, 1)).toEqual({ columns: 2, rows: 1 });
    expect(gridFor(20, 5)).toEqual({ columns: 5, rows: 4 });
  });

  it("slices two sheets of different shapes in one pack", async () => {
    const { source, report } = await analyze(FIXTURE);
    expect(messages(report.errors)).toBe("");
    // 2x2 interiors + 3x2 exteriors carrying five scenes, one cell to spare.
    const fromSheets = source.backdrops.filter((b) => b.origin);
    expect(fromSheets).toHaveLength(9);
    expect(fromSheets.filter((b) => b.origin!.startsWith("backdrops/interiors"))).toHaveLength(4);
    expect(fromSheets.filter((b) => b.origin!.startsWith("backdrops/exteriors"))).toHaveLength(5);
    expect(source.backdrops.map((b) => b.id)).toContain("ridge");
  });

  it("errors when the declared grid cannot hold the declared ids", async () => {
    const dir = sourceWith(
      {
        "backdrops/sheet.png": sheetImage({
          columns: 2, rows: 1,
          draw: (ctx, index, inner) => {
            ctx.fillStyle = index === 0 ? "#334455" : "#aa8866";
            ctx.fillRect(0, 0, inner, inner);
          },
        }),
        "characters/a/face-NEUTRAL.png": blobPng(),
        "characters/a/torso-NEUTRAL.png": blobPng(),
      },
      {
        backdropSheets: [{ file: "backdrops/sheet.png", ids: ["a", "b", "c"], columns: 2, rows: 1 }],
      },
    );
    const { report } = await analyze(dir);
    expect(messages(report.errors)).toContain("2 cells but 3 ids");
  });
});

function blobPng(edge = 256): Buffer {
  const canvas = createCanvas(edge, edge);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#444";
  ctx.fillRect(edge * 0.2, edge * 0.2, edge * 0.6, edge * 0.75);
  return canvas.toBuffer("image/png");
}

describe("the sheet fixture", () => {
  it("validates clean, white background and all", async () => {
    const { report } = await analyze(FIXTURE);
    expect(messages(report.errors)).toBe("");
    expect(messages(report.warnings)).toBe("");
  });

  it("keys the opaque background out of every cell", async () => {
    const { measured } = await analyze(FIXTURE);
    const parts = measured.parts.get("pim")!;
    expect(parts.length).toBeGreaterThan(0);
    for (const part of parts) {
      expect(part.stats.cornerAlpha).toBe(0);
      expect(part.stats.fullyOpaque).toBe(false);
    }
  });

  it("builds a pack the CLI validator accepts", async () => {
    const out = tmp();
    const result = await buildPack({ source: FIXTURE, out });
    expect(result.ok).toBe(true);
    expect((await validatePack(out)).errors).toEqual([]);

    const pack = JSON.parse(readFileSync(join(out, "pack.json"), "utf8"));
    expect(pack.backdrops).toHaveLength(9);
    for (const backdrop of pack.backdrops) {
      expect(backdrop.width).toBe(512);
      expect(backdrop.height).toBe(512);
    }
    const avatar = result.characters[0]!.avatar;
    expect(avatar.faces.map((f) => f.emotion).sort()).toEqual(["HAPPY", "NEUTRAL", "SAD"]);
    expect(avatar.torsos.map((t) => t.emotion).sort()).toEqual(["NEUTRAL", "WAVE"]);
  });

  it("absorbs the per-cell drift so every pose shares one join", async () => {
    // The fixture jitters HAPPY by (7,-5), SAD by (-6,4) and WAVE by (5,6).
    // Registration against the NEUTRAL cell should leave every pose's socket
    // within a pixel of NEUTRAL's; without it they would differ by the drift.
    const { characters } = await buildPack({ source: FIXTURE, out: tmp() });
    const avatar = characters[0]!.avatar;
    const neutralFace = avatar.faces.find((f) => f.emotion === "NEUTRAL")!;
    for (const face of avatar.faces) {
      expect(Math.abs(face.cx - neutralFace.cx)).toBeLessThanOrEqual(2);
      expect(Math.abs(face.cy - neutralFace.cy)).toBeLessThanOrEqual(2);
    }
    const neutralTorso = avatar.torsos.find((t) => t.emotion === "NEUTRAL")!;
    for (const torso of avatar.torsos) {
      expect(Math.abs(torso.cx - neutralTorso.cx)).toBeLessThanOrEqual(2);
      expect(Math.abs(torso.cy - neutralTorso.cy)).toBeLessThanOrEqual(2);
    }
  });

  it("records where each asset came from", async () => {
    const { source } = await analyze(FIXTURE);
    const part = source.characters[0]!.parts.find((p) => p.emotion === "HAPPY")!;
    expect(part.origin).toMatch(/sheet\.png\[1,0\]/);
    expect(source.backdrops.find((b) => b.id === "kitchen")!.origin).toMatch(/interiors\.png\[1,1\]/);
  });
});

describe("registration", () => {
  function shifted(raster: Raster, dx: number, dy: number): Raster {
    const data = new Uint8ClampedArray(raster.data.length);
    for (let y = 0; y < raster.height; y++) {
      for (let x = 0; x < raster.width; x++) {
        const sx = x - dx;
        const sy = y - dy;
        if (sx < 0 || sy < 0 || sx >= raster.width || sy >= raster.height) continue;
        const from = (sy * raster.width + sx) * 4;
        data.set(raster.data.subarray(from, from + 4), (y * raster.width + x) * 4);
      }
    }
    return { width: raster.width, height: raster.height, data };
  }

  function disc(edge: number): Raster {
    const canvas = createCanvas(edge, edge);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(edge / 2, edge / 2, edge * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(edge * 0.45, edge * 0.7, edge * 0.1, edge * 0.2);
    const { data } = ctx.getImageData(0, 0, edge, edge);
    return { width: edge, height: edge, data: data as unknown as Uint8ClampedArray };
  }

  it("recovers a known shift", () => {
    const reference = disc(128);
    for (const [dx, dy] of [[0, 0], [7, -5], [-6, 4], [11, 9]] as const) {
      const result = register(shifted(reference, dx, dy), reference);
      expect(result.dx).toBe(dx);
      expect(result.dy).toBe(dy);
      expect(result.mismatch).toBeLessThan(0.01);
    }
  });

  it("returns no shift for rasters of different sizes", () => {
    expect(register(disc(64), disc(128))).toEqual({ dx: 0, dy: 0, mismatch: 0 });
  });
});

describe("what the slicer refuses or flags", () => {
  it("errors on a blank cell an id points at", async () => {
    const dir = sourceWith(
      {
        "backdrops/sheet.png": sheetImage({
          columns: 2, rows: 1,
          draw: (ctx, index, inner) => {
            if (index === 1) return; // left blank
            ctx.fillStyle = "#334455";
            ctx.fillRect(0, 0, inner, inner);
            ctx.fillStyle = "#aa8866";
            ctx.fillRect(0, inner * 0.6, inner, inner * 0.4);
          },
        }),
        "characters/a/face-NEUTRAL.png": blobPng(),
        "characters/a/torso-NEUTRAL.png": blobPng(),
      },
      { backdropSheets: [{ file: "backdrops/sheet.png", ids: ["room", "void"], columns: 2 }] },
    );
    const { report } = await analyze(dir);
    expect(messages(report.errors)).toContain("cell is blank");
  });

  it("warns when the model repeats a scene", async () => {
    const paint = (ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>, inner: number) => {
      ctx.fillStyle = "#2f4a58";
      ctx.fillRect(0, 0, inner, inner);
      ctx.fillStyle = "#c8b47a";
      ctx.fillRect(0, inner * 0.55, inner, inner * 0.45);
      ctx.fillStyle = "#1b1b1b";
      ctx.fillRect(inner * 0.2, inner * 0.2, inner * 0.2, inner * 0.35);
    };
    const dir = sourceWith(
      {
        "backdrops/sheet.png": sheetImage({ columns: 2, rows: 1, draw: (ctx, _i, inner) => paint(ctx, inner) }),
        "characters/a/face-NEUTRAL.png": blobPng(),
        "characters/a/torso-NEUTRAL.png": blobPng(),
      },
      { backdropSheets: [{ file: "backdrops/sheet.png", ids: ["one", "two"], columns: 2 }] },
    );
    const { report } = await analyze(dir);
    expect(messages(report.warnings)).toContain("near-identical scenes");
  });

  it("errors on a grid too dense to carry the pack's cell size", async () => {
    const dir = sourceWith(
      {
        "characters/a/sheet.png": sheetImage({
          columns: 4, rows: 2, cell: 100,
          draw: (ctx, index, inner) => (index < 4 ? faceCell(ctx, inner) : torsoCell(ctx, inner)),
        }),
      },
      {
        spec: { cell: 256 },
        characters: [
          {
            id: "a",
            sheet: {
              file: "characters/a/sheet.png",
              layout: [
                ["face-NEUTRAL", "face-HAPPY", "face-SAD", "face-ANGRY"],
                ["torso-NEUTRAL", "torso-WAVE", null, null],
              ],
            },
          },
        ],
      },
    );
    const { report } = await analyze(dir);
    expect(messages(report.errors)).toContain("below the pack's 256px cell size");
  });

  it("errors on a layout cell that is not a part name", async () => {
    const dir = sourceWith(
      {
        "characters/a/sheet.png": sheetImage({
          columns: 2, rows: 1, cell: 512,
          draw: (ctx, index, inner) => (index === 0 ? faceCell(ctx, inner) : torsoCell(ctx, inner)),
        }),
      },
      {
        characters: [
          {
            id: "a",
            sheet: { file: "characters/a/sheet.png", layout: [["smiling face", "torso-NEUTRAL"]] },
          },
        ],
      },
    );
    const { report } = await analyze(dir);
    expect(messages(report.errors)).toContain(`cell name "smiling face" is not`);
  });

  it("lets an individually generated file override a sheet cell", async () => {
    const dir = sourceWith(
      {
        "characters/a/sheet.png": sheetImage({
          columns: 2, rows: 1, cell: 512,
          draw: (ctx, index, inner) => (index === 0 ? faceCell(ctx, inner) : torsoCell(ctx, inner)),
        }),
        "characters/a/face-NEUTRAL.png": blobPng(512),
      },
      {
        characters: [
          {
            id: "a",
            sheet: {
              file: "characters/a/sheet.png",
              layout: [["face-NEUTRAL", "torso-NEUTRAL"]],
            },
          },
        ],
      },
    );
    const { source, report } = await analyze(dir);
    expect(messages(report.errors)).toBe("");
    const faces = source.characters[0]!.parts.filter((p) => p.kind === "face");
    expect(faces).toHaveLength(1);
    // The file, not the cell: no sheet origin on it.
    expect(faces[0]!.origin).toBeUndefined();
  });

  it("does not mistake a sheet image for a pose or a backdrop of its own", async () => {
    const dir = sourceWith(
      {
        "characters/a/sheet.png": sheetImage({
          columns: 2, rows: 1, cell: 512,
          draw: (ctx, index, inner) => (index === 0 ? faceCell(ctx, inner) : torsoCell(ctx, inner)),
        }),
        "backdrops/scenes.png": sheetImage({
          columns: 2, rows: 1,
          draw: (ctx, index, inner) => {
            ctx.fillStyle = index === 0 ? "#334455" : "#7a5c3a";
            ctx.fillRect(0, 0, inner, inner);
            ctx.fillStyle = index === 0 ? "#c8b47a" : "#2b2b2b";
            ctx.fillRect(0, inner * 0.6, inner, inner * 0.4);
          },
        }),
      },
      {
        characters: [
          {
            id: "a",
            sheet: { file: "characters/a/sheet.png", layout: [["face-NEUTRAL", "torso-NEUTRAL"]] },
          },
        ],
        backdropSheets: [{ file: "backdrops/scenes.png", ids: ["one", "two"], columns: 2 }],
      },
    );
    const { source, report } = await analyze(dir);
    expect(messages(report.errors)).toBe("");
    expect(messages(report.warnings)).not.toContain("does not match");
    expect(source.backdrops.map((b) => b.id).sort()).toEqual(["one", "two"]);
  });
});

describe("template", () => {
  it("emits a labelled grid plus the source.json fragment for it", async () => {
    const result = await renderTemplate({ kind: "character" });
    expect(result.grid).toEqual({ columns: 5, rows: 3 });
    expect(result.layout.flat().filter(Boolean)).toEqual(DEFAULT_CHARACTER_CELLS);
    expect(result.png.subarray(1, 4).toString()).toBe("PNG");
    expect(JSON.stringify(result.declaration)).toContain("layout");
    expect(result.prompt).toContain("same size and in the same position");
  });

  it("shapes a backdrop template around the ids it is given", async () => {
    const result = await renderTemplate({ kind: "backdrop", names: ["a", "b", "c", "d", "e"], columns: 3 });
    expect(result.grid).toEqual({ columns: 3, rows: 2 });
    expect(result.layout[1]![2]).toBeNull();
    const declaration = result.declaration as { backdropSheets: { ids: string[]; columns: number }[] };
    expect(declaration.backdropSheets[0]!.ids).toEqual(["a", "b", "c", "d", "e"]);
    expect(declaration.backdropSheets[0]!.columns).toBe(3);
  });
});
