import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { BALLOON_FONT } from "../src/balloon.js";
import { canvasMetrics, layoutBalloons, type BalloonInput, type Rect } from "../src/balloon-layout.js";

function ctx() {
  const c = createCanvas(400, 400).getContext("2d");
  c.font = BALLOON_FONT;
  return c as unknown as CanvasRenderingContext2D;
}

const FREE: Rect = { left: 10, top: 10, right: 390, bottom: 200 };

describe("layoutBalloons", () => {
  it("places a single balloon over its speaker", () => {
    const c = ctx();
    const input: BalloonInput = {
      speaker: "alex", isBox: false, arrowX: 200, text: "Hello there.",
      metrics: canvasMetrics(c, { balloon: "speech", text: "Hello there." }),
    };
    const result = layoutBalloons([input], FREE);
    expect(result.fits).toBe(true);
    if (result.fits) {
      expect(result.balloons).toHaveLength(1);
      expect(result.balloons[0]!.box.x).toBeGreaterThanOrEqual(FREE.left);
    }
  });

  it("routes a second balloon around the first's corridor", () => {
    const c = ctx();
    const inputs: BalloonInput[] = [
      {
        speaker: "alex", isBox: false, arrowX: 100, text: "Hi.",
        metrics: canvasMetrics(c, { balloon: "speech", text: "Hi." }),
      },
      {
        speaker: "sam", isBox: false, arrowX: 300, text: "Hey.",
        metrics: canvasMetrics(c, { balloon: "speech", text: "Hey." }),
      },
    ];
    const result = layoutBalloons(inputs, FREE);
    expect(result.fits).toBe(true);
    if (result.fits) expect(result.balloons).toHaveLength(2);
  });

  it("is deterministic for the same content", () => {
    const c = ctx();
    const build = (): BalloonInput => ({
      speaker: "alex", isBox: false, arrowX: 200, text: "Same text every time.",
      metrics: canvasMetrics(c, { balloon: "speech", text: "Same text every time." }),
    });
    const a = layoutBalloons([build()], FREE);
    const b = layoutBalloons([build()], FREE);
    // Compare geometry only — each build() creates fresh metrics closures,
    // which are never reference-equal even when behaviorally identical.
    const geometry = (r: typeof a) => r.fits
      ? r.balloons.map(({ box, lines, routeRgn }) => ({ box, lines, routeRgn }))
      : null;
    expect(geometry(a)).toEqual(geometry(b));
  });

  it("force-fits and splits a lone balloon too tall for the free rect", () => {
    const c = ctx();
    const text = Array.from({ length: 60 }, (_, i) => `word${i}`).join(" ");
    const tight: Rect = { left: 10, top: 10, right: 100, bottom: 60 };
    const input: BalloonInput = {
      speaker: "alex", isBox: false, arrowX: 50, text,
      metrics: canvasMetrics(c, { balloon: "speech", text }),
    };
    const result = layoutBalloons([input], tight);
    expect(result.fits).toBe(true);
    if (result.fits) expect(result.leftover).not.toBeNull();
  });
});
