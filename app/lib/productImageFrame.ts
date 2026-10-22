export type ImageBounds = { x: number; y: number; width: number; height: number };
const boundsCache = new Map<string, ImageBounds | null>();

export function productImageBounds(image: HTMLImageElement, src: string): ImageBounds | null {
  if (!image.complete || !image.naturalWidth) return null;
  if (boundsCache.has(src)) return boundsCache.get(src) ?? null;
  let bounds: ImageBounds | null = null;
  try {
    const canvas = document.createElement("canvas");
    const ratio = 160 / Math.max(image.naturalWidth, image.naturalHeight);
    canvas.width = Math.max(8, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(8, Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (context) {
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      bounds = whiteImageBounds(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
    }
  } catch {
    // Cross-origin or unreadable images keep the original presentation.
  }
  if (boundsCache.size >= 128) boundsCache.delete(boundsCache.keys().next().value!);
  boundsCache.set(src, bounds);
  return bounds;
}

/** Only reframe studio shots with an entirely white edge; lifestyle/detail shots retain their composition. */
export function whiteImageBounds(data: Uint8ClampedArray, width: number, height: number): ImageBounds | null {
  if (width < 8 || height < 8 || data.length !== width * height * 4) return null;
  const white = (x: number, y: number, threshold: number) => {
    const i = (y * width + x) * 4;
    return data[i + 3] < 12 || (data[i] >= threshold && data[i + 1] >= threshold && data[i + 2] >= threshold);
  };
  for (let x = 0; x < width; x++) if (!white(x, 0, 248) || !white(x, height - 1, 248)) return null;
  for (let y = 0; y < height; y++) if (!white(0, y, 248) || !white(width - 1, y, 248)) return null;
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (white(x, y, 248)) continue;
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (right < left || bottom < top) return null;
  // An isolated label on an otherwise white product isn't a reliable product silhouette.
  const fractionWidth = (right - left) / width, fractionHeight = (bottom - top) / height;
  if ((fractionWidth < 0.6 && fractionHeight < 0.45) || (fractionWidth < 0.25 && fractionHeight < 0.65)) return null;
  const marginX = Math.max(2, width * 0.035), marginY = Math.max(2, height * 0.035);
  left = Math.max(0, left - marginX); right = Math.min(width, right + 1 + marginX);
  top = Math.max(0, top - marginY); bottom = Math.min(height, bottom + 1 + marginY);
  return { x: left / width, y: top / height, width: (right - left) / width, height: (bottom - top) / height };
}

export function imageFrameTransform(bounds: ImageBounds, sourceWidth: number, sourceHeight: number, width: number, height: number): string {
  if (!sourceWidth || !sourceHeight || !width || !height) return "none";
  const fit = Math.min(width / sourceWidth, height / sourceHeight);
  const scale = Math.min(2, width * 0.94 / (bounds.width * sourceWidth * fit), height * 0.94 / (bounds.height * sourceHeight * fit));
  const x = (0.5 - bounds.x - bounds.width / 2) * sourceWidth * fit * scale;
  const y = (0.5 - bounds.y - bounds.height / 2) * sourceHeight * fit * scale;
  return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${scale.toFixed(4)})`;
}
