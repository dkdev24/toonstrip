import { describe, expect, it } from "vitest";
import { ComicStripValidationError, validateDocument } from "../src/validate.js";

const validDoc = {
  version: 1,
  panels: [
    {
      backdrop: "pastoral",
      camera: "medium",
      bodies: [{ character: "dan", emotion: { angle: 0, intensity: 0.8 } }],
      speakers: [{ speaker: "dan", balloon: "speech", text: "Hello." }],
    },
  ],
};

describe("validateDocument", () => {
  it("accepts a well-formed document", () => {
    expect(validateDocument(validDoc)).toEqual(validDoc);
  });

  it("rejects a missing version", () => {
    const { version, ...rest } = validDoc;
    expect(() => validateDocument(rest)).toThrow(ComicStripValidationError);
  });

  it("rejects an unknown camera preset", () => {
    const bad = { ...validDoc, panels: [{ ...validDoc.panels[0], camera: "dutch-angle" }] };
    expect(() => validateDocument(bad)).toThrow(ComicStripValidationError);
  });

  it("rejects an unknown top-level property", () => {
    const bad = { ...validDoc, extra: true };
    expect(() => validateDocument(bad)).toThrow(ComicStripValidationError);
  });
});
