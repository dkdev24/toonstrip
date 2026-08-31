import { describe, expect, it } from "vitest";
import { UNIT, MAX_COLUMNS, MIN_PANEL_SCALE, cellFor, columnsFor, layoutStrip } from "../src/layout.js";

describe("columnsFor", () => {
  it("gives one column for a narrow viewport", () => {
    expect(columnsFor(300, 10)).toBe(1);
  });

  it("earns a second column once two shrunk panels fit", () => {
    const twoUp = 2 * UNIT.width * MIN_PANEL_SCALE + 10;
    expect(columnsFor(twoUp, 10)).toBe(2);
  });

  it("never exceeds MAX_COLUMNS", () => {
    expect(columnsFor(100_000, 10)).toBe(MAX_COLUMNS);
  });
});

describe("layoutStrip", () => {
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

describe("cellFor", () => {
  it("is row-major", () => {
    expect(cellFor(0, 3)).toEqual({ row: 0, column: 0 });
    expect(cellFor(2, 3)).toEqual({ row: 0, column: 2 });
    expect(cellFor(3, 3)).toEqual({ row: 1, column: 0 });
  });
});
