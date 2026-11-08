
import { API_URL } from "../../lib/api";
import { ApiRequestError, readApiError, readApiJson } from "../../lib/apiErrors";
import { requestApiResponse } from "../../lib/apiRequest";
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

const collectionMessages: Readonly<Record<string, string>> = {
  "Укажите название подборки": "Укажите название подборки",
  "Название длиннее 80 символов": "Название должно быть не длиннее 80 символов",
  "Описание длиннее 160 символов": "Описание должно быть не длиннее 160 символов",
  "Выберите хотя бы один товар": "Выберите хотя бы один товар",
  "В подборке может быть не более 12 товаров": "В подборку можно добавить не больше 12 товаров",
  "На витрине можно разместить не более 12 подборок": "На витрине можно разместить не больше 12 подборок",
  "В подборку можно добавить только активные товары": "В подборку можно добавить только опубликованные товары",
  "Товар не принадлежит продавцу и выбранному бренду": "Выберите товары своего магазина и бренда",
  "Подборка не найдена": "Подборка больше недоступна — обновите список",
  "Данные изменились — обновите страницу перед сохранением": "Подборка изменилась — обновите данные перед сохранением",
};

const UNCONFIRMED_CHANGE = "Не удалось подтвердить результат — обновите данные перед повтором";

async function brandRequest(
  path: string,
  fallback: string,
  options: RequestInit = {},
  messages: Readonly<Record<string, string>> = {},
  tooLargeMessage?: string,
): Promise<Response> {
  const mutation = options.method && options.method !== "GET";
  const response = await requestApiResponse(`${API_URL}/api/seller/brands${path}`, options,
    mutation ? UNCONFIRMED_CHANGE : fallback);
  if (!response.ok) {
    throw await readApiError(response, response.status === 413 && tooLargeMessage ? tooLargeMessage : fallback, messages);
  }
  return response;
}

async function brandData(response: Response, fallback: string): Promise<unknown> {
  return readApiJson<unknown>(response, fallback);
}

function isBrand(value: unknown): value is SellerBrand {
  return !!value && typeof value === "object" && "id" in value && Number.isSafeInteger(value.id)
    && "name" in value && typeof value.name === "string";
}

function isBrandImage(value: unknown): value is SellerBrandImage {
  return !!value && typeof value === "object" && "id" in value && Number.isSafeInteger(value.id)
    && "imageUrl" in value && typeof value.imageUrl === "string";
}

async function changedBrand(response: Response): Promise<SellerBrand> {
  const data = await brandData(response, UNCONFIRMED_CHANGE);
  if (!isBrand(data)) throw new ApiRequestError(UNCONFIRMED_CHANGE, "invalid-response", response.status);
  return data;
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

  return changedBrand(response);
}
export async function uploadSellerBrandLogo(
  brandId: number,
  file: File
): Promise<SellerBrand> {
  const validationMessage = getImageUploadMetadataError(file);
  if (validationMessage) throw new SellerBrandFileError(validationMessage);
  const formData = new FormData();
  formData.append("file", file);

  const fallback = "Не удалось загрузить логотип производителя";
  const response = await brandRequest(`/${brandId}/logo`, fallback,
    { method: "POST", body: formData }, photoMessages, "Фото должно быть не больше 10 МБ");
  return changedBrand(response);
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
  return changedBrand(response);
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
  const data = await brandData(response, UNCONFIRMED_CHANGE);
  if (!isBrandImage(data)) throw new ApiRequestError(UNCONFIRMED_CHANGE, "invalid-response", response.status);
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
  const fallback = "Не удалось загрузить подборки";
  const response = await brandRequest(`/${brandId}/collections`, fallback);
  const data = await brandData(response, fallback);
  if (!Array.isArray(data) || !data.every(isCollection)) throw new ApiRequestError(fallback, "invalid-response", response.status);
  return data;
}

function isCollection(value: unknown): value is SellerStorefrontCollection {
  return !!value && typeof value === "object" && !Array.isArray(value)
    && "id" in value && typeof value.id === "number" && Number.isSafeInteger(value.id) && value.id > 0
    && "title" in value && typeof value.title === "string" && "products" in value && Array.isArray(value.products);
}

async function collectionData(response: Response): Promise<SellerStorefrontCollection> {
  const data = await brandData(response, UNCONFIRMED_CHANGE);
  if (!isCollection(data)) throw new ApiRequestError(UNCONFIRMED_CHANGE, "invalid-response", response.status);
  return data;
}

export async function getSellerStorefrontProducts(
  brandId: number,
  page = 0,
  size = 24,
  query = ""
): Promise<PageResponse<SellerStorefrontProduct>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (query.trim()) params.set("q", query.trim());
  const fallback = "Не удалось загрузить товары для подборки";
  const response = await brandRequest(`/${brandId}/collections/available-products?${params.toString()}`, fallback);
  const data = await brandData(response, fallback) as PageResponse<SellerStorefrontProduct> | null;
  if (!data || typeof data !== "object" || !Array.isArray(data.content)
    || !Number.isSafeInteger(data.totalElements) || data.totalElements < 0
    || !Number.isSafeInteger(data.totalPages) || data.totalPages < 0) {
    throw new ApiRequestError(fallback, "invalid-response", response.status);
  }
  return data;
}

export async function createSellerStorefrontCollection(
  brandId: number,
  payload: SellerStorefrontCollectionRequest
): Promise<SellerStorefrontCollection> {
  const fallback = "Не удалось создать подборку";
  const response = await brandRequest(`/${brandId}/collections`, fallback,
    { method: "POST", body: JSON.stringify(payload) }, collectionMessages);
  return collectionData(response);
}

export async function updateSellerStorefrontCollection(
  brandId: number,
  collectionId: number,
  payload: SellerStorefrontCollectionRequest
): Promise<SellerStorefrontCollection> {
  const fallback = "Не удалось сохранить подборку";
  const response = await brandRequest(`/${brandId}/collections/${collectionId}`, fallback,
    { method: "PUT", body: JSON.stringify(payload) }, collectionMessages);
  return collectionData(response);
}

export async function deleteSellerStorefrontCollection(
  brandId: number,
  collectionId: number
): Promise<void> {
  await brandRequest(`/${brandId}/collections/${collectionId}`, "Не удалось удалить подборку",
    { method: "DELETE" }, collectionMessages);
}
