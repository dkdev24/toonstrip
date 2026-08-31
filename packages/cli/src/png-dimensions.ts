import { readFileSync } from "node:fs";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Reads a PNG's declared width/height straight out of its IHDR chunk. */
export function readPngDimensions(path: string): { width: number; height: number } {
  const buf = readFileSync(path);
  if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error(`${path}: not a PNG file`);
  }
  // IHDR is always the first chunk: 8-byte signature, 4-byte length, 4-byte
  // "IHDR" tag, then width (4 bytes) and height (4 bytes), both big-endian.
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}
