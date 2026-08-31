export type CameraPreset =
  | "reaction"
  | "establishing"
  | "wide"
  | "close-up"
  | "over-shoulder"
  | "medium";

export type BalloonKind = "speech" | "thought" | "caption";

export interface Emotion {
  angle: number;
  intensity: number;
}

export interface Body {
  character: string;
  emotion: Emotion;
  pose?: "wave" | "point" | "shrug";
  requested?: boolean;
}

export interface Line {
  speaker: string | "caption";
  balloon: BalloonKind;
  text: string;
}

export interface Panel {
  backdrop: string;
  roomTitle?: string;
  dark?: boolean;
  camera?: CameraPreset;
  bodies: Body[];
  speakers: Line[];
}

export interface ComicStripDocument {
  version: 1;
  panels: Panel[];
}
