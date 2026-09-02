import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { BALLOON_FONT, balloonFont } from "../src/balloon.js";
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

  it("gives a two-speaker panel side-by-side room instead of stacking one below the other", () => {
    // Regression for the real-content case that used to refuse this panel:
    // a long first balloon's width estimate, unbounded, claimed nearly the
    // whole free rect and pushed the second balloon entirely below it,
    // overrunning the vertical budget. Real dialogue, real proportions
    // (mirrors the 363x309 production embed's balloon band).
    const c = ctx();
    const free: Rect = { left: 10, top: 10, right: 353, bottom: 136 };
    const inputs: BalloonInput[] = [
      {
        speaker: "dan", isBox: false, arrowX: 124,
        text: "Microsoft open-sourced Zork AND Comic Chat. Two ancient projects, dropped months apart.",
        metrics: canvasMetrics(c, {
          balloon: "thought",
          text: "Microsoft open-sourced Zork AND Comic Chat. Two ancient projects, dropped months apart.",
        }),
      },
      {
        speaker: "tiki", isBox: false, arrowX: 272, text: "Let me guess. You want to smash them together.",
        metrics: canvasMetrics(c, { balloon: "speech", text: "Let me guess. You want to smash them together." }),
      },
    ];
    const result = layoutBalloons(inputs, free);
    expect(result.fits).toBe(true);
    if (!result.fits) return;
    const [first, second] = result.balloons;
    // Side-by-side, not stacked: the second balloon docks near the free
    // rect's top rather than below the first's bottom edge.
    expect(second!.box.y).toBeLessThan(first!.box.y + first!.box.height);
    // Each balloon's corridor stayed on its own speaker's side.
    expect(first!.box.x + first!.box.width).toBeLessThanOrEqual(second!.box.x + 1);
  });

  it("keeps fitting the same real panel when scaled well below native", () => {
    // Regression for the residual scale-sensitivity bug: every layout
    // constant used to be a fixed CSS px, so the same real content that fit
    // at native size could still refuse once scaled down (a real embed is
    // routinely narrower than native — see `layout.ts`). At `scale = 0.65`
    // (roughly a 260px-wide embed), font, chrome, and corridor floors must
    // all shrink together with the free rect for this to keep fitting.
    const scale = 0.65;
    const c = createCanvas(400, 400).getContext("2d") as unknown as CanvasRenderingContext2D;
    c.font = balloonFont(scale);
    const free: Rect = {
      left: 10 * scale, top: 10 * scale, right: 353 * scale, bottom: 136 * scale,
    };
    const inputs: BalloonInput[] = [
      {
        speaker: "dan", isBox: false, arrowX: 124 * scale,
        text: "Microsoft open-sourced Zork AND Comic Chat. Two ancient projects, dropped months apart.",
        metrics: canvasMetrics(c, {
          balloon: "thought",
          text: "Microsoft open-sourced Zork AND Comic Chat. Two ancient projects, dropped months apart.",
        }, scale),
      },
      {
        speaker: "tiki", isBox: false, arrowX: 272 * scale, text: "Let me guess. You want to smash them together.",
        metrics: canvasMetrics(
          c, { balloon: "speech", text: "Let me guess. You want to smash them together." }, scale,
        ),
      },
    ];
    const result = layoutBalloons(inputs, free, undefined, scale);
    expect(result.fits).toBe(true);
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
