/**
 * `@toonstrip/asset-packager` — turns per-pose PNGs into a toonstrip asset
 * pack. Offline and deterministic: no model call, no network. See
 * `docs/asset-image-spec.md` for the input rules and `docs/packs.md` for the
 * output format.
 */

export { analyze, type Analysis } from "./analyze.js";
export { renderAnchorGuide, type AnchorGuideResult } from "./anchor-guide.js";
export { buildPack, type BuildOptions, type BuildResult } from "./build.js";
export { renderTemplate, type TemplateOptions, type TemplateKind, type TemplateResult } from "./template.js";
export type { Diagnostic } from "./validate.js";
export type { SourceJson } from "./source.js";
