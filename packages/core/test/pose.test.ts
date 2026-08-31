import { describe, expect, it } from "vitest";
import { nearestByAngle, normalizeAngle, selectComplexPose, subtractAngles } from "../src/pose.js";
import { emotionAngle } from "../src/emotion.js";
import type { EmotionOption } from "../src/emotion.js";

describe("normalizeAngle / subtractAngles", () => {
  it("wraps into (-PI, PI]", () => {
    expect(normalizeAngle(3 * Math.PI)).toBeCloseTo(Math.PI, 5);
    expect(normalizeAngle(0)).toBe(0);
  });

  it("measures the short way around the circle", () => {
    expect(Math.abs(subtractAngles(Math.PI, -Math.PI))).toBeCloseTo(0, 5);
  });
});

describe("nearestByAngle", () => {
  const records = [
    { angle: 0, intensity: 0 },
    { angle: Math.PI, intensity: 1 },
  ];

  it("picks the closer angle", () => {
    expect(nearestByAngle(records, { angle: 0.1, intensity: 0 })).toBe(records[0]);
    expect(nearestByAngle(records, { angle: Math.PI - 0.1, intensity: 1 })).toBe(records[1]);
  });

  it("breaks an angle tie on intensity", () => {
    const tied = [
      { angle: 0, intensity: 0 },
      { angle: 0, intensity: 1 },
    ];
    expect(nearestByAngle(tied, { angle: 0, intensity: 0.9 })).toBe(tied[1]);
  });
});

describe("selectComplexPose", () => {
  const faces = [
    { angle: 0, intensity: 0 }, // neutral
    { angle: emotionAngle(1), intensity: 1 }, // happy
  ];
  const torsos = [
    { angle: 0, intensity: 0 }, // neutral
    { angle: 1001, intensity: 1 }, // wave gesture
  ];

  it("resolves a plain emotion to a face and a neutral torso", () => {
    const options: EmotionOption[] = [{ angle: emotionAngle(1), intensity: 1, priority: 1 }];
    const chosen = selectComplexPose(faces, torsos, options);
    expect(chosen.face).toBe(faces[1]);
    expect(chosen.torso).toBe(torsos[0]);
  });

  it("lets a higher-priority gesture claim the torso while emotion claims the face", () => {
    const options: EmotionOption[] = [
      { angle: 1001, intensity: 1, priority: 2 },
      { angle: emotionAngle(1), intensity: 1, priority: 1 },
    ];
    const chosen = selectComplexPose(faces, torsos, options);
    expect(chosen.torso).toBe(torsos[1]);
    expect(chosen.face).toBe(faces[1]);
  });

  it("falls back to neutral when nothing matches", () => {
    const chosen = selectComplexPose(faces, torsos, []);
    expect(chosen.face).toBe(faces[0]);
    expect(chosen.torso).toBe(torsos[0]);
  });
});
