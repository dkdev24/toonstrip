/**
 * The emotion wheel's fixed points: an angle (which emotion), an intensity
 * 0.0-1.0 (how much), and eight gesture sentinels placed outside the wheel's
 * metric so a gesture never nearest-neighbour-matches a facial expression.
 */

export interface Emotion {
  /** Radians on the wheel, or a gesture sentinel above 2*PI. */
  angle: number;
  /** 0.0-1.0. */
  intensity: number;
}

/** One weighted candidate emotion. Higher priority is tried first. */
export interface EmotionOption extends Emotion {
  priority: number;
}

export const EMOTION_NAMES = [
  null, "HAPPY", "COY", "BORED", "SCARED", "SAD", "ANGRY", "SHOUT", "LAUGH",
  "NEUTRAL", "WAVE", "POINTOTHER", "POINTSELF", "DOUBLEPOINT", "SHRUG",
  "3QRWALK", "SIDEWALK", "3QFWALK",
] as const;

export type EmotionName = Exclude<(typeof EMOTION_NAMES)[number], null>;

/** Points on the emotion wheel that have an angle. */
export const NEMOTIONS = 8;

/**
 * Named-emotion index to runtime angle. Indices 1-8 are angles around the
 * wheel; 9 (NEUTRAL) is 0.0, the same angle as HAPPY, distinguished only by
 * intensity 0. The eight gestures (10-17) are sentinels above 2*PI,
 * deliberately outside the angular metric.
 */
export const EMOTION_ANGLES: readonly number[] = [
  0, // index 0 unused
  (0 * 2 * Math.PI) / 8, // HAPPY
  (1 * 2 * Math.PI) / 8, // COY
  (2 * 2 * Math.PI) / 8, // BORED
  (3 * 2 * Math.PI) / 8, // SCARED
  (4 * 2 * Math.PI) / 8, // SAD
  (5 * 2 * Math.PI) / 8, // ANGRY
  (6 * 2 * Math.PI) / 8, // SHOUT
  (7 * 2 * Math.PI) / 8, // LAUGH
  0.0, // NEUTRAL — same angle as HAPPY by design
  1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, // gesture sentinels
];

export function emotionAngle(index: number): number {
  return EMOTION_ANGLES[index] ?? 0;
}

/** True for the gesture sentinels, which no angular metric can reach. */
export function isGesture(angle: number): boolean {
  return angle > 2 * Math.PI;
}
