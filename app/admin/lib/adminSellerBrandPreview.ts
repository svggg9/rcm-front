import type { CatalogProduct } from "../../components/Catalog/catalogTypes";
import { normalizeProducts } from "../../components/Catalog/catalogUtils";
import { API_URL } from "../../lib/api";
import { ApiRequestError, isRequestCancelled, readApiError, readApiJson, toApiError } from "../../lib/apiErrors";
import { requestApiResponse } from "../../lib/apiRequest";

type AdminBrandReference = {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
  logoUrl: string | null;
  wordmarkUrl: string | null;
  ownerUserId: number | null;
  ownerUsername: string | null;
  ownerDisplayName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
};

export type AdminSellerPublicBrand = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  wordmarkUrl: string | null;
  website: string | null;
  telegram: string | null;
  vk: string | null;
  country: string | null;
  foundationYear: number | null;
  images: Array<{
    id: number;
    imageUrl: string;
    sortOrder: number;
  }>;
  collectionsCount: number;
};

export type AdminSellerBrandPreview = {
  reference: AdminBrandReference;
  brand: AdminSellerPublicBrand | null;
  products: CatalogProduct[];
  totalProducts: number;
};

const previewCache = new Map<string, AdminSellerBrandPreview | null>();
const pendingPreviews = new Map<
  string,
  Promise<AdminSellerBrandPreview | null>
>();

export async function getAdminSellerBrandPreview(params: {
  userId: number;
  brandName: string;
  brandId?: number;
  allowNameFallback: boolean;
  signal?: AbortSignal;
}): Promise<AdminSellerBrandPreview | null> {
  if (params.signal?.aborted) throw new DOMException("Запрос отменён", "AbortError");
  const cacheKey = [
    params.userId, params.brandId ?? "",
    params.brandName.trim().toLocaleLowerCase("ru-RU"),
    params.allowNameFallback ? "fallback" : "owner",
  ].join(":");

  if (previewCache.has(cacheKey)) {
    return previewCache.get(cacheKey) ?? null;
  }

  // A caller-owned signal must never cancel another consumer's shared promise.
  const pending = params.signal ? undefined : pendingPreviews.get(cacheKey);
  if (pending) return pending;

  const request: Promise<AdminSellerBrandPreview | null> = loadAdminSellerBrandPreview(params)
    .then((preview) => {
      if (preview && !params.signal?.aborted) previewCache.set(cacheKey, preview);
      return preview;
    })
    .catch((reason: unknown) => {
      if (isRequestCancelled(reason)) throw reason;
      throw toApiError(reason, "Не удалось загрузить данные бренда — попробуйте ещё раз");
    })
    .finally(() => {
      if (pendingPreviews.get(cacheKey) === request) pendingPreviews.delete(cacheKey);
    });

  if (!params.signal) pendingPreviews.set(cacheKey, request);
  return request;
}

async function loadAdminSellerBrandPreview(params: {
  userId: number;
  brandName: string;
  brandId?: number;
  allowNameFallback: boolean;
  signal?: AbortSignal;
}): Promise<AdminSellerBrandPreview | null> {
  const reference = await resolveBrandReference(params);

  if (!reference) return null;

  const [brandResponse, productsResponse] = await Promise.all([
    requestApiResponse(`${API_URL}/api/brands/${encodeURIComponent(reference.slug)}`, {
      signal: params.signal,
    }, "Не удалось загрузить профиль бренда — попробуйте ещё раз"),
    requestApiResponse(
      `${API_URL}/api/products/brand/${encodeURIComponent(
        reference.slug
      )}?page=0&size=12`,
      { signal: params.signal }, "Не удалось загрузить товары магазина — попробуйте ещё раз"
    ),
  ]);

  if (!brandResponse.ok && brandResponse.status !== 404) {
    throw await readApiError(brandResponse, "Не удалось загрузить профиль бренда — попробуйте ещё раз");
  }
  const brandData: unknown = brandResponse.ok
    ? await readApiJson(brandResponse, "Не удалось прочитать профиль бренда — попробуйте ещё раз")
    : null;
  if (brandResponse.ok && (!isRecord(brandData) || typeof brandData.name !== "string" || brandData.slug !== reference.slug)) {
    throw new ApiRequestError("Не удалось прочитать профиль бренда — попробуйте ещё раз", "invalid-response");
  }
  const brand = brandData ? normalizePublicBrand(brandData, reference) : null;

  if (!productsResponse.ok) {
    throw await readApiError(productsResponse, "Не удалось загрузить товары магазина — попробуйте ещё раз");
  }

  const productsData: unknown = await readApiJson(productsResponse, "Не удалось прочитать товары магазина — попробуйте ещё раз");
  if (!isRecord(productsData) || !Array.isArray(productsData.content)
    || !Number.isSafeInteger(productsData.totalElements) || (productsData.totalElements as number) < productsData.content.length
    || productsData.content.some(item => !isRecord(item) || !Number.isSafeInteger(item.id) || typeof item.title !== "string")) {
    throw new ApiRequestError("Не удалось прочитать товары магазина — попробуйте ещё раз", "invalid-response");
  }

  return {
    reference,
    brand,
    products: normalizeProducts(productsData.content),
    totalProducts: productsData.totalElements as number,
  };
}

async function resolveBrandReference(params: {
  userId: number;
  brandName: string;
  brandId?: number;
  allowNameFallback: boolean;
  signal?: AbortSignal;
}) {
  const query = new URLSearchParams({
    userId: String(params.userId),
    brandName: params.brandName.trim(),
    allowNameFallback: String(params.allowNameFallback),
  });
  if(params.brandId) query.set("brandId",String(params.brandId));
  const response = await requestApiResponse(
    `${API_URL}/api/admin/dictionaries/brands/resolve?${query.toString()}`,
    { signal: params.signal }, "Не удалось загрузить связь продавца с брендом — попробуйте ещё раз"
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    throw await readApiError(response, "Не удалось загрузить связь продавца с брендом — попробуйте ещё раз");
  }

  const value = await readApiJson(response, "Не удалось прочитать связь продавца с брендом — попробуйте ещё раз");
  const reference = normalizeBrandReferences([value])[0];
  if (!reference) throw new ApiRequestError("Не удалось прочитать связь продавца с брендом — попробуйте ещё раз", "invalid-response");
  return reference;
}

function normalizeBrandReferences(value: unknown): AdminBrandReference[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    if (
      typeof item.id !== "number" ||
      typeof item.name !== "string" ||
      typeof item.slug !== "string"
    ) {
      return [];
    }

    return [
      {
        id: item.id,
        name: item.name,
        slug: item.slug,
        isActive: item.isActive === true,
        logoUrl: stringOrNull(item.logoUrl),
        wordmarkUrl: stringOrNull(item.wordmarkUrl),
        ownerUserId:
          typeof item.ownerUserId === "number" ? item.ownerUserId : null,
        ownerUsername: stringOrNull(item.ownerUsername),
        ownerDisplayName: stringOrNull(item.ownerDisplayName),
        ownerEmail: stringOrNull(item.ownerEmail),
        ownerPhone: stringOrNull(item.ownerPhone),
      },
    ];
  });
}

function normalizePublicBrand(
  value: unknown,
  reference: AdminBrandReference
): AdminSellerPublicBrand | null {
  if (!isRecord(value)) return null;

  const images = Array.isArray(value.images)
    ? value.images.flatMap((item) => {
        if (
          !isRecord(item) ||
          typeof item.id !== "number" ||
          typeof item.imageUrl !== "string"
        ) {
          return [];
        }

        return [
          {
            id: item.id,
            imageUrl: item.imageUrl,
            sortOrder:
              typeof item.sortOrder === "number" ? item.sortOrder : 0,
          },
        ];
      })
    : [];

  return {
    id: typeof value.id === "number" ? value.id : reference.id,
    name: typeof value.name === "string" ? value.name : reference.name,
    slug: typeof value.slug === "string" ? value.slug : reference.slug,
    description: stringOrNull(value.description),
    logoUrl: stringOrNull(value.logoUrl) ?? reference.logoUrl,
    wordmarkUrl: stringOrNull(value.wordmarkUrl) ?? reference.wordmarkUrl,
    website: stringOrNull(value.website),
    telegram: stringOrNull(value.telegram),
    vk: stringOrNull(value.vk),
    country: stringOrNull(value.country),
    foundationYear:
      typeof value.foundationYear === "number" ? value.foundationYear : null,
    images: images.sort(
      (left, right) => left.sortOrder - right.sortOrder || left.id - right.id
    ),
    collectionsCount: Array.isArray(value.collections)
      ? value.collections.length
      : 0,
  };
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
