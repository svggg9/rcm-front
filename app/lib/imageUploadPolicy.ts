/** Raster originals keep their dimensions; these checks do not decode or resize the file. */
export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 48_000_000;
export const MAX_IMAGE_EDGE = 16384;
export const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PHOTO_FILE_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

/** A wordmark is a separate, small static graphic, not a product photograph. */
export const MAX_WORDMARK_UPLOAD_BYTES = 2 * 1024 * 1024;
export const WORDMARK_MIME_TYPES = ["image/svg+xml", "image/webp"] as const;

type ImageUploadMetadataOptions = {
  maxBytes?: number;
  allowedMimeTypes?: readonly string[];
  emptyMessage?: string;
  typeMessage?: string;
  sizeMessage?: string;
};

/** Metadata is an early UI check; the server must independently validate bytes and content. */
export function getImageUploadMetadataError(
  file: { size: number; type: string },
  options: ImageUploadMetadataOptions = {},
): string | null {
  const allowedMimeTypes: readonly string[] = options.allowedMimeTypes ?? PHOTO_MIME_TYPES;
  if (!allowedMimeTypes.includes(file.type)) {
    return options.typeMessage ?? "Разрешены только JPEG, PNG и WebP";
  }
  if (!Number.isSafeInteger(file.size) || file.size <= 0) {
    return options.emptyMessage ?? "Выберите непустую фотографию";
  }
  if (file.size > (options.maxBytes ?? MAX_IMAGE_UPLOAD_BYTES)) {
    return options.sizeMessage ?? "Фото должно быть не больше 10 МБ";
  }
  return null;
}
