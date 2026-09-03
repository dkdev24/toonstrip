// @vitest-environment jsdom
//
// jsdom implements neither ResizeObserver nor IntersectionObserver — stubbed
// below, same as packages/element's own test. Both fixture documents use
// `dark: true` panels with no bodies, so `@toonstrip/element`'s cast loader
// never fetches anything (no pack needed to prove the wrapper's own job:
// forwarding props onto the same underlying element instance).
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComicStripElement } from "@toonstrip/element";
import type { ComicStripDocument } from "@toonstrip/schema";
import { ComicStrip } from "../src/ComicStrip.js";

class StubResizeObserver {
  observe() {}
  disconnect() {}
  unobserve() {}
}

class StubIntersectionObserver {
  observe() {}
  disconnect() {}
  unobserve() {}
}

const doc1: ComicStripDocument = {
  version: 1,
  panels: [{ backdrop: "pastoral", dark: true, bodies: [], speakers: [] }],
};

const doc2: ComicStripDocument = {
  version: 1,
  panels: [
    { backdrop: "pastoral", dark: true, bodies: [], speakers: [] },
    { backdrop: "pastoral", dark: true, bodies: [], speakers: [] },
  ],
};

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", StubResizeObserver);
  vi.stubGlobal("IntersectionObserver", StubIntersectionObserver);
  // packs=["/pack/"] below never resolves to a real pack.json — this suite
  // only checks that the prop reaches the element, not a full cast load — so
  // fetch is stubbed to fail instantly (no real network attempt, which jsdom
  // would otherwise leave pending past the end of the test) and the
  // resulting, expected console.error from #fail is silenced.
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404, statusText: "not found" }) as Response));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ComicStrip", () => {
  it("mounts a <comic-strip> element and forwards document/packs onto it", async () => {
    const wrapper = mount(ComicStrip, { props: { document: doc1, packs: ["/pack/"] } });
    const el = wrapper.element as ComicStripElement;
    expect(el.tagName.toLowerCase()).toBe("comic-strip");
    await vi.waitFor(() => expect(el.document).toEqual(doc1));
    expect(el.packs).toEqual(["/pack/"]);
    // Let the (stubbed, instantly-failing) cast load settle before the test
    // ends, so its console.error lands inside this test's mock, not later.
    await vi.waitFor(() => expect(console.error).toHaveBeenCalled());
    wrapper.unmount();
  });

  it("updates the same element instance on a document prop change, not a remount", async () => {
    const wrapper = mount(ComicStrip, { props: { document: doc1 } });
    const first = wrapper.element as ComicStripElement;
    await vi.waitFor(() => expect(first.document).toEqual(doc1));

    await wrapper.setProps({ document: doc2 });
    const second = wrapper.element;

    expect(second).toBe(first);
    await vi.waitFor(() => expect((second as ComicStripElement).document).toEqual(doc2));
    wrapper.unmount();
  });
});
