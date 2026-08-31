import { createCanvas } from "@napi-rs/canvas";
import { beforeAll, describe, expect, it } from "vitest";
import {
  BALLOON_FONT, drawBalloon, measureBalloon, splitHeight,
} from "../src/balloon.js";

function ctx() {
  const c = createCanvas(400, 400).getContext("2d");
  c.font = BALLOON_FONT;
  return c as unknown as CanvasRenderingContext2D;
}

describe("measureBalloon", () => {
  it("keeps short text on one line", () => {
    const c = ctx();
    const measured = measureBalloon(c, { balloon: "speech", text: "Hi." }, 300);
    expect(measured.lines).toHaveLength(1);
  });

  it("wraps long text onto multiple lines", () => {
    const c = ctx();
    const text = "This is a much longer line of dialogue that should not fit on one line at all.";
    const measured = measureBalloon(c, { balloon: "speech", text }, 150);
    expect(measured.lines.length).toBeGreaterThan(1);
  });

  it("gives a thought balloon more padding than a speech balloon", () => {
    const c = ctx();
    const speech = measureBalloon(c, { balloon: "speech", text: "Hmm." }, 300);
    const thought = measureBalloon(c, { balloon: "thought", text: "Hmm." }, 300);
    expect(thought.width).toBeGreaterThan(speech.width);
  });
});

describe("splitHeight", () => {
  it("returns the whole text unsplit when it fits", () => {
    const c = ctx();
    const result = splitHeight(c, { balloon: "speech", text: "Short." }, 200, 200);
    expect(result.rest).toBeNull();
    expect(result.text).toBe("Short.");
  });

  it("splits text too tall for the box and always keeps a word", () => {
    const c = ctx();
    const text = Array.from({ length: 20 }, (_, i) => `word${i}`).join(" ");
    const result = splitHeight(c, { balloon: "speech", text }, 80, 20);
    expect(result.rest).not.toBeNull();
    expect(result.text.length).toBeGreaterThan(0);
  });
});

describe("drawBalloon", () => {
  it("draws without throwing for each balloon kind", () => {
    const c = ctx();
    for (const kind of ["speech", "thought", "caption"] as const) {
      expect(() => drawBalloon(
        c, { balloon: kind }, { x: 10, y: 10, width: 100, height: 40 },
        ["hi"], kind === "caption" ? null : { x: 50, y: 200 },
      )).not.toThrow();
    }
  });
});
