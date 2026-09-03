/**
 * `@toonstrip/asset-packager` — turns per-pose PNGs into a toonstrip asset
 * pack. Offline and deterministic: no model call, no network. See
 * `docs/asset-image-spec.md` for the input rules and `docs/packs.md` for the
 * output format.
 */

export * from "./spec.js";
export * from "./diagnostic.js";
export * from "./grid.js";
export * from "./sheet.js";
export * from "./register.js";
export * from "./template.js";
export * from "./source.js";
export * from "./measure.js";
export * from "./analyze.js";
export * from "./validate.js";
export * from "./pack.js";
export * from "./build.js";
export * from "./init.js";
export { renderJoinPreview } from "./preview.js";
export type { Box, Raster, AlphaStats } from "./image.js";
