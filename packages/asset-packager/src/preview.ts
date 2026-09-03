/**
 * The join preview: one composited NEUTRAL figure per character, on a plain
 * background, with the derived join point crossed and labelled.
 *
 * This exists because a wrong anchor produces a *valid* pack — the validator
 * cannot tell a chin from an eyebrow. A floating or buried head is obvious in
 * one glance at this image and invisible in the manifest (dev plan §14).
 *
 * The join arithmetic below is a deliberate local copy of `figureFor`'s two
 * lines in `@toonstrip/core` rather than a call into it: the preview needs the
 * offsets themselves, not a `Figure`, and the packager should not depend on
 * the renderer's pose-selection path to draw a diagnostic.
 */

import type { PackedPart } from "@toonstrip/core";
import { createCanvas, loadImage } from "./image.js";
import type { PackedCharacter } from "./pack.js";

const CARD = { width: 240, height: 300, pad: 16 };

function neutral(parts: PackedPart[]): PackedPart | undefined {
  return parts.find((p) => p.emotion === "NEUTRAL") ?? parts[0];
}

export async function renderJoinPreview(packed: PackedCharacter[]): Promise<Buffer> {
  const columns = Math.min(4, Math.max(1, packed.length));
  const rows = Math.ceil(packed.length / columns);
  const canvas = createCanvas(columns * CARD.width, rows * CARD.height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f4f1ea";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const [i, character] of packed.entries()) {
    const originX = (i % columns) * CARD.width;
    const originY = Math.floor(i / columns) * CARD.height;
    ctx.strokeStyle = "#d8d2c4";
    ctx.strokeRect(originX + 0.5, originY + 0.5, CARD.width - 1, CARD.height - 1);

    const face = neutral(character.avatar.faces);
    const torso = neutral(character.avatar.torsos);
    ctx.fillStyle = "#111";
    ctx.font = "12px sans-serif";
    if (!face || !torso) {
      ctx.fillText(`${character.id}: no NEUTRAL pair`, originX + CARD.pad, originY + CARD.pad + 12);
      continue;
    }

    const xOffset = torso.cx + face.cxDelta - face.cx;
    const yOffset = torso.cy + face.cyDelta - face.cy;
    const left = Math.min(0, xOffset);
    const top = Math.min(0, yOffset);
    const width = Math.max(torso.figure.width, xOffset + face.figure.width) - left;
    const height = Math.max(torso.figure.height, yOffset + face.figure.height) - top;

    const scale = Math.min(
      (CARD.width - CARD.pad * 2) / width,
      (CARD.height - CARD.pad * 2 - 20) / height,
      1,
    );
    const drawX = originX + (CARD.width - width * scale) / 2;
    const drawY = originY + CARD.pad + 16;

    const sheet = await loadImage(character.sheet);
    const place = (part: PackedPart, px: number, py: number) =>
      ctx.drawImage(
        sheet,
        part.figure.x, part.figure.y, part.figure.width, part.figure.height,
        drawX + px * scale, drawY + py * scale,
        part.figure.width * scale, part.figure.height * scale,
      );

    const facePos = { x: xOffset - left, y: yOffset - top };
    const torsoPos = { x: -left, y: -top };
    if (character.avatar.torsoFirst) {
      place(torso, torsoPos.x, torsoPos.y);
      place(face, facePos.x, facePos.y);
    } else {
      place(face, facePos.x, facePos.y);
      place(torso, torsoPos.x, torsoPos.y);
    }

    // The join itself: where the torso says its neck is.
    const jx = drawX + (torsoPos.x + torso.cx) * scale;
    const jy = drawY + (torsoPos.y + torso.cy) * scale;
    ctx.strokeStyle = "#d81b60";
    ctx.beginPath();
    ctx.moveTo(jx - 8, jy);
    ctx.lineTo(jx + 8, jy);
    ctx.moveTo(jx, jy - 8);
    ctx.lineTo(jx, jy + 8);
    ctx.stroke();

    ctx.fillStyle = "#111";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(character.id, originX + CARD.pad, originY + CARD.pad + 4);
    ctx.font = "10px sans-serif";
    ctx.fillStyle = "#555";
    const origins = `face: ${character.joins.face?.origin ?? "-"} / torso: ${character.joins.torso?.origin ?? "-"}`;
    ctx.fillText(origins, originX + CARD.pad, originY + CARD.height - CARD.pad + 4);
  }

  return canvas.encode("png");
}
