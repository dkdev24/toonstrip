// Build-time tool, not part of the published pack runtime (see NOTICE / README).
// Decodes the three original Comic Chat backdrop .bmp files (4bpp, RLE4-compressed
// Windows DIBs) into plain PNGs for the pack. Ported minimally from
// grues-in-comic's art/src/{reader,image,format}.ts (AIF_DIB path only — these are
// bare .bmp files, not .avb records, so no palette/mask variants beyond RLE4 apply).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createCanvas } from "@napi-rs/canvas";

const BI_RLE8 = 1;
const BI_RLE4 = 2;

class Reader {
  constructor(bytes, pos = 0) {
    this.bytes = bytes;
    this.pos = pos;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  u8() {
    return this.bytes[this.pos++];
  }
  u16() {
    const v = this.view.getUint16(this.pos, true);
    this.pos += 2;
    return v;
  }
  u32() {
    const v = this.view.getUint32(this.pos, true);
    this.pos += 4;
    return v;
  }
  i32() {
    const v = this.view.getInt32(this.pos, true);
    this.pos += 4;
    return v;
  }
}

function readBmih(r) {
  const width = r.i32();
  const height = r.i32();
  r.u16(); // biPlanes
  const bits = r.u16();
  const compression = r.u32();
  r.u32(); // biSizeImage
  r.u32(); // biXPelsPerMeter
  r.u32(); // biYPelsPerMeter
  const colorsUsed = r.u32();
  r.u32(); // biClrImportant
  return { width, height, bits, compression, colorsUsed };
}

function decodeRle(data, width, height, bits) {
  const rows = new Uint8Array(width * height);
  let x = 0, y = 0, p = 0;
  const put = (v) => {
    if (x < width && y < height) rows[(height - 1 - y) * width + x] = v;
    x++;
  };
  while (p < data.length - 1 && y < height) {
    const n = data[p];
    const v = data[p + 1];
    p += 2;
    if (n) {
      for (let i = 0; i < n; i++) {
        if (x >= width) break;
        put(bits === 8 ? v : i % 2 === 0 ? v >> 4 : v & 0xf);
      }
    } else if (v === 0) {
      x = 0;
      y++;
    } else if (v === 1) {
      break;
    } else if (v === 2) {
      x += data[p];
      y += data[p + 1];
      p += 2;
    } else if (bits === 8) {
      for (let i = 0; i < v; i++) put(data[p + i]);
      p += v + (v & 1);
    } else {
      for (let i = 0; i < v; i++) {
        const b = data[p + (i >> 1)];
        put(i % 2 === 0 ? b >> 4 : b & 0xf);
      }
      const nb = (v + 1) >> 1;
      p += nb + (nb & 1);
    }
  }
  return rows;
}

function decodeBmpToRgba(bytes) {
  const r = new Reader(bytes);
  if (r.u8() !== 0x42 || r.u8() !== 0x4d) throw new Error("not a BMP");
  r.u32(); // bfSize
  r.u32(); // bfReserved
  const bitsOffset = r.u32();
  const headerSize = r.u32();
  if (headerSize !== 40) throw new Error(`unsupported DIB header ${headerSize}`);
  const info = readBmih(r);
  const ncol = info.colorsUsed || (info.bits <= 8 ? 1 << info.bits : 0);
  const palette = [];
  for (let i = 0; i < ncol; i++) {
    const b = r.u8(), g = r.u8(), rr = r.u8();
    r.u8(); // reserved
    palette.push([rr, g, b]);
  }
  const data = bytes.subarray(bitsOffset);
  const height = Math.abs(info.height);
  const width = info.width;
  if (info.compression !== BI_RLE4 && info.compression !== BI_RLE8) {
    throw new Error(`expected RLE4/RLE8, got compression ${info.compression}`);
  }
  const indices = decodeRle(data, width, height, info.bits);
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const [rr, gg, bb] = palette[indices[i]] ?? [0, 0, 0];
    rgba[i * 4] = rr;
    rgba[i * 4 + 1] = gg;
    rgba[i * 4 + 2] = bb;
    rgba[i * 4 + 3] = 255;
  }
  return { width, height, rgba };
}

const SOURCE_DIR = new URL(
  "../../../../grues-in-comic/original-projects/comic-chat/v1.0-pre-modern/comicart/backdrop/",
  import.meta.url,
);
const OUT_DIR = new URL("../backdrops/", import.meta.url);
mkdirSync(OUT_DIR, { recursive: true });

const backdrops = [];
for (const id of ["field", "pastoral", "room8bs"]) {
  const bytes = new Uint8Array(readFileSync(new URL(`${id}.bmp`, SOURCE_DIR)));
  const { width, height, rgba } = decodeBmpToRgba(bytes);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(width, height);
  imageData.data.set(rgba);
  ctx.putImageData(imageData, 0, 0);
  const png = canvas.toBuffer("image/png");
  writeFileSync(new URL(`${id}.png`, OUT_DIR), png);
  backdrops.push({ id, file: `backdrops/${id}.png`, width, height });
  console.log(`${id}: ${width}x${height} -> ${png.length} bytes`);
}
writeFileSync(
  new URL("../backdrops.json", OUT_DIR),
  JSON.stringify(backdrops, null, 2) + "\n",
);
