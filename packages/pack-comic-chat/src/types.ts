/**
 * Local copies of the pack contract shapes, kept independent of
 * `@toonstrip/core` (see dev plan §2: "asset packs depend on schema only").
 * Structurally identical to `@toonstrip/core`'s `CastManifest`/`PackedAvatar`/
 * `PackedPart`/`SheetRect`/`PackedBackdrop` — TypeScript's structural typing
 * unifies the two at the point a caller passes this package's output into
 * `packages/core`'s renderer, with no import needed in either direction.
 */

export interface SheetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PackedPart {
  kind: "face" | "torso" | "body";
  index: number;
  emotion: string;
  angle: number;
  intensity: number;
  cx: number;
  cy: number;
  cxDelta: number;
  cyDelta: number;
  x: number;
  figure: SheetRect;
  aura: SheetRect | null;
}

export interface PackedAvatar {
  name: string;
  type: string;
  torsoFirst: boolean;
  sheet: string;
  sheetWidth: number;
  sheetHeight: number;
  faces: PackedPart[];
  torsos: PackedPart[];
  bodies: PackedPart[];
}

export interface PackedBackdrop {
  id: string;
  file: string;
  width: number;
  height: number;
}

export interface CastManifest {
  version: 1;
  cast: Record<string, PackedAvatar>;
  backdrops: PackedBackdrop[];
}

export interface PackJson {
  name: string;
  version: string;
  license: string;
  characters: { id: string; name: string; manifest: string; sheet: string }[];
  backdrops: PackedBackdrop[];
}
