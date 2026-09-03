// @vitest-environment node
//
// The regression this guards: `@toonstrip/element`'s module body must not
// throw when evaluated with no DOM present (dev plan §13.4 — a Next.js App
// Router server render pass still executes a "use client" component's
// module graph in Node). vitest's default jsdom environment would hide that.
import { describe, expect, it } from "vitest";

describe("@toonstrip/next client entry", () => {
  it("imports cleanly with no DOM globals present", async () => {
    const mod = await import("../src/index.js");
    expect(typeof mod.ComicStrip).toBe("function");
  });
});
