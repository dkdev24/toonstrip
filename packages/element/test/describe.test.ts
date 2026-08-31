import { describe, expect, it } from "vitest";
import { describePanel } from "../src/describe.js";
import type { Panel } from "@toonstrip/schema";

describe("describePanel", () => {
  it("describes a caption-only panel", () => {
    const panel: Panel = {
      backdrop: "pastoral",
      camera: "establishing",
      bodies: [],
      speakers: [{ speaker: "caption", balloon: "caption", text: "A field at dusk." }],
    };
    expect(describePanel(panel)).toBe("establishing shot; caption: A field at dusk.");
  });

  it("describes a speech and a thought balloon", () => {
    const panel: Panel = {
      backdrop: "pastoral",
      camera: "medium",
      bodies: [
        { character: "dan", emotion: { angle: 0, intensity: 0.5 } },
        { character: "tiki", emotion: { angle: 0, intensity: 0.5 } },
      ],
      speakers: [
        { speaker: "dan", balloon: "speech", text: "Hello." },
        { speaker: "tiki", balloon: "thought", text: "Odd greeting." },
      ],
    };
    const label = describePanel(panel);
    expect(label).toContain("medium shot");
    expect(label).toContain('dan says "Hello."');
    expect(label).toContain('tiki thinks "Odd greeting."');
  });

  it("falls back to a no-dialogue note", () => {
    const panel: Panel = { backdrop: "pastoral", bodies: [], speakers: [] };
    expect(describePanel(panel)).toBe("medium shot; no dialogue");
  });

  it("includes the room title when present", () => {
    const panel: Panel = { backdrop: "pastoral", roomTitle: "The Clearing", bodies: [], speakers: [] };
    expect(describePanel(panel)).toBe("medium shot; The Clearing");
  });
});
