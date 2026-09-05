export interface SpriteSource {
  thumb: { width: number; height: number; x: number; y: number };
  sheetUrl: string;
  sheetWidth: number;
  sheetHeight: number;
}

/**
 * CSS to crop a character/backdrop thumbnail out of its pack sheet via
 * `background-position`, scaled to `size` px on the thumb's longer edge
 * (never upscaled beyond 2x, so pixels stay crisp).
 */
export function spriteCropStyle(source: SpriteSource, size: number): string {
  const scale = Math.min(size / Math.max(source.thumb.width, source.thumb.height), 2);
  return [
    `width:${Math.round(source.thumb.width * scale)}px`,
    `height:${Math.round(source.thumb.height * scale)}px`,
    `background-image:url(${source.sheetUrl})`,
    `background-size:${Math.round(source.sheetWidth * scale)}px ${Math.round(source.sheetHeight * scale)}px`,
    `background-position:-${Math.round(source.thumb.x * scale)}px -${Math.round(source.thumb.y * scale)}px`,
  ].join(";");
}
