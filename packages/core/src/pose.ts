/**
 * Pose selection: mapping a requested emotion onto the poses a character
 * owns. Selection is nearest-neighbour on the emotion wheel, which is why a
 * character never needs a pose for every emotion — a request resolves to
 * whatever the pack actually shipped.
 *
 * Generic over `T extends Emotion` rather than fixed to a pack-format record:
 * selection only ever reads an angle and an intensity, never a byte offset or
 * a palette, so any manifest entry that carries `{ angle, intensity }` can be
 * passed straight through.
 */
import { NEMOTIONS, isGesture, type Emotion, type EmotionOption } from "./emotion.js";

/** Normalize into (-PI, PI]. */
export function normalizeAngle(value: number): number {
  if (value > -Math.PI && value <= Math.PI) return value;
  let t = value / (2 * Math.PI);
  t = (t - Math.trunc(t)) * 2 * Math.PI;
  if (t > Math.PI) return t - 2 * Math.PI;
  if (t <= -Math.PI) return t + 2 * Math.PI;
  return t;
}

export function subtractAngles(a: number, b: number): number {
  return normalizeAngle(a - b);
}

/**
 * How far a pose may sit from the request and still be considered: half a
 * wheel segment in each direction, so the eight segments tile the circle.
 */
const ANGLE_TOLERANCE = Math.PI / NEMOTIONS;

const isNeutral = (rec: Emotion) => rec.angle === 0 && rec.intensity === 0;

/**
 * Nearest pose by angle, then by intensity. Used for faces, which always
 * resolve to something: a character with one face still has to render.
 */
export function nearestByAngle<T extends Emotion>(
  records: readonly T[], want: Emotion,
): T | undefined {
  let best: T | undefined;
  let bestAngle = 3 * Math.PI;
  let bestIntensity = 2.0;

  for (const rec of records) {
    const angle = Math.abs(subtractAngles(rec.angle, want.angle));
    if (angle > bestAngle) continue;
    const intensity = Math.abs(want.intensity - rec.intensity);
    if (angle === bestAngle && intensity >= bestIntensity) continue;
    bestAngle = angle;
    bestIntensity = intensity;
    best = rec;
  }
  return best;
}

/**
 * Nearest torso or body: a gated search — a candidate must fall inside the
 * wheel segment, or be a resting neutral, to be considered at all. A torso
 * can therefore fail to match, and the caller falls back to neutral.
 *
 * `start` implements a round-robin: the scan begins after the pose used
 * last, so a repeated identical emotion cycles through whatever variants
 * exist instead of freezing on one drawing.
 */
export function nearestGated<T extends Emotion>(
  records: readonly T[], want: Emotion, start = 0,
): T | undefined {
  let best: T | undefined;
  let bestIntensity = 2.0;
  const n = records.length;

  for (let i = 0; i < n; i++) {
    const rec = records[(start + i) % n]!;
    // Gestures are sentinels above 2*PI; the angular metric cannot reach them.
    if (isGesture(rec.angle)) continue;
    const angle = Math.abs(subtractAngles(rec.angle, want.angle));
    const firstNeutralMatch = isNeutral(rec) && best === undefined;
    if (angle >= ANGLE_TOLERANCE && !firstNeutralMatch) continue;
    // A resting neutral standing in for a felt emotion is a weak match, but a
    // legal one — rank it behind anything that actually matched.
    const intensity = firstNeutralMatch && want.intensity > 0
      ? 1.5
      : Math.abs(want.intensity - rec.intensity);
    if (intensity >= bestIntensity) continue;
    bestIntensity = intensity;
    best = rec;
  }
  return best;
}

export function firstNeutral<T extends Emotion>(records: readonly T[]): T | undefined {
  return records.find(isNeutral) ?? records[0];
}

/**
 * Resolve one emotion to a face *or* a torso. An emotion on the wheel is a
 * facial expression and resolves against faces; a gesture (wave, shrug, ...)
 * is a body posture and resolves against torsos by exact match, since no
 * angular metric applies to a sentinel. One request therefore constrains one
 * half of the figure and leaves the other free — a character can wave while
 * looking sad.
 */
export function headAndTorsoFor<T extends Emotion>(
  faces: readonly T[], torsos: readonly T[], want: Emotion,
): { face?: T; torso?: T } {
  if (!isGesture(want.angle)) {
    const face = nearestByAngle(faces, want);
    return face ? { face } : {};
  }
  const torso = torsos.find((rec) => rec.angle === want.angle);
  return torso ? { torso } : {};
}

/**
 * Resolve a *set* of weighted candidate emotions to a face and a torso.
 *
 * Options are consumed highest-priority first; the first that yields a face
 * fixes the face, the first that yields a torso fixes the torso, and the
 * scan stops once both are filled. Anything still unfilled falls back to
 * neutral. This is how a gesture (which only ever fills a torso) and a
 * facial emotion (which only ever fills a face) combine into one figure from
 * one caller-supplied option set.
 */
export function selectComplexPose<T extends Emotion>(
  faces: readonly T[], torsos: readonly T[],
  options: readonly EmotionOption[],
): { face?: T; torso?: T } {
  const remaining = options.map((o) => ({ ...o }));
  let face: T | undefined;
  let torso: T | undefined;

  for (;;) {
    let best: (typeof remaining)[number] | undefined;
    for (const option of remaining) {
      if (option.priority > (best?.priority ?? 0)) best = option;
    }
    if (!best) break;
    best.priority = 0;
    const found = headAndTorsoFor(faces, torsos, best);
    face ??= found.face;
    torso ??= found.torso;
    if (face && torso) break;
  }

  face ??= firstNeutral(faces);
  torso ??= firstNeutral(torsos);
  const out: { face?: T; torso?: T } = {};
  if (face) out.face = face;
  if (torso) out.torso = torso;
  return out;
}

/** Resolve a single emotion to a face and a torso — the common path. */
export function selectPose<T extends Emotion>(
  faces: readonly T[], torsos: readonly T[], want: Emotion,
  lastTorso = -1,
): { face?: T; torso?: T } {
  const face = nearestByAngle(faces, want);
  const torso = nearestGated(torsos, want, (lastTorso + 1) % Math.max(1, torsos.length))
    ?? firstNeutral(torsos);
  const out: { face?: T; torso?: T } = {};
  if (face) out.face = face;
  if (torso) out.torso = torso;
  return out;
}

/** Simple characters have one image per pose; the same gated search applies. */
export function selectBody<T extends Emotion>(
  bodies: readonly T[], want: Emotion, lastBody = -1,
): T | undefined {
  if (isGesture(want.angle)) {
    return bodies.find((rec) => rec.angle === want.angle) ?? firstNeutral(bodies);
  }
  return nearestGated(bodies, want, (lastBody + 1) % Math.max(1, bodies.length))
    ?? firstNeutral(bodies);
}
