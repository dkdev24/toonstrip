import { describe, expect, it } from "vitest";
import renderer from "../src/renderer/server.js";
import { ComicStrip } from "../src/tag-name.js";

describe("renderer/server", () => {
  it("check() accepts only the comic-strip tag constant", () => {
    expect(renderer.check(ComicStrip)).toBe(true);
    expect(renderer.check("some-other-tag")).toBe(false);
    expect(renderer.check(() => {})).toBe(false);
  });

  it("renderToStaticMarkup() emits an inert placeholder tag", () => {
    expect(renderer.renderToStaticMarkup(ComicStrip)).toEqual({
      html: "<comic-strip></comic-strip>",
    });
  });
});
