/**
 * Browser-side counterpart to `@toonstrip/pack-comic-chat`'s `loadCastManifest`
 * (fs-based, Node-only). A pack here is a URL — `pack.json` plus the
 * character/backdrop files it points at, fetched over HTTP rather than read
 * off disk — assembling the same `Cast` shape `@toonstrip/core`'s `renderPanel`
 * consumes either way (see NOTES.md "M3": this loader is new work, not a port).
 */
import type { Cast, CastManifest, PackedAvatar, PackedBackdrop, SheetImage } from "@toonstrip/core";

interface PackJson {
  name: string;
  version: string;
  license: string;
  characters: { id: string; name: string; manifest: string; sheet: string }[];
  backdrops: PackedBackdrop[];
}

/** Resolves `path` against `baseUrl`; `baseUrl` may itself be relative (e.g. "/packs/comic-chat/"). */
function resolveUrl(baseUrl: string, path: string): string {
  const withSlash = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const absoluteBase = new URL(withSlash, document.baseURI);
  return new URL(path, absoluteBase).toString();
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

function loadImage(url: string): Promise<SheetImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load image ${url}`));
    img.src = url;
  });
}

/**
 * Loads exactly the characters/backdrops a document needs from a list of
 * registered pack base URLs. Per the dev plan §6, an id declared by more than
 * one registered pack is a hard error, not a silent first-match — collisions
 * are a pack-authoring mistake the caller needs to know about immediately.
 */
export async function loadCastFromPacks(
  packBaseUrls: readonly string[],
  characterIds: readonly string[],
  backdropIds: readonly string[],
): Promise<Cast> {
  if (packBaseUrls.length === 0 && (characterIds.length > 0 || backdropIds.length > 0)) {
    throw new Error(
      "comic-strip: document references characters/backdrops but no packs are registered (set .packs)",
    );
  }

  const packs = await Promise.all(
    packBaseUrls.map(async (baseUrl) => ({
      baseUrl,
      json: await fetchJson<PackJson>(resolveUrl(baseUrl, "pack.json")),
    })),
  );

  const cast: Record<string, PackedAvatar> = {};
  const sheets = new Map<string, SheetImage>();
  for (const id of characterIds) {
    const matches = packs
      .map((pack) => ({ pack, entry: pack.json.characters.find((c) => c.id === id) }))
      .filter((m): m is { pack: (typeof packs)[number]; entry: NonNullable<typeof m.entry> } => !!m.entry);
    if (matches.length === 0) {
      throw new Error(`comic-strip: no registered pack declares character "${id}"`);
    }
    if (matches.length > 1) {
      throw new Error(
        `comic-strip: character "${id}" is declared by more than one registered pack ` +
          `(${matches.map((m) => m.pack.baseUrl).join(", ")})`,
      );
    }
    const { pack, entry } = matches[0];
    const avatar = await fetchJson<PackedAvatar>(resolveUrl(pack.baseUrl, entry.manifest));
    const sheetUrl = resolveUrl(pack.baseUrl, entry.sheet);
    cast[id] = { ...avatar, sheet: sheetUrl };
    sheets.set(id, await loadImage(sheetUrl));
  }

  const backdrops = new Map<string, SheetImage>();
  const backdropEntries: PackedBackdrop[] = [];
  for (const id of backdropIds) {
    const matches = packs
      .map((pack) => ({ pack, entry: pack.json.backdrops.find((b) => b.id === id) }))
      .filter((m): m is { pack: (typeof packs)[number]; entry: NonNullable<typeof m.entry> } => !!m.entry);
    if (matches.length === 0) {
      throw new Error(`comic-strip: no registered pack declares backdrop "${id}"`);
    }
    if (matches.length > 1) {
      throw new Error(
        `comic-strip: backdrop "${id}" is declared by more than one registered pack ` +
          `(${matches.map((m) => m.pack.baseUrl).join(", ")})`,
      );
    }
    const { pack, entry } = matches[0];
    const fileUrl = resolveUrl(pack.baseUrl, entry.file);
    backdropEntries.push({ ...entry, file: fileUrl });
    backdrops.set(id, await loadImage(fileUrl));
  }

  const manifest: CastManifest = { version: 1, cast, backdrops: backdropEntries };
  return { manifest, sheets, backdrops };
}
