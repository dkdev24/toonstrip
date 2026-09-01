import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, afterEach } from "vitest";
import { validatePack } from "../src/pack-validate.js";

const REAL_PACK_DIR = fileURLToPath(new URL("../../pack-comic-chat", import.meta.url));

describe("validatePack", () => {
  it("accepts the real pack-comic-chat pack", () => {
    const result = validatePack(REAL_PACK_DIR);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("rejects a directory with no pack.json", () => {
    const result = validatePack(tmpdir());
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/pack\.json not found/);
  });

  describe("against a deliberately broken pack", () => {
    let dir: string;

    afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
    });

    it("fails when a character is missing its NEUTRAL face", () => {
      dir = mkdtempSync(join(tmpdir(), "toonstrip-pack-"));
      mkdirSync(join(dir, "characters", "bob"), { recursive: true });
      writeFileSync(
        join(dir, "pack.json"),
        JSON.stringify({
          name: "broken",
          version: "1.0.0",
          license: "MIT",
          characters: [
            { id: "bob", name: "Bob", manifest: "characters/bob/bob.json", sheet: "characters/bob/sheet.png" },
          ],
          backdrops: [],
        }),
      );
      writeFileSync(
        join(dir, "characters", "bob", "bob.json"),
        JSON.stringify({ faces: [{ kind: "face", emotion: "HAPPY" }], torsos: [], bodies: [] }),
      );
      writeFileSync(join(dir, "characters", "bob", "sheet.png"), Buffer.from([0]));

      const result = validatePack(dir);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("NEUTRAL"))).toBe(true);
    });
  });
});
