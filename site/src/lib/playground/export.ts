/**
 * Client-side PNG export and copy-out snippets (SITE_DEV_PLAN.md §6.4).
 *
 * The element releases off-screen panels, so export does not read its
 * canvases. Instead it re-renders every panel through `@toonstrip/core` with
 * the same cast loader and the same per-panel figure freeze the element uses
 * (`selectFigures` in document order, cycles copied per panel), so the export
 * matches what is on screen.
 */
import { copyCycles, layoutStrip, renderPanel, selectFigures, type Cast, type PoseCycle } from "@toonstrip/core";
import type { ComicStripDocument } from "@toonstrip/schema";

const GUTTER = 10;

export interface ExportOptions {
  /** Container width the strip is laid out for, in CSS px. */
  width: number;
  /** Backing-store scale (2 = retina). */
  scale?: number;
  transparent?: boolean;
  background?: string;
}

export async function renderStripPng(doc: ComicStripDocument, packUrls: string[], options: ExportOptions): Promise<Blob> {
  const characters = [...new Set(doc.panels.flatMap((p) => p.bodies.map((b) => b.character)))];
  const backdrops = [...new Set(doc.panels.filter((p) => !p.dark).map((p) => p.backdrop))];
  // Dynamic: the element package defines a custom element at import time, which
  // would throw during Astro's server prerender of this island.
  const { loadCastFromPacks } = await import("@toonstrip/element");
  const cast: Cast = await loadCastFromPacks(packUrls, characters, backdrops);

  const scale = options.scale ?? 2;
  const layout = layoutStrip(options.width, { gutter: GUTTER });
  const columns = Math.max(1, Math.min(layout.columns, doc.panels.length));
  const rows = Math.ceil(doc.panels.length / columns);
  const width = columns * layout.panelWidth + (columns - 1) * GUTTER;
  const height = rows * layout.panelHeight + (rows - 1) * GUTTER;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  if (!options.transparent) {
    ctx.fillStyle = options.background ?? "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }

  const cycles = new Map<string, PoseCycle>();
  const panelCanvas = document.createElement("canvas");
  panelCanvas.width = Math.round(layout.panelWidth * scale);
  panelCanvas.height = Math.round(layout.panelHeight * scale);
  const pctx = panelCanvas.getContext("2d")!;

  doc.panels.forEach((panel, index) => {
    selectFigures(panel, cast, cycles);
    const frozen = copyCycles(cycles);
    pctx.setTransform(scale, 0, 0, scale, 0, 0);
    pctx.clearRect(0, 0, layout.panelWidth, layout.panelHeight);
    renderPanel(pctx, panel, cast, layout.panelWidth, layout.panelHeight, { cycles: frozen });
    const col = index % columns;
    const row = Math.floor(index / columns);
    ctx.drawImage(panelCanvas, col * (layout.panelWidth + GUTTER), row * (layout.panelHeight + GUTTER), layout.panelWidth, layout.panelHeight);
  });

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/png"));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function astroSnippet(doc: ComicStripDocument, packs: string[]): string {
  return `---
import { ComicStrip } from "@toonstrip/astro";
import doc from "../content/strip.json"; // the JSON below
---
<ComicStrip document={doc} packs={${JSON.stringify(packs)}} client:visible />

<!-- strip.json -->
${JSON.stringify(doc, null, 2)}
`;
}

export function htmlSnippet(doc: ComicStripDocument, packs: string[]): string {
  return `<comic-strip id="strip"></comic-strip>
<script type="module">
  import "@toonstrip/element";
  const strip = document.getElementById("strip");
  strip.packs = ${JSON.stringify(packs.map((p) => `/packs/${p}/`))};
  strip.document = ${JSON.stringify(doc, null, 2).replace(/\n/g, "\n  ")};
</script>
`;
}
