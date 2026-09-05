import { describe, expect, it } from "vitest";
import { UNIT, MIN_PANEL_SCALE, layoutStrip } from "../src/layout.js";

describe("layoutStrip", () => {
  it("gives one column for a narrow viewport", () => {
    expect(layoutStrip(300, { gutter: 10 }).columns).toBe(1);
  });

  it("earns a second column once two shrunk panels fit", () => {
    const twoUp = 2 * UNIT.width * MIN_PANEL_SCALE + 10;
    expect(layoutStrip(twoUp, { gutter: 10 }).columns).toBe(2);
  });

  it("never exceeds the 3-column ceiling", () => {
    expect(layoutStrip(100_000, { gutter: 10 }).columns).toBe(3);
  });

  it("fits a single panel down on a narrow viewport", () => {
    const layout = layoutStrip(300);
    expect(layout.columns).toBe(1);
    expect(layout.panelWidth).toBe(300);
    expect(layout.panelHeight).toBe(Math.round((300 / UNIT.width) * UNIT.height));
  });

  it("never stretches a panel above native width", () => {
    const layout = layoutStrip(4000);
    expect(layout.panelWidth).toBeLessThanOrEqual(UNIT.width);
  });

  it("falls back to the native unit when available is 0", () => {
    const layout = layoutStrip(0);
    expect(layout.panelWidth).toBe(UNIT.width);
  });
});
