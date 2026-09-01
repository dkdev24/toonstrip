import { describe, expect, it } from "vitest";
import renderer from "../src/renderer/server.js";
import { ComicStrip } from "../src/tag-name.js";

describe("renderer/server", () => {
  it("check() accepts only the comic-strip tag constant", () => {
    expect(renderer.check(ComicStrip)).toBe(true);
    expect(renderer.check("some-other-tag")).toBe(false);
    expect(renderer.check(() => {})).toBe(false);
  });

  it("renderToStaticMarkup() emits an inert placeholder tag with a non-zero box", () => {
    // The box matters, not just the tag: a zero-size placeholder never
    // triggers `client:visible`'s IntersectionObserver in Chromium (see
    // server.ts), so this asserts a non-empty `min-height` is present rather
    // than pinning the exact style string.
    const { html } = renderer.renderToStaticMarkup(ComicStrip);
    expect(html).toMatch(/^<comic-strip style="[^"]*min-height:\s*[1-9]\d*px[^"]*"><\/comic-strip>$/);
  });
});
