/**
 * The pack contract: what an asset pack ships and what the renderer reads.
 *
 * Types only. A complex character composites faces onto torsos at draw time
 * (one face x one torso = one figure), so a pack ships parts, not baked
 * figures — the join is the few lines of arithmetic in {@link figureFor}, and
 * keeping parts separate is what lets {@link PoseCycle} round-robin distinct
 * pairings instead of freezing one drawing per emotion.
 */

/** A rectangle within a sprite sheet. */
export interface SheetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** One drawing in a sheet, plus everything the face/torso join needs. */
export interface PackedPart {
  kind: "face" | "torso" | "body";
  index: number;
  emotion: string;
  angle: number;
  intensity: number;
  /** Neck socket (torso), or its counterpart inside the face image. */
  cx: number;
  cy: number;
  /** Per-face nudge on the socket — a tilted head, a thrown-back laugh. */
  cxDelta: number;
  cyDelta: number;
  /** Where a balloon tail attaches. */
  x: number;
  figure: SheetRect;
  /** The halo, when the pose has one. Drawn before any figure. */
  aura: SheetRect | null;
}

export interface PackedAvatar {
  name: string;
  type: string;
  /** Whether the torso is drawn over the face's collar, or under it. */
  torsoFirst: boolean;
  sheet: string;
  sheetWidth: number;
  sheetHeight: number;
  faces: PackedPart[];
  torsos: PackedPart[];
  /** Simple avatars only; complex avatars leave this empty. */
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
  /** Character id (a {@link "@toonstrip/schema".Body.character}) → avatar. */
  cast: Record<string, PackedAvatar>;
  backdrops: PackedBackdrop[];
}
