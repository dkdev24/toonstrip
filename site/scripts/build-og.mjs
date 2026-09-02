// Renders public/og.png (1200×630): the hero strip on paper with the wordmark.
// Uses @toonstrip/core in Node via @napi-rs/canvas, the same renderer the
// browser uses. Run manually after changing the hero strip: `pnpm og`.
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { writeFileSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { layoutStrip, renderPanel, selectFigures } from "@toonstrip/core";
import { loadCastManifest } from "@toonstrip/pack-comic-chat";

const require = createRequire(import.meta.url);
const doc = JSON.parse(readFileSync(new URL("../src/content/strips/hero.json", import.meta.url), "utf-8"));

const manifest = loadCastManifest();
const characters = [...new Set(doc.panels.flatMap((p) => p.bodies.map((b) => b.character)))];
const backdropIds = [...new Set(doc.panels.map((p) => p.backdrop))];
const sheets = new Map();
for (const id of characters) sheets.set(id, await loadImage(manifest.cast[id].sheet));
const backdrops = new Map();
for (const id of backdropIds) backdrops.set(id, await loadImage(manifest.backdrops.find((b) => b.id === id).file));
const cast = {
  manifest: { version: 1, cast: Object.fromEntries(characters.map((id) => [id, manifest.cast[id]])), backdrops: manifest.backdrops.filter((b) => backdropIds.includes(b.id)) },
  sheets,
  backdrops,
};

const W = 1200, H = 630, PAD = 48, GUTTER = 10;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext("2d");
ctx.fillStyle = "#FBF8F1";
ctx.fillRect(0, 0, W, H);

// Strip: three columns across the width.
const available = W - PAD * 2;
const layout = layoutStrip(available, { gutter: GUTTER });
const columns = Math.min(layout.columns, doc.panels.length);
const stripWidth = columns * layout.panelWidth + (columns - 1) * GUTTER;
const x0 = (W - stripWidth) / 2;
const y0 = 175;
const cycles = new Map();
doc.panels.forEach((panel, i) => {
  selectFigures(panel, cast, cycles);
  const frozen = new Map([...cycles].map(([k, v]) => [k, { ...v }]));
  const pc = createCanvas(layout.panelWidth, layout.panelHeight);
  const pctx = pc.getContext("2d");
  renderPanel(pctx, panel, cast, layout.panelWidth, layout.panelHeight, { cycles: frozen });
  ctx.drawImage(pc, x0 + i * (layout.panelWidth + GUTTER), y0);
});

// Wordmark + tagline.
ctx.fillStyle = "#F5C400";
ctx.fillRect(PAD, 62, 22, 22);
ctx.strokeStyle = "#1B1A17";
ctx.lineWidth = 4;
ctx.strokeRect(PAD, 62, 22, 22);
ctx.fillStyle = "#1B1A17";
const UI = "'Segoe UI', 'DM Sans', Helvetica, Arial, sans-serif";
ctx.font = `bold 44px ${UI}`;
ctx.textBaseline = "middle";
ctx.fillText("toonstrip", PAD + 36, 74);
ctx.font = `26px ${UI}`;
ctx.fillStyle = "#4A4740";
ctx.fillText("Comic strips from data, drawn live on your page.", PAD, 118);
ctx.font = "20px 'Cascadia Mono', 'JetBrains Mono', Consolas, monospace";
ctx.fillStyle = "#66625A";
ctx.textAlign = "right";
ctx.fillText("toonstrip.danielkimdev.com", W - PAD, 74);

writeFileSync(new URL("../public/og.png", import.meta.url), canvas.toBuffer("image/png"));
console.log("wrote public/og.png", W, "x", H, "columns", columns);
