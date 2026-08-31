/**
 * A `Cast` built from the real `@toonstrip/pack-comic-chat` default pack
 * (M2) — the ported roster's decoded sprite sheets and a real backdrop,
 * replacing the M1 placeholder cast for the milestone's actual
 * render-to-PNG proof.
 */
import { loadImage } from "@napi-rs/canvas";
import { loadCastManifest } from "@toonstrip/pack-comic-chat";
import type { CastManifest, PackedAvatar } from "../../src/cast-manifest.js";
import type { Cast } from "../../src/figure.js";

export async function buildRealCast(characterIds: string[], backdropIds: string[]): Promise<Cast> {
  const manifest = loadCastManifest();

  const cast: Record<string, PackedAvatar> = {};
  const sheets = new Map<string, Awaited<ReturnType<typeof loadImage>>>();
  for (const id of characterIds) {
    const avatar = manifest.cast[id];
    if (!avatar) throw new Error(`pack-comic-chat has no character "${id}"`);
    cast[id] = avatar;
    sheets.set(id, await loadImage(avatar.sheet));
  }

  const backdrops = new Map<string, Awaited<ReturnType<typeof loadImage>>>();
  const backdropEntries = manifest.backdrops.filter((b) => backdropIds.includes(b.id));
  for (const b of backdropEntries) {
    backdrops.set(b.id, await loadImage(b.file));
  }
  for (const id of backdropIds) {
    if (!backdrops.has(id)) throw new Error(`pack-comic-chat has no backdrop "${id}"`);
  }

  const trimmed: CastManifest = { version: 1, cast, backdrops: backdropEntries };
  return { manifest: trimmed, sheets, backdrops };
}
