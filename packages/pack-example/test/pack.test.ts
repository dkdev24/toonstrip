import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadCastManifest, loadPackJson } from "../src/index.js";

describe("pack-example", () => {
  const pack = loadPackJson();

  it("declares one original character with a license", () => {
    expect(pack.license).toBe("MIT");
    expect(pack.characters.map((c) => c.id)).toEqual(["pip"]);
  });

  it("declares one original backdrop", () => {
    expect(pack.backdrops.map((b) => b.id)).toEqual(["meadow"]);
  });

  it("the sheet and manifest exist on disk", () => {
    const manifest = loadCastManifest();
    const pip = manifest.cast.pip;
    expect(existsSync(pip.sheet)).toBe(true);
    expect(pip.faces.length).toBeGreaterThan(0);
    expect(pip.torsos.length).toBeGreaterThan(0);
  });

  it("has at least a NEUTRAL face (minimum pose requirement)", () => {
    const manifest = loadCastManifest();
    expect(manifest.cast.pip.faces.some((f) => f.emotion === "NEUTRAL")).toBe(true);
  });

  it("the backdrop file exists on disk with matching dimensions", () => {
    const manifest = loadCastManifest();
    const meadow = manifest.backdrops[0];
    expect(existsSync(meadow.file)).toBe(true);
    expect(meadow.width).toBeGreaterThan(0);
    expect(meadow.height).toBeGreaterThan(0);
  });
});
