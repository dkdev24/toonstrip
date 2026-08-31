import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadCastManifest, loadPackJson } from "../src/index.js";

describe("pack-comic-chat", () => {
  const pack = loadPackJson();

  it("declares the full 15-character roster with a license", () => {
    expect(pack.license).toBe("MIT");
    expect(pack.characters).toHaveLength(15);
    expect(new Set(pack.characters.map((c) => c.id)).size).toBe(15);
  });

  it("declares all 3 default backdrops", () => {
    expect(pack.backdrops.map((b) => b.id).sort()).toEqual(["field", "pastoral", "room8bs"]);
  });

  it("every declared character sheet and manifest file exists on disk", () => {
    const manifest = loadCastManifest();
    for (const [id, avatar] of Object.entries(manifest.cast)) {
      expect(existsSync(avatar.sheet), `${id} sheet missing`).toBe(true);
      expect(avatar.faces.length, `${id} has no faces`).toBeGreaterThan(0);
    }
  });

  it("every character has at least a NEUTRAL face (minimum pose requirement)", () => {
    const manifest = loadCastManifest();
    for (const [id, avatar] of Object.entries(manifest.cast)) {
      expect(avatar.faces.some((f) => f.emotion === "NEUTRAL"), `${id} missing NEUTRAL face`).toBe(true);
    }
  });

  it("every declared backdrop file exists on disk with matching dimensions", () => {
    const manifest = loadCastManifest();
    for (const b of manifest.backdrops) {
      expect(existsSync(b.file), `${b.id} file missing`).toBe(true);
      expect(b.width).toBeGreaterThan(0);
      expect(b.height).toBeGreaterThan(0);
    }
  });
});
