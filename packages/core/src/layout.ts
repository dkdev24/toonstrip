/**
 * Panel sequencing: the responsive column-count-from-available-width policy.
 *
 * Every panel renders at a fixed native size and never stretches above it —
 * a figure that composed differently at every viewport width would be an
 * authoring instability. Column count reflows instead: a width that cannot
 * hold another native panel earns one anyway if the row can shrink to within
 * {@link MIN_PANEL_SCALE} of native, and a viewport narrower than one native
 * panel fits the single column down to whatever width is available.
 */

/** Native panel size — the art is ~400x400, so this is the 1:1 point. */
export const UNIT = { width: 400, height: 340 };

/** The column ceiling on a wide viewport — a decision, not a fit result. */
export const MAX_COLUMNS = 3;

/**
 * Shrink tolerance: the floor a panel may shrink to *in order to earn
 * another column*. Not a floor on a lone panel — a viewport too narrow for
 * even one native panel gets a straight fit-down (see {@link layoutStrip}),
 * which can go below this.
 */
export const MIN_PANEL_SCALE = 0.85;

export interface StripLayout {
  /** Panels per row. Always at least 1. */
  columns: number;
  /** CSS-pixel width of one panel. */
  panelWidth: number;
  /** CSS-pixel height of one panel, at the native aspect. */
  panelHeight: number;
}

export interface LayoutOptions {
  /** Space between panels, both axes. */
  gutter?: number;
  /** Ceiling on columns; defaults to {@link MAX_COLUMNS}. */
  maxColumns?: number;
}

/**
 * How many panels fit across `available` pixels, fit against
 * {@link MIN_PANEL_SCALE} of the native unit width rather than the unit
 * itself — so a width that cannot hold two *native* panels but can hold two
 * shrunk to >= 0.85 native still earns the two-up layout. {@link layoutStrip}
 * fills in the actual share width afterward.
 */
export function columnsFor(available: number, gutter: number, maxColumns = MAX_COLUMNS): number {
  const minWidth = UNIT.width * MIN_PANEL_SCALE;
  const fit = Math.floor((available + gutter) / (minWidth + gutter));
  return Math.max(1, Math.min(fit, maxColumns));
}

/**
 * The strip's geometry at a given container width. The panel width resolves
 * to one of three cases:
 *
 * - **Native.** `share >= UNIT.width`: the panel sits at native and the row
 *   is centred in its leftover. The common case above one column's worth of
 *   space.
 * - **Shrink-to-earn-a-column.** `0.85*UNIT.width <= share < UNIT.width`:
 *   arises because {@link columnsFor} fit the extra column against
 *   {@link MIN_PANEL_SCALE}; panels shrink to the share so both fit.
 * - **Fit-down.** One column narrower than a native panel: the lone panel
 *   scales down to fit rather than overflow. The only case that may drop
 *   below 0.85.
 */
export function layoutStrip(available: number, options: LayoutOptions = {}): StripLayout {
  const gutter = options.gutter ?? 10;
  // A container that has not been measured yet reports 0; fall back to the
  // unit rather than dividing a row into a zero-width panel.
  const width = available > 0 ? available : UNIT.width;
  const columns = columnsFor(width, gutter, options.maxColumns);
  const share = (width - (columns - 1) * gutter) / columns;
  // Native is the ceiling — never a free stretch.
  const panelWidth = Math.max(1, Math.min(share, UNIT.width));
  return {
    columns,
    panelWidth,
    panelHeight: Math.round((panelWidth / UNIT.width) * UNIT.height),
  };
}

/**
 * Which cell a panel occupies. Kept as its own function because it is the
 * half of the policy that says *reading order is row-major* — the strip's
 * DOM order and the grid's flow have to agree with it or a resize would
 * renumber the comic.
 */
export function cellFor(index: number, columns: number): { row: number; column: number } {
  return { row: Math.floor(index / columns), column: index % columns };
}
