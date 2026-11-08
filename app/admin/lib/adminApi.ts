import { API_URL } from "../../lib/api";
import { requestApiResponse } from "../../lib/apiRequest";
import { ApiRequestError, isRequestCancelled, readApiError, readApiJson } from "../../lib/apiErrors";
import { CATEGORY_API_MESSAGES } from "../../lib/categoryErrors";
import { normalizeCategories } from "../../lib/categories";
import { getImageUploadMetadataError } from "../../lib/imageUploadPolicy";
import { normalizeStorefrontSections } from "../../lib/storefrontSections";
import { normalizeNewArrivalsCount } from "../../lib/storefrontSettings";
import type {
  AdminProduct,
  AdminProductListItem,
  AdminOrder,
  AdminOrderListItem,
  AdminSeller,
  DictionaryItem,
  DictionaryKind,
  PageResponse,
  ProductStatus,
  SellerFilter,
  AdminSellerApplication,
  SellerApplicationStatus,
  AdminFinancialLedgerEntry,
  AdminCdekWebhookEvent,
  FinancialLedgerEntryType,
  AdminSellerPayout,
  AdminSellerPayoutStats,
  AdminStorefrontHome,
  AdminStorefrontCollection,
  AdminStorefrontCollectionRequest,
  AdminStorefrontProduct,
  AdminStorefrontSection,
  AdminStorefrontSectionRequest,
  PayoutGenerationResult,
} from "../types";

const ADMIN_API_MESSAGES: Readonly<Record<string, string>> = {
  ...CATEGORY_API_MESSAGES,
  "Product not found": "Товар больше недоступен — обновите список",
  "Товар не найден": "Товар больше недоступен — обновите список",
  "Variant not found": "Вариант товара больше недоступен — обновите товар",
  "Вариант товара не найден": "Вариант товара больше недоступен — обновите товар",
  "Название оттенка изменилось — обновите товар": "Название оттенка изменилось — обновите товар",
  "Выберите цвет из справочника": "Выберите цвет из справочника",
  "Moderation comment is required": "Укажите причину возврата товара на доработку",
  "Причина блокировки слишком длинная": "Причина блокировки должна быть не длиннее 1000 символов",
  "Изменения ещё не отправлены на модерацию": "Изменения ещё не отправлены на модерацию — обновите товар",
  "Исходный товар снят с продажи или заблокирован": "Исходный товар снят с продажи или заблокирован — обновите список",
  "Исходный вариант товара изменился": "Исходный вариант товара изменился — обновите товар",
  "Карточка изменилась — обновите её перед сохранением": "Карточка изменилась — обновите её перед сохранением",
  "На главной можно создать не более 20 подборок": "На главной можно создать не больше 20 подборок",
  "Передайте все подборки без повторов": "Состав подборок изменился — обновите список перед перестановкой",
  "Данные подборки обязательны": "Заполните данные подборки",
  "Укажите название подборки": "Укажите название подборки",
  "Название длиннее 100 символов": "Название должно быть не длиннее 100 символов",
  "Описание длиннее 240 символов": "Описание должно быть не длиннее 240 символов",
  "Выберите хотя бы один товар": "Выберите хотя бы один товар",
  "В подборку можно добавить только активные товары": "В подборку можно добавить только опубликованные товары — обновите список",
};

function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const mutation = options.method && options.method.toUpperCase() !== "GET";
  const fallback = mutation
    ? "Не удалось получить результат действия — обновите данные перед повтором"
    : "Не удалось загрузить данные — попробуйте ещё раз";
  const upload = typeof FormData !== "undefined" && options.body instanceof FormData;
  return requestApiResponse(url, options, fallback, upload ? 60_000 : 20_000);
}

function adminJson<T>(response: Response): Promise<T> {
  return readApiJson<T>(response, "Не удалось прочитать ответ — обновите данные перед продолжением");
}

async function categoryJson(response: Response): Promise<DictionaryItem> {
  try {
    const data: unknown = await adminJson(response);
    if (!data || typeof data !== "object") throw new Error();
    const raw = data as Record<string, unknown>;
    if (!(raw.parentId === null || typeof raw.parentId === "number" && Number.isSafeInteger(raw.parentId) && raw.parentId > 0)) throw new Error();
    const normalized = normalizeCategories([{ ...raw, parentId: null }])[0];
    if (raw.parentId === normalized.id) throw new Error();
    return { ...normalized, parentId: raw.parentId };
  } catch (reason) {
    if (isRequestCancelled(reason) || reason instanceof ApiRequestError) throw reason;
    throw new ApiRequestError("Не удалось прочитать категорию — обновите список", "invalid-response");
  }
}

export async function getAdminProducts(
  status: ProductStatus | "ALL",
  page = 0,
  size = 50,
  q = "", seller = ""
): Promise<PageResponse<AdminProductListItem>> {
  const query =
    status === "ALL"
      ? `page=${page}&size=${size}&q=${encodeURIComponent(q)}${seller ? `&seller=${encodeURIComponent(seller)}` : ""}`
      : `status=${status}&page=${page}&size=${size}&q=${encodeURIComponent(q)}${seller ? `&seller=${encodeURIComponent(seller)}` : ""}`;

  const response = await adminFetch(`${API_URL}/api/admin/products/list?${query}`);

  if (!response.ok) {
    throw await readApiError(response, "Не удалось загрузить товары", ADMIN_API_MESSAGES);
  }

  return adminJson(response);
}

export async function getAdminProductStatusCounts(): Promise<
  Record<ProductStatus | "ALL", number>
> {
  const response = await adminFetch(`${API_URL}/api/admin/products/status-counts`);

  if (!response.ok) {
    throw await readApiError(response, "Не удалось загрузить счетчики товаров", ADMIN_API_MESSAGES);
  }

  return adminJson(response);
}

export async function getAdminProduct(id: number): Promise<AdminProduct> {
  const response = await adminFetch(`${API_URL}/api/admin/products/${id}`);

  if (!response.ok) {
    throw await readApiError(response, "Не удалось загрузить товар", ADMIN_API_MESSAGES);
  }

  return adminJson(response);
}

export async function assignProductColor(productId: number, groupId: number, colorId: number | null, expectedColorName: string | null): Promise<AdminProduct> {
  const response = await adminFetch(`${API_URL}/api/admin/products/${productId}/colorways/${groupId}/color`, {
    method: "POST", signal: AbortSignal.timeout(20_000), body: JSON.stringify({ colorId, expectedColorName }),
  });
  if (!response.ok) throw await readApiError(response, "Не удалось присвоить цвет", ADMIN_API_MESSAGES);
  return adminJson(response);
}

export async function getAdminOrders(
  page = 0,
  size = 50,
  q = "", paymentStatus = "", deliveryStatus = "", seller = "", from = "", to = ""
): Promise<PageResponse<AdminOrderListItem>> {
  const response = await adminFetch(
    `${API_URL}/api/admin/orders/list?page=${page}&size=${size}&q=${encodeURIComponent(q)}${seller ? `&seller=${encodeURIComponent(seller)}` : ""}${paymentStatus ? `&paymentStatus=${encodeURIComponent(paymentStatus)}` : ""}${deliveryStatus ? `&deliveryStatus=${encodeURIComponent(deliveryStatus)}` : ""}${from ? `&from=${encodeURIComponent(from)}` : ""}${to ? `&to=${encodeURIComponent(to)}` : ""}`
  );

  if (!response.ok) {
    throw await readApiError(response, "Не удалось загрузить заказы", ADMIN_API_MESSAGES);
  }

  return adminJson(response);
}

export async function getAdminOrder(id: number): Promise<AdminOrder> {
  const response = await adminFetch(`${API_URL}/api/admin/orders/${id}`);

  if (!response.ok) {
    throw await readApiError(response, "Не удалось загрузить заказ", ADMIN_API_MESSAGES);
  }

  return adminJson(response);
}

export async function refundAdminOrder(id: number): Promise<void> {
  const response = await adminFetch(`${API_URL}/api/admin/orders/${id}/refund`, {
    method: "POST",
  });

  if (!response.ok) {
    throw await readApiError(response, "Не удалось вернуть оплату", ADMIN_API_MESSAGES);
  }
}

export async function cancelAdminOrderDelivery(id: number): Promise<void> {
  const response = await adminFetch(
    `${API_URL}/api/admin/orders/${id}/delivery/cancel`,
    { method: "POST" }
  );

  if (!response.ok) {
    throw await readApiError(response, "Не удалось отменить доставку", ADMIN_API_MESSAGES);
  }
}

export async function approveProduct(id: number): Promise<void> {
  const response = await adminFetch(`${API_URL}/api/admin/products/${id}/approve`, {
    method: "POST",
  });

  if (!response.ok) {
    throw await readApiError(response, "Не удалось одобрить товар", ADMIN_API_MESSAGES);
  }
}

export async function returnProductToRevision(
    id: number,
    comment: string
  ): Promise<void> {
    const response = await adminFetch(`${API_URL}/api/admin/products/${id}/revision`, {
      method: "POST",
      body: JSON.stringify({ comment }),
    });

    if (!response.ok) {
      throw await readApiError(response, "Не удалось вернуть товар на доработку", ADMIN_API_MESSAGES);
    }
  }

export async function blockProduct(id: number, comment?: string): Promise<void> {
  const response = await adminFetch(`${API_URL}/api/admin/products/${id}/block`, {
    method: "POST", body: JSON.stringify({comment:comment?.trim() || null}),
  });

  if (!response.ok) {
    throw await readApiError(response, "Не удалось заблокировать товар", ADMIN_API_MESSAGES);
  }
}

export async function unblockProduct(id: number): Promise<void> {
  const response = await adminFetch(`${API_URL}/api/admin/products/${id}/unblock`, {
    method: "POST",
  });

  if (!response.ok) {
    throw await readApiError(response, "Не удалось разблокировать товар", ADMIN_API_MESSAGES);
  }
}

export async function getAdminSellers(
  filter: SellerFilter,
  page = 0,
  size = 50
): Promise<PageResponse<AdminSeller>> {
  let url = `${API_URL}/api/admin/sellers?page=${page}&size=${size}`;

  if (filter === "REQUESTS") {
    url = `${API_URL}/api/admin/sellers/requests?page=${page}&size=${size}`;
  }

  if (filter === "APPROVED") {
    url = `${API_URL}/api/admin/sellers?approved=true&page=${page}&size=${size}`;
  }

  const response = await adminFetch(url);

  if (!response.ok) {
    throw await readApiError(response, "Не удалось загрузить продавцов", ADMIN_API_MESSAGES);
  }

  return adminJson(response);
}

export async function approveSeller(id: number): Promise<void> {
  const response = await adminFetch(`${API_URL}/api/admin/sellers/${id}/approve`, {
    method: "POST",
  });

  if (!response.ok) {
    throw await readApiError(response, "Не удалось одобрить продавца", ADMIN_API_MESSAGES);
  }
}

export async function rejectSeller(id: number): Promise<void> {
  const response = await adminFetch(`${API_URL}/api/admin/sellers/${id}/reject`, {
    method: "POST",
  });

  if (!response.ok) {
    throw await readApiError(response, "Не удалось отклонить заявку", ADMIN_API_MESSAGES);
  }
}

export async function getAdminDictionary(
  kind: DictionaryKind
): Promise<DictionaryItem[]> {
  const response = await adminFetch(`${API_URL}/api/admin/dictionaries/${kind}`);

  if (!response.ok) {
    if (kind === "categories") throw await readApiError(response, "Не удалось загрузить категории", CATEGORY_API_MESSAGES);
    throw await readApiError(response, "Не удалось загрузить справочник", ADMIN_API_MESSAGES);
  }

  if (kind === "categories") {
    try { return normalizeCategories(await adminJson(response)); }
    catch (reason) {
      if (isRequestCancelled(reason) || reason instanceof ApiRequestError) throw reason;
      throw new ApiRequestError("Не удалось прочитать категории — попробуйте ещё раз", "invalid-response");
    }
  }
  return adminJson(response);
}

export async function createAdminDictionaryItem(
  kind: DictionaryKind,
  item: Partial<DictionaryItem>
): Promise<DictionaryItem> {
  const response = await adminFetch(`${API_URL}/api/admin/dictionaries/${kind}`, {
    method: "POST",
    body: JSON.stringify(item),
  });

  if (!response.ok) {
    if (kind === "categories") throw await readApiError(response, "Не удалось создать категорию", CATEGORY_API_MESSAGES);
    throw await readApiError(response, "Не удалось создать значение", ADMIN_API_MESSAGES);
  }

  return kind === "categories" ? categoryJson(response) : adminJson(response);
}

export async function updateAdminDictionaryItem(
  kind: DictionaryKind,
  id: number,
  item: Partial<DictionaryItem>
): Promise<DictionaryItem> {
  const response = await adminFetch(
    `${API_URL}/api/admin/dictionaries/${kind}/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(item),
    }
  );

  if (!response.ok) {
    if (kind === "categories") throw await readApiError(response, "Не удалось сохранить категорию", CATEGORY_API_MESSAGES);
    throw await readApiError(response, "Не удалось обновить значение", ADMIN_API_MESSAGES);
  }

  return kind === "categories" ? categoryJson(response) : adminJson(response);
}

export async function deleteAdminDictionaryItem(
  kind: DictionaryKind,
  id: number
): Promise<void> {
  const response = await adminFetch(
    `${API_URL}/api/admin/dictionaries/${kind}/${id}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    if (kind === "categories") throw await readApiError(response, "Не удалось отключить категорию", CATEGORY_API_MESSAGES);
    throw await readApiError(response, "Не удалось отключить значение", ADMIN_API_MESSAGES);
  }
}

export async function getAdminSellerApplications(
  status: SellerApplicationStatus | "ALL",
  page = 0,
  size = 50,
  q = ""
): Promise<PageResponse<AdminSellerApplication>> {
  const query =
    status === "ALL"
      ? `page=${page}&size=${size}&q=${encodeURIComponent(q)}`
      : `status=${status}&page=${page}&size=${size}&q=${encodeURIComponent(q)}`;

  const response = await adminFetch(
    `${API_URL}/api/admin/seller-applications?${query}`
  );

  if (!response.ok) {
    throw await readApiError(response, "Не удалось загрузить заявки", ADMIN_API_MESSAGES);
  }

  return adminJson(response);
}

export async function getAdminLedgerEntries(params?: {
  entryType?: FinancialLedgerEntryType | "ALL";
  orderGroupId?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<AdminFinancialLedgerEntry>> {
  const query = new URLSearchParams();
  query.set("page", String(params?.page ?? 0));
  query.set("size", String(params?.size ?? 50));

  if (params?.entryType && params.entryType !== "ALL") {
    query.set("entryType", params.entryType);
  }

  if (params?.orderGroupId?.trim()) {
    query.set("orderGroupId", params.orderGroupId.trim());
  }

  const response = await adminFetch(
    `${API_URL}/api/admin/finance/ledger?${query.toString()}`
  );

  if (!response.ok) {
    throw await readApiError(response, "Не удалось загрузить движения средств", ADMIN_API_MESSAGES);
  }

  return adminJson(response);
}

export async function getAdminSellerPayouts(
  page = 0,
  size = 50
): Promise<PageResponse<AdminSellerPayout>> {
  const response = await adminFetch(
    `${API_URL}/api/admin/finance/payouts/list?page=${page}&size=${size}`
  );
  if (!response.ok) {
    throw await readApiError(response, "Не удалось загрузить выплаты", ADMIN_API_MESSAGES);
  }
  return adminJson(response);
}

export async function getAdminSellerPayoutStats(): Promise<AdminSellerPayoutStats> {
  const response = await adminFetch(`${API_URL}/api/admin/finance/payouts/stats`);

  if (!response.ok) {
    throw await readApiError(response, "Не удалось загрузить сводку выплат", ADMIN_API_MESSAGES);
  }

  return adminJson(response);
}

export async function generateAdminSellerPayouts(): Promise<PayoutGenerationResult> {
  const response = await adminFetch(`${API_URL}/api/admin/finance/payouts/generate`, {
    method: "POST",
  });
  if (!response.ok) {
    throw await readApiError(response, "Не удалось сформировать реестр", ADMIN_API_MESSAGES);
  }
  return adminJson(response);
}

export async function updateAdminSellerPayout(
  id: number,
  action: "sent" | "paid" | "failed" | "retry" | "cancel",
  payload?: { paymentOrderNumber?: string; comment?: string }
): Promise<AdminSellerPayout> {
  const response = await adminFetch(
    `${API_URL}/api/admin/finance/payouts/${id}/${action}`,
    {
      method: "POST",
      body: payload ? JSON.stringify(payload) : undefined,
    }
  );
  if (!response.ok) {
    throw await readApiError(response, "Не удалось обновить выплату", ADMIN_API_MESSAGES);
  }
  return adminJson(response);
}

export async function getAdminCdekWebhookEvents(params?: {
  page?: number;
  size?: number;
}): Promise<PageResponse<AdminCdekWebhookEvent>> {
  const query = new URLSearchParams();
  query.set("page", String(params?.page ?? 0));
  query.set("size", String(params?.size ?? 50));

  const response = await adminFetch(
    `${API_URL}/api/admin/delivery/cdek/webhook-events?${query.toString()}`
  );

  if (!response.ok) {
    throw await readApiError(response, "Не удалось загрузить события СДЭК", ADMIN_API_MESSAGES);
  }

  return adminJson(response);
}

export async function getAdminCdekWebhookPayload(eventId: number): Promise<string> {
  const response = await adminFetch(
    `${API_URL}/api/admin/delivery/cdek/webhook-events/${eventId}`
  );

  if (!response.ok) {
    throw await readApiError(response, "Не удалось загрузить payload события", ADMIN_API_MESSAGES);
  }

  const event = (await adminJson(response)) as AdminCdekWebhookEvent;
  return event.rawPayload ?? "";
}

export async function getAdminSellerApplicationStatusCounts(): Promise<
  Record<SellerApplicationStatus | "ALL", number>
> {
  const response = await adminFetch(
    `${API_URL}/api/admin/seller-applications/status-counts`
  );

  if (!response.ok) {
    throw await readApiError(response, "Не удалось загрузить счетчики заявок", ADMIN_API_MESSAGES);
  }

  return adminJson(response);
}

export async function approveSellerApplication(id: number): Promise<void> {
  const response = await adminFetch(
    `${API_URL}/api/admin/seller-applications/${id}/approve`,
    {
      method: "POST",
    }
  );

  if (!response.ok) {
    throw await readApiError(response, "Не удалось одобрить заявку", ADMIN_API_MESSAGES);
  }
}

export async function rejectSellerApplication(
  id: number,
  comment?: string
): Promise<void> {
  const response = await adminFetch(
    `${API_URL}/api/admin/seller-applications/${id}/reject`,
    {
      method: "POST",
      body: JSON.stringify({ comment: comment ?? null }),
    }
  );

  if (!response.ok) {
    throw await readApiError(response, "Не удалось отклонить заявку", ADMIN_API_MESSAGES);
  }
}

export async function assignProductCategory(
  id: number,
  categoryId: number
): Promise<void> {
  const response = await adminFetch(`${API_URL}/api/admin/products/${id}/category`, {
    method: "POST",
    body: JSON.stringify({ categoryId }),
  });

  if (!response.ok) {
    throw await readApiError(response, "Не удалось назначить категорию", CATEGORY_API_MESSAGES);
  }
}

function normalizeStorefrontHome(data: unknown): AdminStorefrontHome {
  if (!data || typeof data !== "object") {
    return {
      heroImageUrl: null,
      updatedAt: null,
      heroPositionX: 50,
      heroPositionY: 50,
      collections: [],
      sections: [],
      newArrivalsCollectionId: null,
      newArrivalsCount: normalizeNewArrivalsCount(undefined),
    };
  }

  const value = data as Record<string, unknown>;

  return {
    heroImageUrl:
      typeof value.heroImageUrl === "string" && value.heroImageUrl.trim()
        ? value.heroImageUrl.trim()
        : null,
    updatedAt:
      typeof value.updatedAt === "string" && value.updatedAt.trim()
        ? value.updatedAt.trim()
        : null,
    heroPositionX:
      typeof value.heroPositionX === "number" ? value.heroPositionX : 50,
    heroPositionY:
      typeof value.heroPositionY === "number" ? value.heroPositionY : 50,
    collections: normalizeStorefrontCollections(value.collections),
    sections: normalizeStorefrontSections(value.sections),
    newArrivalsCollectionId: typeof value.newArrivalsCollectionId === "number" && Number.isSafeInteger(value.newArrivalsCollectionId) && value.newArrivalsCollectionId > 0
      ? value.newArrivalsCollectionId : null,
    newArrivalsCount: normalizeNewArrivalsCount(value.newArrivalsCount),
  };
}

function normalizeStorefrontProduct(data: unknown): AdminStorefrontProduct | null {
  if (!data || typeof data !== "object") return null;
  const value = data as Record<string, unknown>;
  if (typeof value.id !== "number" || typeof value.title !== "string") return null;
  return {
    id: value.id,
    publicId: typeof value.publicId === "string" ? value.publicId : null,
    title: value.title,
    brand: typeof value.brand === "string" ? value.brand : null,
    category: typeof value.category === "string" ? value.category : null,
    audience:
      value.audience === "MEN" || value.audience === "WOMEN"
        ? value.audience
        : "UNISEX",
    status: typeof value.status === "string" ? value.status : null,
    coverImage: typeof value.coverImage === "string" ? value.coverImage : null,
    hoverImage: typeof value.hoverImage === "string" ? value.hoverImage : null,
    minPrice: typeof value.minPrice === "number" ? value.minPrice : 0,
    inStock: value.inStock === true,
  };
}

function normalizeStorefrontCollections(data: unknown): AdminStorefrontCollection[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const value = item as Record<string, unknown>;
    if (typeof value.id !== "number" || typeof value.title !== "string") return [];
    return [{
      id: value.id,
      title: value.title,
      description: typeof value.description === "string" ? value.description : null,
      active: value.active === true,
      sortOrder: typeof value.sortOrder === "number" ? value.sortOrder : 0,
      products: Array.isArray(value.products)
        ? value.products.flatMap((product) => {
            const normalized = normalizeStorefrontProduct(product);
            return normalized ? [normalized] : [];
          })
        : [],
    }];
  });
}

export async function getAdminStorefrontHome(): Promise<AdminStorefrontHome> {
  const response = await adminFetch(`${API_URL}/api/admin/storefront/home`);

  if (!response.ok) {
    throw await readApiError(response, "Не удалось загрузить настройки витрины", ADMIN_API_MESSAGES);
  }

  return normalizeStorefrontHome(await adminJson(response));
}

export async function updateAdminNewArrivals(collectionId: number | null, count?: number): Promise<AdminStorefrontHome> {
  const response = await adminFetch(`${API_URL}/api/admin/storefront/home/new-arrivals`, {
    method: "PATCH",
    body: JSON.stringify({ collectionId, ...(count === undefined ? {} : { count }) }),
  });
  if (!response.ok) throw await readApiError(response, "Не удалось сохранить источник новинок", {
    "Подборка не найдена": "Подборка не найдена — обновите страницу",
    "Выберите опубликованную подборку": "Выберите опубликованную подборку",
    "В подборке нет активных товаров": "В подборке нет активных товаров",
    "Количество товаров должно быть от 1 до 100": "Укажите количество товаров от 1 до 100",
  });
  return normalizeStorefrontHome(await adminJson(response));
}

const SECTION_MESSAGES: Readonly<Record<string, string>> = {
  "Section image exceeds 10 MB": "Фото должно быть не больше 10 МБ",
  "Unsupported section image type": "Разрешены только JPEG, PNG и WebP",
  "Section image content does not match MIME type": "Содержимое фото не соответствует формату файла",
  "File is empty": "Выберите непустую фотографию",
  "Выберите категорию или подборку": "Выберите категорию или подборку",
  "Позиция изображения должна быть от 0 до 100": "Позиция изображения должна быть от 0 до 100",
  "Выберите удаление или замену обложки": "Выберите удаление или замену обложки",
  "Этот раздел уже добавлен на главную": "Этот раздел уже добавлен на главную",
  "Категория не найдена": "Категория не найдена",
  "Подборка не найдена": "Подборка не найдена",
  "Выберите доступный опубликованный раздел": "Выберите доступный опубликованный раздел",
  "Загрузите обложку перед публикацией": "Загрузите обложку перед публикацией",
  "Раздел не найден": "Раздел не найден",
  "Передайте все разделы без повторов": "Передайте все разделы без повторов",
  "Фото больше 10 МБ": "Фото больше 10 МБ",
  "Разрешены только JPEG, PNG и WebP": "Разрешены только JPEG, PNG и WebP",
  "Не удалось прочитать фото — выберите JPEG, PNG или WebP": "Не удалось прочитать фото — выберите JPEG, PNG или WebP",
  "Содержимое фото не соответствует формату файла": "Содержимое фото не соответствует формату файла",
  "Другая фотография ещё обрабатывается, повторите загрузку": "Другая фотография ещё обрабатывается — повторите загрузку",
  "Обработка фотографий временно недоступна": "Обработка фотографий временно недоступна — попробуйте ещё раз",
  "Фото должно быть не больше 48 мегапикселей и 16384 пикселей по стороне": "Фото должно быть не больше 48 мегапикселей и 16384 пикселей по стороне",
  "Выберите статичную фотографию без анимации": "Выберите статичную фотографию без анимации",
  "Не удалось прочитать фото или его содержимое не соответствует JPEG/PNG/WebP": "Не удалось прочитать фото — выберите JPEG, PNG или WebP",
};

async function sectionRequest(path: string, options: RequestInit, fallback: string) {
  const response = await requestApiResponse(`${API_URL}/api/admin/storefront/home/sections${path}`,
    options, "Не удалось получить результат действия — обновите данные перед повтором", 60_000);
  if (!response.ok) throw await readApiError(response,
    response.status === 413 ? "Фото должно быть не больше 10 МБ" : fallback, SECTION_MESSAGES);
  return response;
}

export async function saveAdminStorefrontSection(
  id: number | null, payload: AdminStorefrontSectionRequest,
): Promise<AdminStorefrontSection> {
  if (payload.file) {
    const error = getImageUploadMetadataError(payload.file);
    if (error) throw new Error(error);
  }
  const body = new FormData();
  body.set("kind", payload.kind);
  body.set("targetId", String(payload.targetId));
  body.set("active", String(payload.active));
  body.set("coverPositionX", String(Math.round(payload.coverPositionX)));
  body.set("coverPositionY", String(Math.round(payload.coverPositionY)));
  body.set("removeCover", String(payload.removeCover === true));
  if (payload.file) body.set("file", payload.file);
  const response = await sectionRequest(id === null ? "" : `/${id}`, {
    method: id === null ? "POST" : "PUT", body,
  }, "Не удалось сохранить раздел — проверьте цель и обложку");
  try {
    const section = normalizeStorefrontSections([await adminJson(response)])[0];
    if (!section || (id !== null && section.id !== id) || section.kind !== payload.kind || section.targetId !== payload.targetId) throw new Error();
    return section;
  } catch (reason) {
    if (isRequestCancelled(reason) || reason instanceof ApiRequestError) throw reason;
    throw new ApiRequestError("Не удалось прочитать сохранённый раздел — обновите список", "invalid-response");
  }
}

export async function deleteAdminStorefrontSection(id: number): Promise<void> {
  await sectionRequest(`/${id}`, { method: "DELETE" }, "Не удалось удалить раздел");
}

export async function reorderAdminStorefrontSections(ids: number[]): Promise<AdminStorefrontSection[]> {
  const response = await sectionRequest("/order", {
    method: "PATCH", body: JSON.stringify({ ids }),
  }, "Не удалось изменить порядок — обновите список");
  try {
    const raw: unknown = await adminJson(response);
    const sections = normalizeStorefrontSections(raw);
    if (!Array.isArray(raw) || raw.length !== ids.length || sections.length !== ids.length || sections.some((section, index) => section.id !== ids[index])) throw new Error();
    return sections;
  } catch (reason) {
    if (isRequestCancelled(reason) || reason instanceof ApiRequestError) throw reason;
    throw new ApiRequestError("Не удалось прочитать порядок разделов — обновите список", "invalid-response");
  }
}

export async function uploadAdminStorefrontHero(
  file: File
): Promise<AdminStorefrontHome> {
  const validationMessage = getImageUploadMetadataError(file);
  if (validationMessage) throw new Error(validationMessage);
  const formData = new FormData();
  formData.append("file", file);

  const response = await adminFetch(
    `${API_URL}/api/admin/storefront/home/hero-image`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw await readApiError(response,
      response.status === 413 ? "Фото должно быть не больше 10 МБ"
        : response.status === 503 ? "Обработка фотографий временно недоступна — попробуйте ещё раз"
          : "Не удалось загрузить изображение витрины",
      {
        "Фото должно быть не больше 10 МБ": "Фото должно быть не больше 10 МБ",
        "Фото должно быть не больше 48 мегапикселей и 16384 пикселей по стороне": "Фото должно быть не больше 48 мегапикселей и 16384 пикселей по стороне",
        "Выберите одну статичную фотографию": "Выберите одну статичную фотографию",
        "Выберите статичную фотографию без анимации": "Выберите статичную фотографию без анимации",
        "Не удалось прочитать фотографию": "Не удалось прочитать фотографию — выберите другой файл",
        "Не удалось прочитать фото или его содержимое не соответствует JPEG/PNG/WebP": "Не удалось прочитать фото — выберите JPEG, PNG или WebP",
        "Содержимое фото не соответствует формату файла": "Содержимое фото не соответствует формату файла",
        "Разрешены только JPEG, PNG и WebP": "Разрешены только JPEG, PNG и WebP",
        "Другая фотография ещё обрабатывается, повторите загрузку": "Другая фотография ещё обрабатывается — повторите загрузку",
        "Обработка фотографий временно недоступна": "Обработка фотографий временно недоступна — попробуйте ещё раз",
      },
    );
  }

  return normalizeStorefrontHome(await adminJson(response));
}

export async function updateAdminStorefrontHeroPosition(
  x: number,
  y: number
): Promise<AdminStorefrontHome> {
  const response = await adminFetch(
    `${API_URL}/api/admin/storefront/home/hero-position`,
    {
      method: "PATCH",
      body: JSON.stringify({ x: Math.round(x), y: Math.round(y) }),
    }
  );
  if (!response.ok) {
    throw await readApiError(response, "Не удалось сохранить позицию изображения", ADMIN_API_MESSAGES);
  }
  return normalizeStorefrontHome(await adminJson(response));
}

export async function getAdminStorefrontProducts(
  page = 0,
  size = 24,
  query = ""
): Promise<PageResponse<AdminStorefrontProduct>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (query.trim()) params.set("q", query.trim());
  const response = await adminFetch(
    `${API_URL}/api/admin/storefront/home/available-products?${params.toString()}`
  );
  if (!response.ok) throw await readApiError(response, "Не удалось загрузить товары", ADMIN_API_MESSAGES);
  const data: unknown = await adminJson(response);
  const record = data && typeof data === "object"
    ? (data as Record<string, unknown>)
    : {};
  const content = Array.isArray(record.content)
    ? record.content.flatMap((item) => {
        const product = normalizeStorefrontProduct(item);
        return product ? [product] : [];
      })
    : [];
  return {
    content,
    totalElements:
      typeof record.totalElements === "number" ? record.totalElements : content.length,
    totalPages: typeof record.totalPages === "number" ? record.totalPages : 1,
    size: typeof record.size === "number" ? record.size : size,
    number: typeof record.number === "number" ? record.number : page,
  };
}

export async function createAdminStorefrontCollection(
  payload: AdminStorefrontCollectionRequest
): Promise<AdminStorefrontCollection> {
  const response = await adminFetch(`${API_URL}/api/admin/storefront/home/collections`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await readApiError(response, "Не удалось создать подборку", ADMIN_API_MESSAGES);
  return normalizeStorefrontCollections([await adminJson(response)])[0];
}

export async function updateAdminStorefrontCollection(
  id: number,
  payload: AdminStorefrontCollectionRequest
): Promise<AdminStorefrontCollection> {
  const response = await adminFetch(`${API_URL}/api/admin/storefront/home/collections/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await readApiError(response, "Не удалось обновить подборку", ADMIN_API_MESSAGES);
  return normalizeStorefrontCollections([await adminJson(response)])[0];
}

export async function deleteAdminStorefrontCollection(id: number): Promise<void> {
  const response = await adminFetch(`${API_URL}/api/admin/storefront/home/collections/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw await readApiError(response, "Не удалось удалить подборку", ADMIN_API_MESSAGES);
}

export async function reorderAdminStorefrontCollections(
  collectionIds: number[]
): Promise<AdminStorefrontCollection[]> {
  const response = await adminFetch(`${API_URL}/api/admin/storefront/home/collections/order`, {
    method: "PUT",
    body: JSON.stringify({ collectionIds }),
  });
  if (!response.ok) throw await readApiError(response, "Не удалось изменить порядок", ADMIN_API_MESSAGES);
  return normalizeStorefrontCollections(await adminJson(response));
}
