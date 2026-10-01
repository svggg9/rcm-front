export const PRODUCT_PHOTO_COUNT_ERROR = "Для модерации нужно от 3 до 10 фото товара";
export const validProductPhotoCount = (count: number) => count >= 3 && count <= 10;

export async function validateProductPhotoUpload(files: File[], existing: number): Promise<void> {
  if (existing + files.length > 10) throw new Error("Можно загрузить не более 10 фото на товар");
  for (const file of files) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      throw new Error("Разрешены только JPEG, PNG и WebP");
    }
    if (!file.size || file.size > 8 * 1024 * 1024) throw new Error("Фото должно быть непустым и не больше 8 МБ");
    const url = URL.createObjectURL(file);
    try {
      const image = new window.Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Не удалось прочитать фотографию"));
        image.src = url;
      });
      if (Math.min(image.naturalWidth, image.naturalHeight) < 1200) {
        throw new Error("Фото должно быть не менее 1200 px по короткой стороне");
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
