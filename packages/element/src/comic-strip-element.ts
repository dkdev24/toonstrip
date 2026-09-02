/**
 * `<comic-strip>` — the embed primitive (dev plan §5). Ported from
 * `grues-in-comic`'s `web/src/comic-view.ts` mechanism (canvas pool,
 * ResizeObserver relayout, devicePixelRatio backing store, IntersectionObserver
 * visibility gating, per-panel a11y), with the turn/session/incremental-append
 * machinery stripped out: a `ComicStripDocument` here is authored data handed
 * over whole, not a stream of panels a game emits (dev plan §0's non-goals).
 */
import { BALLOON_FONT, type Cast, layoutStrip, type PoseCycle, renderPanel, selectFigures, TITLE_FONT } from "@toonstrip/core";
import { validateDocument, type ComicStripDocument, type Panel } from "@toonstrip/schema";
import { describePanel } from "./describe.js";
import { loadCastFromPacks } from "./load-pack.js";

const GUTTER = 10;

interface Slot {
  canvas: HTMLCanvasElement;
  panel: Panel;
  painted: boolean;
}

function copyCycles(cycles: ReadonlyMap<string, PoseCycle>): Map<string, PoseCycle> {
  return new Map([...cycles].map(([id, cycle]) => [id, { ...cycle }]));
}

function characterIdsOf(doc: ComicStripDocument): string[] {
  return [...new Set(doc.panels.flatMap((panel) => panel.bodies.map((body) => body.character)))];
}

/** Every string the renderer will draw, so `document.fonts.load` fetches only the subsets it needs. */
function textOf(doc: ComicStripDocument): string {
  return doc.panels
    .flatMap((panel) => [panel.roomTitle ?? "", ...panel.speakers.map((line) => line.text)])
    .join(" ");
}

/**
 * Wait for the comic fonts to be usable on a canvas. A canvas draws with
 * whatever is loaded at that instant and never repaints on its own, so a
 * webfont the page declares (Noto Sans KR for Hangul, say) would be missed
 * on first paint. `fonts.load` resolves immediately for families the page
 * does not declare, so this costs nothing on pages without webfonts.
 */
async function ensureFonts(text: string): Promise<void> {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts) return;
  try {
    await Promise.all([fonts.load(BALLOON_FONT, text), fonts.load(TITLE_FONT, text)]);
  } catch {
    // An undeclared or failing face is not fatal; the fallback stack draws.
  }
}

function backdropIdsOf(doc: ComicStripDocument): string[] {
  return [...new Set(doc.panels.filter((panel) => !panel.dark).map((panel) => panel.backdrop))];
}

const STYLE = `
:host { display: block; }
.strip {
  display: grid;
  gap: ${GUTTER}px;
  justify-content: center;
}
.panel { display: block; background: #111; }
.notice { color: #b00; font: 14px sans-serif; }
`;

export class ComicStripElement extends HTMLElement {
  #root: ShadowRoot;
  #strip: HTMLDivElement;
  #resizeObserver: ResizeObserver;
  #visibilityObserver: IntersectionObserver | null = null;
  #doc: ComicStripDocument | null = null;
  #packs: string[] = [];
  #cast: Cast | null = null;
  #slots: Slot[] = [];
  #frozen = new WeakMap<Panel, Map<string, PoseCycle>>();
  #size = { width: 400, height: 340 };
  #columns = 1;
  #buildToken = 0;
  #onFontsLoaded = (): void => this.#repaint();

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = STYLE;
    this.#strip = document.createElement("div");
    this.#strip.className = "strip";
    this.#root.append(style, this.#strip);
    this.#resizeObserver = new ResizeObserver(() => this.#relayout());
    // A face that finishes loading after first paint (declared late, or
    // fetched by another element) repaints every painted panel.
    (document as Document & { fonts?: FontFaceSet }).fonts?.addEventListener("loadingdone", this.#onFontsLoaded);
  }

  static get observedAttributes(): string[] {
    return ["src"];
  }

  connectedCallback(): void {
    this.#resizeObserver.observe(this);
    const src = this.getAttribute("src");
    if (src) this.#loadFromSrc(src);
  }

  disconnectedCallback(): void {
    this.#resizeObserver.disconnect();
    this.#visibilityObserver?.disconnect();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (name === "src" && newValue && newValue !== oldValue) this.#loadFromSrc(newValue);
  }

  /** The strip to render, as data (validated at the boundary). */
  get document(): ComicStripDocument | null {
    return this.#doc;
  }

  set document(doc: ComicStripDocument | null) {
    this.#doc = doc ? validateDocument(doc) : null;
    void this.#rebuild();
  }

  /** Base URLs of registered asset packs, searched in the order given. */
  get packs(): string[] {
    return this.#packs;
  }

  set packs(packs: string[]) {
    this.#packs = [...packs];
    void this.#rebuild();
  }

  async #loadFromSrc(src: string): Promise<void> {
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error(`fetch ${src} failed: ${res.status} ${res.statusText}`);
      this.document = validateDocument(await res.json());
    } catch (err) {
      this.#fail(err instanceof Error ? err.message : String(err));
    }
  }

  #fail(message: string): void {
    this.#strip.replaceChildren();
    const notice = document.createElement("p");
    notice.className = "notice";
    notice.textContent = message;
    this.#strip.append(notice);
    console.error("comic-strip:", message);
  }

  async #rebuild(): Promise<void> {
    const token = ++this.#buildToken;
    this.#visibilityObserver?.disconnect();
    this.#slots = [];
    this.#strip.replaceChildren();
    this.#cast = null;
    if (!this.#doc) return;

    let cast: Cast;
    try {
      cast = await loadCastFromPacks(this.#packs, characterIdsOf(this.#doc), backdropIdsOf(this.#doc));
    } catch (err) {
      if (token === this.#buildToken) this.#fail(err instanceof Error ? err.message : String(err));
      return;
    }
    if (token !== this.#buildToken) return; // superseded by a later document/packs set
    await ensureFonts(textOf(this.#doc));
    if (token !== this.#buildToken) return;
    this.#cast = cast;

    // Body selection happens once, in document order, and is frozen per panel
    // so a resize repaint reproduces the same figures rather than re-rolling
    // pose cycles every time (mirrors comic-view.ts's `stage`/`frozen`).
    const cycles = new Map<string, PoseCycle>();
    for (const panel of this.#doc.panels) {
      selectFigures(panel, cast, cycles);
      this.#frozen.set(panel, copyCycles(cycles));
    }

    this.#size = this.#measure();
    this.#visibilityObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const slot = this.#slots.find((s) => s.canvas === entry.target);
          if (!slot) continue;
          if (entry.isIntersecting) this.#paint(slot);
          else this.#release(slot);
        }
      },
      // No internal scroll pane here (unlike the source app's fixed-height
      // strip) — this element assumes the host page scrolls, so visibility is
      // relative to the viewport (root: null), not a container this owns.
      { root: null, rootMargin: "100% 0px" },
    );

    for (const panel of this.#doc.panels) {
      const canvas = document.createElement("canvas");
      canvas.className = "panel";
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", describePanel(panel));
      canvas.width = 0;
      canvas.height = 0;
      const slot: Slot = { canvas, panel, painted: false };
      this.#resizeSlot(slot);
      this.#strip.append(canvas);
      this.#slots.push(slot);
      this.#visibilityObserver.observe(canvas);
    }
  }

  #measure(): { width: number; height: number } {
    const style = getComputedStyle(this);
    const inner =
      (this.clientWidth || this.getBoundingClientRect().width) -
      parseFloat(style.paddingLeft || "0") -
      parseFloat(style.paddingRight || "0");
    const layout = layoutStrip(inner, { gutter: GUTTER });
    this.#strip.style.gridTemplateColumns = `repeat(${layout.columns}, ${layout.panelWidth}px)`;
    this.#columns = layout.columns;
    return { width: layout.panelWidth, height: layout.panelHeight };
  }

  #resizeSlot(slot: Slot): void {
    slot.canvas.style.width = `${this.#size.width}px`;
    slot.canvas.style.height = `${this.#size.height}px`;
  }

  #paint(slot: Slot): void {
    if (!this.#cast || slot.painted) return;
    const ratio = window.devicePixelRatio || 1;
    const { width, height } = this.#size;
    slot.canvas.width = Math.round(width * ratio);
    slot.canvas.height = Math.round(height * ratio);
    const ctx = slot.canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    renderPanel(ctx, slot.panel, this.#cast, width, height, {
      cycles: copyCycles(this.#frozen.get(slot.panel) ?? new Map()),
    });
    slot.painted = true;
  }

  #release(slot: Slot): void {
    if (!slot.painted) return;
    slot.canvas.width = 0;
    slot.canvas.height = 0;
    slot.painted = false;
  }

  #relayout(): void {
    if (!this.#cast) return;
    this.#size = this.#measure();
    for (const slot of this.#slots) this.#resizeSlot(slot);
    this.#repaint();
  }

  /** Repaint every panel that is currently painted, at the current size. */
  #repaint(): void {
    if (!this.#cast) return;
    for (const slot of this.#slots) {
      if (slot.painted) {
        slot.painted = false;
        this.#paint(slot);
      }
    }
  }

  /** Column count as of the last layout pass — exposed for tests/consumers. */
  get columns(): number {
    return this.#columns;
  }
}

export function registerComicStripElement(tagName = "comic-strip"): void {
  if (!customElements.get(tagName)) customElements.define(tagName, ComicStripElement);
}
