import { getImageUploadMetadataError, MAX_IMAGE_EDGE, MAX_IMAGE_PIXELS } from "./imageUploadPolicy";

export const PRODUCT_PHOTO_COUNT_ERROR = "Для модерации нужно от 3 до 10 фото товара";
export const validProductPhotoCount = (count: number) => count >= 3 && count <= 10;
export function hasLowResolutionPhoto(photo: { width?: number | null; height?: number | null }): boolean {
  return photo.width != null && photo.height != null && Math.min(photo.width, photo.height) < 1200;
}

export async function validateProductPhotoUpload(files: File[], existing: number): Promise<void> {
  if (existing + files.length > 10) throw new Error("Можно загрузить не более 10 фото на товар");
  for (const file of files) {
    const metadataError = getImageUploadMetadataError(file);
    if (metadataError) throw new Error(metadataError);
    const url = URL.createObjectURL(file);
    try {
      const image = new window.Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Не удалось прочитать фотографию"));
        image.src = url;
      });
      if (image.naturalWidth < 1 || image.naturalHeight < 1) {
        throw new Error("Не удалось прочитать размер фотографии");
      }
      if (image.naturalWidth > MAX_IMAGE_EDGE || image.naturalHeight > MAX_IMAGE_EDGE
        || image.naturalWidth * image.naturalHeight > MAX_IMAGE_PIXELS) {
        throw new Error("Фото должно быть не больше 48 мегапикселей и 16384 пикселей по стороне");
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
