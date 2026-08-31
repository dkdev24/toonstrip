/**
 * Local copies of the pack contract shapes, kept independent of
 * `@toonstrip/core` (see dev plan §2: "asset packs depend on schema only").
 * Identical in shape to `@toonstrip/pack-comic-chat`'s own `src/types.ts` —
 * every pack carries its own copy rather than importing a shared one, which
 * is itself part of what this pack exists to prove (see docs/packs.md and
 * NOTES.md "M5").
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
