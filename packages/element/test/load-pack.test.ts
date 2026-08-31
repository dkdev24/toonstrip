// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadCastFromPacks } from "../src/load-pack.js";

const PACK_A_JSON = {
  name: "pack-a",
  version: "1.0.0",
  license: "MIT",
  characters: [{ id: "dan", name: "Dan", manifest: "characters/dan/dan.json", sheet: "characters/dan/sheet.png" }],
  backdrops: [{ id: "pastoral", file: "backdrops/pastoral.png", width: 400, height: 340 }],
};

const DAN_MANIFEST = {
  name: "dan",
  type: "hero",
  torsoFirst: true,
  sheet: "characters/dan/sheet.png",
  sheetWidth: 100,
  sheetHeight: 100,
  faces: [],
  torsos: [],
  bodies: [],
};

function mockFetch(routes: Record<string, unknown>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    const entry = Object.entries(routes).find(([path]) => url.pathname.endsWith(path));
    if (!entry) return { ok: false, status: 404, statusText: "not found" } as Response;
    return { ok: true, status: 200, json: async () => entry[1] } as Response;
  });
}

beforeEach(() => {
  // jsdom's Image never fires load/error on its own; resolve immediately.
  vi.stubGlobal(
    "Image",
    class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      crossOrigin = "";
      set src(_v: string) {
        queueMicrotask(() => this.onload?.());
      }
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("loadCastFromPacks", () => {
  it("loads a character and backdrop from a single pack", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        "/pack.json": PACK_A_JSON,
        "/characters/dan/dan.json": DAN_MANIFEST,
      }),
    );
    const cast = await loadCastFromPacks(["https://cdn.example/pack-a/"], ["dan"], ["pastoral"]);
    expect(cast.manifest.cast.dan).toBeDefined();
    expect(cast.sheets.has("dan")).toBe(true);
    expect(cast.backdrops.has("pastoral")).toBe(true);
  });

  it("throws when no registered pack declares the id", async () => {
    vi.stubGlobal("fetch", mockFetch({ "/pack.json": PACK_A_JSON }));
    await expect(loadCastFromPacks(["https://cdn.example/pack-a/"], ["nobody"], [])).rejects.toThrow(
      /no registered pack declares character "nobody"/,
    );
  });

  it("throws on a collision between two packs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("pack-a")) return { ok: true, status: 200, json: async () => PACK_A_JSON } as Response;
        if (url.includes("pack-b")) return { ok: true, status: 200, json: async () => PACK_A_JSON } as Response;
        return { ok: false, status: 404, statusText: "not found" } as Response;
      }),
    );
    await expect(
      loadCastFromPacks(["https://cdn.example/pack-a/", "https://cdn.example/pack-b/"], ["dan"], []),
    ).rejects.toThrow(/declared by more than one registered pack/);
  });

  it("throws when characters are needed but no packs are registered", async () => {
    await expect(loadCastFromPacks([], ["dan"], [])).rejects.toThrow(/no packs are registered/);
  });
});
