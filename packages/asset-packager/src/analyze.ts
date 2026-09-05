/**
 * Reads, expands, measures and validates a source pack.
 *
 * "Expands" is M15's step: a declared sheet is sliced into the same
 * `SourcePart`/`SourceBackdrop` values the per-pose path produces, so
 * everything downstream — validation, packing, join derivation, the preview —
 * cannot tell the two inputs apart. Where both describe the same asset, the
 * individually generated file wins: that is the documented hybrid, a sheet to
 * lock identity plus a per-pose regeneration of whichever cell came out weak
 * (dev plan §15).
 *
 * A missing or unreadable file becomes a diagnostic rather than a thrown
 * error — a first-time author's most common failure is a filename that does
 * not exist yet, and that should be reported alongside everything else.
 */

import { existsSync } from "node:fs";
import { measureBackdrop, measurePart, type MeasuredBackdrop, type MeasuredPart } from "./measure.js";
import { readSource, type SourcePack } from "./source.js";
import { sliceBackdropSheet, sliceCharacterSheet } from "./sheet.js";
import { validateMeasured, type MeasuredPack, type ValidationReport } from "./validate.js";
import type { Diagnostic } from "./diagnostic.js";

export interface Analysis {
  source: SourcePack;
  measured: MeasuredPack;
  report: ValidationReport;
}

/** Slices one sheet, turning a missing file or a thrown error into a diagnostic. */
async function expandSheet<T extends { diagnostics: Diagnostic[] }>(
  path: string,
  file: string,
  notFoundMessage: string,
  sliceFailedMessage: (err: Error) => string,
  slice: () => Promise<T>,
): Promise<{ diagnostics: Diagnostic[]; result: T | null }> {
  if (!existsSync(path)) {
    return { diagnostics: [{ level: "error", file, message: notFoundMessage }], result: null };
  }
  try {
    const result = await slice();
    return { diagnostics: result.diagnostics, result };
  } catch (err) {
    return { diagnostics: [{ level: "error", file, message: sliceFailedMessage(err as Error) }], result: null };
  }
}

/**
 * Slices every declared sheet into `source`, in place. Returns the slicer's
 * diagnostics; missing sheet files are reported, not thrown.
 */
export async function expandSheets(source: SourcePack): Promise<Diagnostic[]> {
  const diagnostics: Diagnostic[] = [];

  for (const character of source.characters) {
    const sheet = character.sheet;
    if (!sheet) continue;
    const path = `${source.dir}/${sheet.file}`;
    const { diagnostics: sliceDiagnostics, result } = await expandSheet(
      path,
      sheet.file,
      `character "${character.id}": sheet file not found`,
      (err) => `character "${character.id}": could not slice sheet (${err.message})`,
      () => sliceCharacterSheet(character, { ...sheet, path }, source.spec),
    );
    diagnostics.push(...sliceDiagnostics);
    if (result) {
      // Per-pose files override the cell of the same name.
      const own = new Set(character.parts.map((p) => p.file));
      character.parts.push(...result.parts.filter((p) => !own.has(p.file)));
      character.parts.sort(
        (a, b) =>
          a.kind.localeCompare(b.kind) ||
          a.emotion.localeCompare(b.emotion) ||
          a.intensity - b.intensity ||
          a.variant - b.variant,
      );
    }
  }

  for (const sheet of source.backdropSheets) {
    const { diagnostics: sliceDiagnostics, result } = await expandSheet(
      sheet.path,
      sheet.file,
      `backdrop sheet not found`,
      (err) => `could not slice backdrop sheet (${err.message})`,
      () => sliceBackdropSheet(sheet, source.spec),
    );
    diagnostics.push(...sliceDiagnostics);
    if (result) {
      const own = new Set(source.backdrops.map((b) => b.id));
      source.backdrops.push(...result.backdrops.filter((b) => !own.has(b.id)));
    }
  }

  return diagnostics;
}

export async function measurePack(source: SourcePack): Promise<{ measured: MeasuredPack; readErrors: Diagnostic[] }> {
  const readErrors: Diagnostic[] = [];
  const parts = new Map<string, MeasuredPart[]>();

  for (const character of source.characters) {
    const measured: MeasuredPart[] = [];
    for (const part of character.parts) {
      try {
        measured.push(await measurePart(part, source.spec));
      } catch (err) {
        readErrors.push({
          level: "error",
          file: `${character.id}/${part.file}`,
          message: `could not read as a PNG (${(err as Error).message})`,
        });
      }
    }
    parts.set(character.id, measured);
  }

  const backdrops: MeasuredBackdrop[] = [];
  for (const backdrop of source.backdrops) {
    if (!backdrop.image && !existsSync(backdrop.path)) {
      readErrors.push({
        level: "error",
        file: backdrop.file,
        message: `backdrop "${backdrop.id}": file not found`,
      });
      continue;
    }
    try {
      backdrops.push(await measureBackdrop(backdrop, source.spec));
    } catch (err) {
      readErrors.push({
        level: "error",
        file: backdrop.file,
        message: `backdrop "${backdrop.id}": could not read as a PNG (${(err as Error).message})`,
      });
    }
  }

  return { measured: { source, parts, backdrops }, readErrors };
}

/** Read + expand sheets + measure + validate a source directory. */
export async function analyze(dir: string): Promise<Analysis> {
  const source = readSource(dir);
  const sheetDiagnostics = await expandSheets(source);
  const { measured, readErrors } = await measurePack(source);
  const report = validateMeasured(measured);

  const errors = [
    ...sheetDiagnostics.filter((d) => d.level === "error"),
    ...readErrors,
    ...report.errors,
  ];
  const warnings = [
    ...sheetDiagnostics.filter((d) => d.level === "warning"),
    ...report.warnings,
  ];
  return { source, measured, report: { ok: errors.length === 0, errors, warnings } };
}
