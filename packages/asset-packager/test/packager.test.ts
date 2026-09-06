/**
 * The packager's contract, exercised against `fixtures/source` (regenerate it
 * with `node scripts/make-fixture.mjs`) plus small purpose-built bad inputs.
 *
 * The load-bearing test is `builds a pack the CLI validator accepts`: the
 * packager's whole reason to exist is that its output is a pack, and
 * `@toonstrip/cli`'s validator is the same gate a contributor's hand-authored
 * pack goes through.
 */
import { describe, expect, it } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validatePack } from "@toonstrip/cli";
import { analyze } from "../src/analyze.js";
import { buildPack } from "../src/build.js";
import { packCharacter } from "../src/pack.js";
import { parsePartName } from "../src/spec.js";

const FIXTURE = join(import.meta.dirname, "..", "fixtures", "source");

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "toonstrip-packager-"));
}

/** A square PNG with one filled blob, optionally on an opaque background. */
function blob({
  edge = 256,
  box = { x: 40, y: 40, width: 176, height: 176 },
  background,
}: {
  edge?: number;
  box?: { x: number; y: number; width: number; height: number };
  background?: string;
} = {}): Buffer {
  const canvas = createCanvas(edge, edge);
  const ctx = canvas.getContext("2d");
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, edge, edge);
  }
  ctx.fillStyle = "#333";
  ctx.fillRect(box.x, box.y, box.width, box.height);
  return canvas.toBuffer("image/png");
}

interface SourceFiles {
  [relative: string]: Buffer | string;
}

function sourceDir(files: SourceFiles, meta: Record<string, unknown> = {}): string {
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

function messages(diagnostics: { message: string; file?: string }[]): string {
  return diagnostics.map((d) => `${d.file ?? ""} ${d.message}`).join("\n");
}

describe("filename parsing", () => {
  it("reads kind, emotion, intensity and variant", () => {
    expect(parsePartName("face-NEUTRAL.png")).toEqual({
      kind: "face", emotion: "NEUTRAL", intensity: 0, variant: 1,
    });
    expect(parsePartName("torso-WAVE@0.5-2.png")).toEqual({
      kind: "torso", emotion: "WAVE", intensity: 0.5, variant: 2,
    });
    expect(parsePartName("face-HAPPY.png")?.intensity).toBe(1);
    expect(parsePartName("Face-Happy.png")).toBeNull();
    expect(parsePartName("notes.txt")).toBeNull();
  });
});

describe("the fixture source pack", () => {
  it("validates with no errors", async () => {
    const { report } = await analyze(FIXTURE);
    expect(messages(report.errors)).toBe("");
    expect(report.ok).toBe(true);
  });

  it("builds a pack the CLI validator accepts", async () => {
    const out = tmp();
    const result = await buildPack({ source: FIXTURE, out });
    expect(result.ok).toBe(true);
    expect(result.files).toContain("pack.json");
    expect(result.files).toContain("characters/nib/nib.json");
    expect(result.files).toContain("characters/nib/sheet.png");
    expect(result.files).toContain("backdrops/yard.png");

    const validated = await validatePack(out);
    expect(validated.errors).toEqual([]);
    expect(validated.ok).toBe(true);
  });

  it("derives the join from the convention, or from a marker when one is drawn", async () => {
    const out = tmp();
    const { characters } = await buildPack({ source: FIXTURE, out });
    const byId = new Map(characters.map((c) => [c.id, c]));
    expect(byId.get("nib")!.joins.face?.origin).toBe("convention");
    expect(byId.get("bo")!.joins.torso?.origin).toBe("marker");

    // Both routes must land on nearly the same point: the fixture draws its
    // marker at the same place the convention infers.
    const nib = byId.get("nib")!.joins.torso!;
    const bo = byId.get("bo")!.joins.torso!;
    expect(Math.abs(nib.x - bo.x)).toBeLessThan(2);
    expect(Math.abs(nib.y - bo.y)).toBeLessThan(2);
  });

  it("erases marker pixels from the packed sheet", async () => {
    const out = tmp();
    await buildPack({ source: FIXTURE, out });
    const { loadImage, createCanvas: make } = await import("@napi-rs/canvas");
    const sheet = await loadImage(join(out, "characters", "bo", "sheet.png"));
    const canvas = make(sheet.width, sheet.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(sheet, 0, 0);
    const { data } = ctx.getImageData(0, 0, sheet.width, sheet.height);
    let magenta = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3]! > 200 && data[i]! > 240 && data[i + 1]! < 20 && data[i + 2]! > 240) magenta++;
    }
    expect(magenta).toBe(0);
  });

  it("applies the head-into-collar overlap to the torso's socket, and only there", async () => {
    // The fixture sets joinOverlap: 4; packing the same parts with 0 isolates
    // its effect. A bigger overlap must move the torso socket down (which
    // sinks the head into the collar) and leave the face untouched.
    const { source, measured } = await analyze(FIXTURE);
    const character = source.characters[0]!;
    const parts = measured.parts.get(character.id)!;
    const sunk = await packCharacter(character, parts, source.spec);
    const flush = await packCharacter(character, parts, { ...source.spec, joinOverlap: 0 });
    expect(sunk.avatar.torsos[0]!.cy - flush.avatar.torsos[0]!.cy).toBe(4);
    expect(sunk.avatar.faces[0]!.cy).toBe(flush.avatar.faces[0]!.cy);
  });

  it("resamples a face by faceScale, anchored on its own join point, torso untouched", async () => {
    // A face never scales differently from its torso at render time
    // (`@toonstrip/core`'s figure.ts) — proportion is authored here, once,
    // baked into the packed sheet's own pixels.
    const { source, measured } = await analyze(FIXTURE);
    const character = source.characters[0]!;
    const parts = measured.parts.get(character.id)!;
    const full = await packCharacter(character, parts, { ...source.spec, faceScale: 1 });
    const half = await packCharacter(character, parts, { ...source.spec, faceScale: 0.5 });

    const fullFace = full.avatar.faces[0]!;
    const halfFace = half.avatar.faces[0]!;
    const near = (actual: number, expected: number) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1);
    near(halfFace.figure.width, fullFace.figure.width * 0.5);
    near(halfFace.figure.height, fullFace.figure.height * 0.5);

    // The join point is invariant under the scale: the face's own chin
    // (its own cx/cy, the offset from its box to the join) scales the same way.
    near(halfFace.cx, fullFace.cx * 0.5);
    near(halfFace.cy, fullFace.cy * 0.5);

    expect(half.avatar.torsos[0]!.figure).toEqual(full.avatar.torsos[0]!.figure);
    expect(half.avatar.torsos[0]!.cx).toBe(full.avatar.torsos[0]!.cx);
    expect(half.avatar.torsos[0]!.cy).toBe(full.avatar.torsos[0]!.cy);
  });

  it("records emotion angles the renderer's wheel understands", async () => {
    const { characters } = await buildPack({ source: FIXTURE, out: tmp() });
    const faces = characters[0]!.avatar.faces;
    const neutral = faces.find((f) => f.emotion === "NEUTRAL")!;
    const angry = faces.find((f) => f.emotion === "ANGRY")!;
    const wave = characters[0]!.avatar.torsos.find((t) => t.emotion === "WAVE")!;
    expect(neutral).toMatchObject({ angle: 0, intensity: 0 });
    expect(angry.angle).toBeCloseTo((5 * 2 * Math.PI) / 8);
    expect(wave.angle).toBe(1001); // gesture sentinel, outside the wheel
  });
});

describe("rejecting art that cannot be packed", () => {
  it("errors on a missing NEUTRAL face", async () => {
    const dir = sourceDir({
      "characters/a/face-HAPPY.png": blob(),
      "characters/a/torso-NEUTRAL.png": blob(),
    });
    const { report } = await analyze(dir);
    expect(report.ok).toBe(false);
    expect(messages(report.errors)).toContain("missing face-NEUTRAL.png");
  });

  it("errors on an opaque background", async () => {
    const dir = sourceDir({
      "characters/a/face-NEUTRAL.png": blob({ background: "#ffffff" }),
      "characters/a/torso-NEUTRAL.png": blob(),
    });
    const { report } = await analyze(dir);
    expect(messages(report.errors)).toContain("background is not transparent");
  });

  it("errors on a non-square or undersized canvas", async () => {
    const canvas = createCanvas(300, 200);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#333";
    ctx.fillRect(20, 20, 100, 100);
    const dir = sourceDir({
      "characters/a/face-NEUTRAL.png": canvas.toBuffer("image/png"),
      "characters/a/torso-NEUTRAL.png": blob({ edge: 64 }),
    });
    const { report } = await analyze(dir);
    expect(messages(report.errors)).toContain("must be square");
    expect(messages(report.errors)).toContain("below the minimum input edge");
  });

  it("errors on an emotion the wheel does not have", async () => {
    const dir = sourceDir({
      "characters/a/face-NEUTRAL.png": blob(),
      "characters/a/face-JOYFUL.png": blob(),
      "characters/a/torso-NEUTRAL.png": blob(),
    });
    const { report } = await analyze(dir);
    expect(messages(report.errors)).toContain(`unknown emotion "JOYFUL"`);
  });

  it("warns about, and ignores, a file that does not follow the naming rule", async () => {
    const dir = sourceDir({
      "characters/a/face-NEUTRAL.png": blob(),
      "characters/a/torso-NEUTRAL.png": blob(),
      "characters/a/reference-sketch.png": blob(),
    });
    const { report } = await analyze(dir);
    expect(report.ok).toBe(true);
    expect(messages(report.warnings)).toContain("does not match");
  });

  it("warns about a torso floating above the bottom edge", async () => {
    const dir = sourceDir({
      "characters/a/face-NEUTRAL.png": blob(),
      "characters/a/torso-NEUTRAL.png": blob({ box: { x: 20, y: 20, width: 200, height: 120 } }),
    });
    const { report } = await analyze(dir);
    expect(messages(report.warnings)).toContain("above the bottom of the canvas");
  });

  it("writes nothing when validation fails, unless forced", async () => {
    const dir = sourceDir({ "characters/a/face-HAPPY.png": blob() });
    const blocked = await buildPack({ source: dir, out: tmp() });
    expect(blocked.ok).toBe(false);
    expect(blocked.files).toEqual([]);

    const out = tmp();
    const forced = await buildPack({ source: dir, out, force: true });
    expect(forced.files).toContain("pack.json");
    expect(JSON.parse(readFileSync(join(out, "pack.json"), "utf8")).characters).toHaveLength(1);
  });
});
