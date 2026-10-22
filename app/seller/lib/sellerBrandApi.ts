
import { API_URL, apiFetch } from "../../lib/api";
import { ApiRequestError, isRequestCancelled, readApiError, toApiError } from "../../lib/apiErrors";
import { getImageUploadMetadataError, MAX_WORDMARK_UPLOAD_BYTES, WORDMARK_MIME_TYPES } from "../../lib/imageUploadPolicy";
import type {
  SellerBrand,
  SellerBrandImage,
  SellerBrandProfileRequest,
  PageResponse,
  SellerStorefrontCollection,
  SellerStorefrontCollectionRequest,
  SellerStorefrontProduct,
} from "../types";

/** Local file checks are safe to show beside the upload control. */
export class SellerBrandFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SellerBrandFileError";
  }
}

const wordmarkMessages: Readonly<Record<string, string>> = {
  "File is empty": "Выберите непустой текстовый логотип",
  "Wordmark file exceeds 2 MB": "Текстовый логотип должен быть не больше 2 МБ",
  "Unsupported wordmark file type": "Разрешены только SVG и WebP",
  "Wordmark content does not match MIME type": "Содержимое логотипа не соответствует формату файла",
  "Unsupported wordmark content": "Не удалось прочитать текстовый логотип",
  "Invalid SVG document": "Не удалось прочитать SVG — выберите другой файл",
  "Invalid or unsafe SVG": "Не удалось прочитать SVG — выберите другой файл",
  "SVG document is too complex": "SVG слишком сложный — выберите упрощённый файл",
  "SVG processing instructions are not allowed": "Выберите статичный SVG без скриптов и внешних ресурсов",
  "SVG scripts are not allowed": "Выберите статичный SVG без скриптов и внешних ресурсов",
  "Only static SVG shapes, text and gradients are allowed": "Выберите статичный SVG без скриптов и внешних ресурсов",
  "Unsupported SVG attribute; use static presentation attributes": "Выберите статичный SVG без скриптов и внешних ресурсов",
  "External SVG resources are not allowed": "Выберите статичный SVG без скриптов и внешних ресурсов",
};

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

async function brandRequest(
  path: string,
  fallback: string,
  options: RequestInit = {},
  messages: Readonly<Record<string, string>> = {},
  tooLargeMessage?: string,
): Promise<Response> {
  try {
    const response = await apiFetch(`${API_URL}/api/seller/brands${path}`, options);
    if (!response.ok) {
      throw await readApiError(response, response.status === 413 && tooLargeMessage ? tooLargeMessage : fallback, messages);
    }
    return response;
  } catch (error) {
    if (isRequestCancelled(error)) throw error;
    throw toApiError(error, fallback);
  }
}

async function brandData(response: Response, fallback: string): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    if (isRequestCancelled(error)) throw error;
    if (error instanceof Error && error.name === "TimeoutError") throw toApiError(error, fallback);
    throw new ApiRequestError(fallback, "invalid-response", response.status);
  }
}

function isBrand(value: unknown): value is SellerBrand {
  return !!value && typeof value === "object" && "id" in value && Number.isSafeInteger(value.id)
    && "name" in value && typeof value.name === "string";
}

function isBrandImage(value: unknown): value is SellerBrandImage {
  return !!value && typeof value === "object" && "id" in value && Number.isSafeInteger(value.id)
    && "imageUrl" in value && typeof value.imageUrl === "string";
}

export async function getSellerBrands(): Promise<SellerBrand[]> {
  const fallback = "Не удалось загрузить бренды";
  const response = await brandRequest("", fallback);
  const data = await brandData(response, fallback);
  if (!Array.isArray(data) || !data.every(isBrand)) throw new ApiRequestError(fallback, "invalid-response", response.status);
  return data;
}

export async function updateSellerBrandProfile(
  brandId: number,
  payload: SellerBrandProfileRequest
): Promise<SellerBrand> {
  const fallback = "Не удалось сохранить данные магазина";
  const response = await brandRequest(`/${brandId}`, fallback, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  const data = await brandData(response, fallback);
  if (!isBrand(data)) throw new ApiRequestError(fallback, "invalid-response", response.status);
  return data;
}
export async function uploadSellerBrandLogo(
  brandId: number,
  file: File
): Promise<SellerBrand> {
  const validationMessage = getImageUploadMetadataError(file);
  if (validationMessage) throw new SellerBrandFileError(validationMessage);
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
  const validationMessage = getImageUploadMetadataError(file, {
    maxBytes: MAX_WORDMARK_UPLOAD_BYTES,
    allowedMimeTypes: WORDMARK_MIME_TYPES,
    typeMessage: "Разрешены только SVG и WebP",
    emptyMessage: "Выберите непустой текстовый логотип",
    sizeMessage: "Текстовый логотип должен быть не больше 2 МБ",
  });
  if (validationMessage) throw new SellerBrandFileError(validationMessage);
  const formData = new FormData();
  formData.append("file", file);
  const fallback = "Не удалось загрузить текстовый логотип";
  const response = await brandRequest(
    `/${brandId}/wordmark`, fallback,
    {
      method: "POST",
      body: formData,
    }, wordmarkMessages, "Текстовый логотип должен быть не больше 2 МБ",
  );
  const data = await brandData(response, fallback);
  if (!isBrand(data)) throw new ApiRequestError(fallback, "invalid-response", response.status);
  return data;
}

export async function getSellerBrandImages(
  brandId: number
): Promise<SellerBrandImage[]> {
  const fallback = "Не удалось загрузить фотографии бренда";
  const response = await brandRequest(`/${brandId}/images`, fallback);
  const data = await brandData(response, fallback);
  if (!Array.isArray(data) || !data.every(isBrandImage)) throw new ApiRequestError(fallback, "invalid-response", response.status);
  return data;
}

export async function uploadSellerBrandImage(
  brandId: number,
  file: File
): Promise<SellerBrandImage> {
  const validationMessage = getImageUploadMetadataError(file);
  if (validationMessage) throw new SellerBrandFileError(validationMessage);
  const formData = new FormData();
  formData.append("file", file);
  const fallback = "Не удалось загрузить фотографию бренда";
  const response = await brandRequest(
    `/${brandId}/images`, fallback,
    { method: "POST", body: formData }, photoMessages, "Фото должно быть не больше 10 МБ",
  );
  const data = await brandData(response, fallback);
  if (!isBrandImage(data)) throw new ApiRequestError(fallback, "invalid-response", response.status);
  return data;
}

export async function deleteSellerBrandImage(
  brandId: number,
  imageId: number
): Promise<void> {
  await brandRequest(
    `/${brandId}/images/${imageId}`, "Не удалось удалить фотографию бренда",
    { method: "DELETE" }
  );
}

export async function reorderSellerBrandImages(
  brandId: number,
  imageIds: number[]
): Promise<void> {
  await brandRequest(
    `/${brandId}/images/order`, "Не удалось изменить порядок фотографий",
    {
      method: "PUT",
      body: JSON.stringify({ imageIds }),
    }
  );
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
