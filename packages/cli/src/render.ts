/**
 * `toonstrip render <doc.json> --out strip.png` — the build-time static
 * fallback (TOONSTRIP_DEV_PLAN.md §8). Renders a ComicStripDocument to one
 * PNG through `@toonstrip/core` in Node with `@napi-rs/canvas`, laying panels
 * out with the same `layoutStrip` policy the browser element uses for the
 * given container width, and freezing figure selection per panel in document
 * order exactly as the element does (so a PNG matches the live strip).
 */
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { createCanvas, GlobalFonts, loadImage, type Image } from "@napi-rs/canvas";
import { copyCycles, layoutStrip, renderPanel, selectFigures, type Cast, type CastManifest, type PackedAvatar, type PackedBackdrop, type PoseCycle } from "@toonstrip/core";
import { validateDocument, type ComicStripDocument } from "@toonstrip/schema";

const GUTTER = 10;

export interface RenderOptions {
  /** Container width in CSS px; decides the column count. Default 1200. */
  width?: number;
  /** Backing-store scale. Default 2. */
  scale?: number;
  /** Pack directories (each containing pack.json). Default: the installed `@toonstrip/pack-comic-chat`. */
  packs?: string[];
  transparent?: boolean;
  background?: string;
  /**
   * Font files (TTF/OTF/WOFF2) to register before drawing, e.g. Noto Sans KR
   * for Hangul dialogue. Without one, text falls back to the system's faces
   * (see `COMIC_FONT_FAMILY` in `@toonstrip/core`).
   */
  fonts?: string[];
}

export interface RenderResult {
  png: Buffer;
  /** PNG pixel dimensions (post-`scale` backing-store size — the file's actual size). */
  width: number;
  height: number;
  /** CSS-pixel layout dimensions (pre-`scale`) — what an `<img>` embedding this PNG should be sized to (dev plan §13.4's SSR placeholder), so a high-`scale` render doesn't display 2x too large. */
  cssWidth: number;
  cssHeight: number;
  columns: number;
}

interface PackJson {
  name: string;
  characters: { id: string; manifest: string; sheet: string }[];
  backdrops: { id: string; file: string; width: number; height: number }[];
}

/** Resolve the default pack when none is given. */
export function defaultPackDir(): string {
  const require = createRequire(import.meta.url);
  return dirname(require.resolve("@toonstrip/pack-comic-chat/package.json"));
}

async function loadCast(packDirs: string[], characterIds: string[], backdropIds: string[]): Promise<Cast> {
  const cast: Record<string, PackedAvatar> = {};
  const backdropsManifest: PackedBackdrop[] = [];
  const sheets = new Map<string, Image>();
  const backdrops = new Map<string, Image>();
  const owner = new Map<string, string>();

  for (const dir of packDirs) {
    const packPath = join(dir, "pack.json");
    if (!existsSync(packPath)) throw new Error(`no pack.json in ${dir}`);
    const pack = JSON.parse(readFileSync(packPath, "utf-8")) as PackJson;
    for (const c of pack.characters) {
      if (owner.has(`c:${c.id}`)) throw new Error(`character "${c.id}" is declared by both ${owner.get(`c:${c.id}`)} and ${pack.name}`);
      owner.set(`c:${c.id}`, pack.name);
      if (!characterIds.includes(c.id)) continue;
      const avatar = JSON.parse(readFileSync(join(dir, c.manifest), "utf-8")) as PackedAvatar;
      const sheetPath = join(dir, c.sheet);
      cast[c.id] = { ...avatar, sheet: sheetPath };
      sheets.set(c.id, await loadImage(sheetPath));
    }
    for (const b of pack.backdrops) {
      if (owner.has(`b:${b.id}`)) throw new Error(`backdrop "${b.id}" is declared by both ${owner.get(`b:${b.id}`)} and ${pack.name}`);
      owner.set(`b:${b.id}`, pack.name);
      if (!backdropIds.includes(b.id)) continue;
      const file = join(dir, b.file);
      backdropsManifest.push({ ...b, file });
      backdrops.set(b.id, await loadImage(file));
    }
  }
  for (const id of characterIds) if (!cast[id]) throw new Error(`unknown character "${id}" (packs: ${packDirs.join(", ")})`);
  for (const id of backdropIds) if (!backdrops.has(id)) throw new Error(`unknown backdrop "${id}" (packs: ${packDirs.join(", ")})`);

  const manifest: CastManifest = { version: 1, cast, backdrops: backdropsManifest };
  // @napi-rs/canvas images satisfy the drawImage contract; its types are not the DOM's.
  return { manifest, sheets: sheets as unknown as Cast["sheets"], backdrops: backdrops as unknown as Cast["backdrops"] };
}

export async function renderDocument(input: unknown, options: RenderOptions = {}): Promise<RenderResult> {
  const doc: ComicStripDocument = validateDocument(input);
  const width = options.width ?? 1200;
  const scale = options.scale ?? 2;
  for (const font of options.fonts ?? []) {
    const path = isAbsolute(font) ? font : resolve(font);
    if (!existsSync(path)) throw new Error(`font file not found: ${path}`);
    GlobalFonts.registerFromPath(path);
  }
  const packDirs = (options.packs?.length ? options.packs : [defaultPackDir()]).map((p) => (isAbsolute(p) ? p : resolve(p)));

  const characterIds = [...new Set(doc.panels.flatMap((p) => p.bodies.map((b) => b.character)))];
  const backdropIds = [...new Set(doc.panels.filter((p) => !p.dark).map((p) => p.backdrop))];
  const cast = await loadCast(packDirs, characterIds, backdropIds);

  const layout = layoutStrip(width, { gutter: GUTTER });
  const columns = Math.max(1, Math.min(layout.columns, doc.panels.length));
  const rows = Math.ceil(doc.panels.length / columns);
  const outW = columns * layout.panelWidth + (columns - 1) * GUTTER;
  const outH = rows * layout.panelHeight + (rows - 1) * GUTTER;

  const canvas = createCanvas(Math.round(outW * scale), Math.round(outH * scale));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  if (!options.transparent) {
    ctx.fillStyle = options.background ?? "#ffffff";
    ctx.fillRect(0, 0, outW, outH);
  }

  const cycles = new Map<string, PoseCycle>();
  const panelCanvas = createCanvas(Math.round(layout.panelWidth * scale), Math.round(layout.panelHeight * scale));
  const pctx = panelCanvas.getContext("2d");
  doc.panels.forEach((panel, index) => {
    selectFigures(panel, cast, cycles);
    const frozen = copyCycles(cycles);
    pctx.setTransform(scale, 0, 0, scale, 0, 0);
    pctx.clearRect(0, 0, layout.panelWidth, layout.panelHeight);
    renderPanel(pctx as unknown as CanvasRenderingContext2D, panel, cast, layout.panelWidth, layout.panelHeight, { cycles: frozen });
    const col = index % columns;
    const row = Math.floor(index / columns);
    ctx.drawImage(panelCanvas, col * (layout.panelWidth + GUTTER), row * (layout.panelHeight + GUTTER), layout.panelWidth, layout.panelHeight);
  });

  return { png: canvas.toBuffer("image/png"), width: canvas.width, height: canvas.height, cssWidth: outW, cssHeight: outH, columns };
}

export interface PlaceholderImage {
  /** `data:image/png;base64,...` URI, ready for an `<img src>`. */
  src: string;
  width: number;
  height: number;
}

/**
 * An SSR placeholder image for `@toonstrip/react`'s `<ComicStrip placeholder>`
 * (dev plan §13.4): renders the document to a PNG via `renderDocument` and
 * packages it as a data URI sized in CSS pixels, so an `<img>` embedding it
 * displays at the right size regardless of `options.scale`. Pulls in
 * `@napi-rs/canvas` — call only from server-only code.
 */
export async function renderPlaceholder(input: unknown, options: RenderOptions = {}): Promise<PlaceholderImage> {
  const { png, cssWidth, cssHeight } = await renderDocument(input, options);
  return { src: `data:image/png;base64,${png.toString("base64")}`, width: cssWidth, height: cssHeight };
}
