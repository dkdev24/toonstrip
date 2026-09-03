// @vitest-environment jsdom
//
// jsdom implements neither ResizeObserver nor IntersectionObserver, so this
// stubs both to verify the element's wiring (canvas pool, ARIA, relayout on
// a simulated resize) without a real browser. The actual live-resize and
// axe-core a11y exit criteria were verified against a real Chromium via
// scripts/verify-demo.mjs — see NOTES.md "M3" for why that isn't part of
// this suite.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerComicStripElement } from "../src/comic-strip-element.js";

// customElements.define permanently associates a class with a tag name — it
// can only happen once per class, so register at module load rather than
// per test.
registerComicStripElement("comic-strip-test");

let resizeCallback: ResizeObserverCallback | null = null;

class StubResizeObserver {
  constructor(cb: ResizeObserverCallback) {
    resizeCallback = cb;
  }
  observe() {}
  disconnect() {}
  unobserve() {}
}

class StubIntersectionObserver {
  #cb: IntersectionObserverCallback;
  #observed = new Set<Element>();
  constructor(cb: IntersectionObserverCallback) {
    this.#cb = cb;
  }
  observe(el: Element) {
    this.#observed.add(el);
    this.#cb(
      [{ target: el, isIntersecting: true } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
  disconnect() {
    this.#observed.clear();
  }
  unobserve(el: Element) {
    this.#observed.delete(el);
  }
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", StubResizeObserver);
  vi.stubGlobal("IntersectionObserver", StubIntersectionObserver);
  // jsdom's canvas has no real 2D context ("Not implemented" without the
  // native `canvas` package); painting is proven elsewhere (packages/core's
  // fixture render, and the real-browser demo check), so make getContext a
  // no-op here and let #paint's existing null-ctx guard skip drawing.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("pack.json")) {
        return {
          ok: true,
          json: async () => ({
            name: "test-pack",
            version: "1.0.0",
            license: "MIT",
            characters: [{ id: "dan", name: "Dan", manifest: "characters/dan/dan.json", sheet: "characters/dan/sheet.png" }],
            backdrops: [{ id: "pastoral", file: "backdrops/pastoral.png", width: 400, height: 340 }],
          }),
        } as Response;
      }
      if (url.includes("dan.json")) {
        return {
          ok: true,
          json: async () => ({
            name: "dan",
            type: "hero",
            torsoFirst: true,
            sheet: "characters/dan/sheet.png",
            sheetWidth: 100,
            sheetHeight: 100,
            faces: [],
            torsos: [],
            bodies: [],
          }),
        } as Response;
      }
      return { ok: false, status: 404, statusText: "not found" } as Response;
    }),
  );
  vi.stubGlobal(
    "Image",
    class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      crossOrigin = "";
      set src(_v: string) {
        queueMicrotask(() => this.onload?.());
      }
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resizeCallback = null;
});

describe("ComicStripElement", () => {
  it("builds a canvas pool with role=img and aria-label per panel", async () => {
    const el = document.createElement("comic-strip-test") as HTMLElement & {
      packs: string[];
      document: unknown;
      columns: number;
    };
    document.body.append(el);
    el.packs = ["/pack/"];
    el.document = {
      version: 1,
      panels: [
        { backdrop: "pastoral", bodies: [{ character: "dan", emotion: { angle: 0, intensity: 0.5 } }], speakers: [{ speaker: "dan", balloon: "speech", text: "Hi." }] },
        { backdrop: "pastoral", bodies: [], speakers: [] },
      ],
    };
    await vi.waitFor(() => {
      const canvases = el.shadowRoot?.querySelectorAll("canvas") ?? [];
      expect(canvases.length).toBe(2);
    });
    const canvases = [...(el.shadowRoot?.querySelectorAll("canvas") ?? [])];
    for (const canvas of canvases) {
      expect(canvas.getAttribute("role")).toBe("img");
      expect(canvas.getAttribute("aria-label")).toBeTruthy();
    }
    el.remove();
  });

  it("recomputes columns when the ResizeObserver callback fires", async () => {
    const el = document.createElement("comic-strip-test") as HTMLElement & {
      packs: string[];
      document: unknown;
      columns: number;
    };
    document.body.append(el);
    el.packs = ["/pack/"];
    el.document = {
      version: 1,
      panels: [{ backdrop: "pastoral", bodies: [], speakers: [] }],
    };
    await vi.waitFor(() => {
      expect(el.shadowRoot?.querySelectorAll("canvas").length).toBe(1);
    });

    Object.defineProperty(el, "clientWidth", { value: 1200, configurable: true });
    expect(resizeCallback).toBeTruthy();
    resizeCallback!([], null as unknown as ResizeObserver);
    expect(el.columns).toBe(3);

    Object.defineProperty(el, "clientWidth", { value: 200, configurable: true });
    resizeCallback!([], null as unknown as ResizeObserver);
    expect(el.columns).toBe(1);

    el.remove();
  });

  // dev plan §13.4 (M13): an SSR placeholder image is a light-DOM child slotted
  // in via slot="placeholder", shown until the live canvases are ready, then
  // hidden — this is what lets a server-rendered PNG swap for the live strip
  // on hydration with no gap and no layout shift.
  it("hides the slotted placeholder and marks data-live once the live strip is built", async () => {
    const el = document.createElement("comic-strip-test") as HTMLElement & {
      packs: string[];
      document: unknown;
    };
    const placeholder = document.createElement("img");
    placeholder.slot = "placeholder";
    el.append(placeholder);
    document.body.append(el);

    expect(el.hasAttribute("data-live")).toBe(false);

    el.packs = ["/pack/"];
    el.document = { version: 1, panels: [{ backdrop: "pastoral", bodies: [], speakers: [] }] };

    await vi.waitFor(() => expect(el.hasAttribute("data-live")).toBe(true));
    el.remove();
  });
});
