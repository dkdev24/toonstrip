/**
 * The one diagnostic shape everything reports in. An **error** means the pack
 * cannot be built; a **warning** means it will build and render but probably
 * look wrong.
 */

export type Level = "error" | "warning";

export interface Diagnostic {
  level: Level;
  message: string;
  /** Source-relative file (or sheet cell) the diagnostic is about. */
  file?: string;
}
