const photoMessages: Readonly<Record<string, string>> = {
  "A brand can have at most 8 active images": "Можно добавить не больше 8 фотографий",
  "Выберите фотографию магазина": "Выберите непустую фотографию",
  "Фото должно быть не больше 8 МБ": "Фото должно быть не больше 10 МБ",
  "Фото должно быть не больше 10 МБ": "Фото должно быть не больше 10 МБ",
  "Разрешены только JPEG и WebP": "Разрешены только JPEG, PNG и WebP",
  "Разрешены только JPEG, PNG и WebP": "Разрешены только JPEG, PNG и WebP",
  "Не удалось прочитать фотографию магазина": "Не удалось прочитать фотографию",
  "Не удалось прочитать фото или его содержимое не соответствует JPEG/WebP": "Не удалось прочитать фото или его содержимое не соответствует JPEG/WebP",
  "Не удалось прочитать фото или его содержимое не соответствует JPEG/PNG/WebP": "Не удалось прочитать фото или его содержимое не соответствует JPEG/PNG/WebP",
  "Выберите одну статичную фотографию": "Выберите одну статичную фотографию",
  "Выберите статичную фотографию без анимации": "Выберите статичную фотографию без анимации",
  "Фото должно быть не больше 48 мегапикселей и 16384 пикселей по стороне": "Фото должно быть не больше 48 мегапикселей и 16384 пикселей по стороне",
  "Другая фотография ещё обрабатывается, повторите загрузку": "Другая фотография ещё обрабатывается — повторите загрузку",
  "Обработка фотографий временно недоступна": "Обработка фотографий временно недоступна",
};

import { readApiError } from "../../lib/apiErrors";
import { getImageUploadMetadataError, MAX_WORDMARK_UPLOAD_BYTES, WORDMARK_MIME_TYPES } from "../../lib/imageUploadPolicy";

import { API_URL, apiFetch } from "../../lib/api";
import type {
  SellerBrand,
  SellerBrandImage,
  SellerBrandProfileRequest,
  PageResponse,
  SellerStorefrontCollection,
  SellerStorefrontCollectionRequest,
  SellerStorefrontProduct,
} from "../types";

export async function getSellerBrands(): Promise<SellerBrand[]> {
  const response = await apiFetch(`${API_URL}/api/seller/brands`);

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Не удалось загрузить бренды");
  }

  const data: unknown = await response.json();

  return Array.isArray(data) ? (data as SellerBrand[]) : [];
}

export async function updateSellerBrandProfile(
  brandId: number,
  payload: SellerBrandProfileRequest
): Promise<SellerBrand> {
  const response = await apiFetch(`${API_URL}/api/seller/brands/${brandId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Не удалось сохранить профиль производителя");
  }

  return response.json();
}
export async function uploadSellerBrandLogo(
  brandId: number,
  file: File
): Promise<SellerBrand> {
  const validationMessage = getImageUploadMetadataError(file);
  if (validationMessage) throw new Error(validationMessage);
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiFetch(`${API_URL}/api/seller/brands/${brandId}/logo`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Не удалось загрузить логотип производителя");
  }

  return response.json();
}

export async function uploadSellerBrandWordmark(
  brandId: number,
  file: File
): Promise<SellerBrand> {
  const validationMessage = getImageUploadMetadataError(file, { maxBytes: MAX_WORDMARK_UPLOAD_BYTES, allowedMimeTypes: WORDMARK_MIME_TYPES, typeMessage: "Для логотипа доступны только SVG и WebP", sizeMessage: "Логотип должен быть не больше 2 МБ" });
  if (validationMessage) throw new Error(validationMessage);
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiFetch(
    `${API_URL}/api/seller/brands/${brandId}/wordmark`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Не удалось загрузить текстовый логотип бренда");
  }

  return response.json();
}

export async function getSellerBrandImages(
  brandId: number
): Promise<SellerBrandImage[]> {
  const response = await apiFetch(
    `${API_URL}/api/seller/brands/${brandId}/images`
  );
  if (!response.ok) throw new Error("Не удалось загрузить фотографии бренда");
  const data: unknown = await response.json();
  return Array.isArray(data) ? (data as SellerBrandImage[]) : [];
}

export async function uploadSellerBrandImage(brandId: number, file: File): Promise<SellerBrandImage> {
  const validationMessage = getImageUploadMetadataError(file);
  if (validationMessage) throw new Error(validationMessage);
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiFetch(`${API_URL}/api/seller/brands/${brandId}/images`, { method: "POST", body: formData });
  if (!response.ok) throw await readApiError(response, response.status === 413 ? "Фото должно быть не больше 10 МБ" : "Не удалось загрузить фотографию бренда", photoMessages);
  return response.json();
}

export async function deleteSellerBrandImage(
  brandId: number,
  imageId: number
): Promise<void> {
  const response = await apiFetch(
    `${API_URL}/api/seller/brands/${brandId}/images/${imageId}`,
    { method: "DELETE" }
  );
  if (!response.ok) throw new Error("Не удалось удалить фотографию бренда");
}

export async function reorderSellerBrandImages(
  brandId: number,
  imageIds: number[]
): Promise<void> {
  const response = await apiFetch(
    `${API_URL}/api/seller/brands/${brandId}/images/order`,
    {
      method: "PUT",
      body: JSON.stringify({ imageIds }),
    }
  );
  if (!response.ok) throw new Error("Не удалось изменить порядок фотографий");
}

export async function getSellerStorefrontCollections(
  brandId: number
): Promise<SellerStorefrontCollection[]> {
  const response = await apiFetch(
    `${API_URL}/api/seller/brands/${brandId}/collections`
  );
  if (response.status === 404) return [];
  if (!response.ok) throw new Error("Не удалось загрузить подборки");
  const data: unknown = await response.json();
  return Array.isArray(data) ? (data as SellerStorefrontCollection[]) : [];
}

export async function getSellerStorefrontProducts(
  brandId: number,
  page = 0,
  size = 24,
  query = ""
): Promise<PageResponse<SellerStorefrontProduct>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (query.trim()) params.set("q", query.trim());
  const response = await apiFetch(
    `${API_URL}/api/seller/brands/${brandId}/collections/available-products?${params.toString()}`
  );
  if (!response.ok) throw new Error("Не удалось загрузить товары для подборки");
  const data = (await response.json()) as PageResponse<SellerStorefrontProduct>;
  return {
    ...data,
    content: Array.isArray(data.content) ? data.content : [],
  };
}

export async function createSellerStorefrontCollection(
  brandId: number,
  payload: SellerStorefrontCollectionRequest
): Promise<SellerStorefrontCollection> {
  const response = await apiFetch(
    `${API_URL}/api/seller/brands/${brandId}/collections`,
    { method: "POST", body: JSON.stringify(payload) }
  );
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Не удалось создать подборку");
  }
  return response.json();
}

export async function updateSellerStorefrontCollection(
  brandId: number,
  collectionId: number,
  payload: SellerStorefrontCollectionRequest
): Promise<SellerStorefrontCollection> {
  const response = await apiFetch(
    `${API_URL}/api/seller/brands/${brandId}/collections/${collectionId}`,
    { method: "PUT", body: JSON.stringify(payload) }
  );
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Не удалось сохранить подборку");
  }
  return response.json();
}

export async function deleteSellerStorefrontCollection(
  brandId: number,
  collectionId: number
): Promise<void> {
  const response = await apiFetch(
    `${API_URL}/api/seller/brands/${brandId}/collections/${collectionId}`,
    { method: "DELETE" }
  );
  if (!response.ok) throw new Error("Не удалось удалить подборку");
}
