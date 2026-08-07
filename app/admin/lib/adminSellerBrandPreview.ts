import type { CatalogProduct } from "../../components/Catalog/catalogTypes";
import { normalizeProducts } from "../../components/Catalog/catalogUtils";
import { API_URL, apiFetch } from "../../lib/api";

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
  allowNameFallback: boolean;
  signal?: AbortSignal;
}): Promise<AdminSellerBrandPreview | null> {
  const cacheKey = [
    params.userId,
    params.brandName.trim().toLocaleLowerCase("ru-RU"),
    params.allowNameFallback ? "fallback" : "owner",
  ].join(":");

  if (previewCache.has(cacheKey)) {
    return previewCache.get(cacheKey) ?? null;
  }

  const pending = pendingPreviews.get(cacheKey);
  if (pending) return pending;

  const request = loadAdminSellerBrandPreview(params)
    .then((preview) => {
      previewCache.set(cacheKey, preview);
      return preview;
    })
    .finally(() => pendingPreviews.delete(cacheKey));

  pendingPreviews.set(cacheKey, request);
  return request;
}

async function loadAdminSellerBrandPreview(params: {
  userId: number;
  brandName: string;
  allowNameFallback: boolean;
  signal?: AbortSignal;
}): Promise<AdminSellerBrandPreview | null> {
  const reference = await resolveBrandReference(params);

  if (!reference) return null;

  const [brandResponse, productsResponse] = await Promise.all([
    apiFetch(`${API_URL}/api/brands/${encodeURIComponent(reference.slug)}`, {
      signal: params.signal,
    }),
    apiFetch(
      `${API_URL}/api/products/brand/${encodeURIComponent(
        reference.slug
      )}?page=0&size=12`,
      { signal: params.signal }
    ),
  ]);

  const brand = brandResponse.ok
    ? normalizePublicBrand(await brandResponse.json(), reference)
    : null;

  if (!productsResponse.ok) {
    return { reference, brand, products: [], totalProducts: 0 };
  }

  const productsData: unknown = await productsResponse.json();
  const productsRecord = isRecord(productsData) ? productsData : {};

  return {
    reference,
    brand,
    products: normalizeProducts(productsRecord.content),
    totalProducts:
      typeof productsRecord.totalElements === "number"
        ? productsRecord.totalElements
        : 0,
  };
}

async function resolveBrandReference(params: {
  userId: number;
  brandName: string;
  allowNameFallback: boolean;
  signal?: AbortSignal;
}) {
  const query = new URLSearchParams({
    userId: String(params.userId),
    brandName: params.brandName.trim(),
    allowNameFallback: String(params.allowNameFallback),
  });
  const response = await apiFetch(
    `${API_URL}/api/admin/dictionaries/brands/resolve?${query.toString()}`,
    { signal: params.signal }
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error("Не удалось загрузить связь продавца с брендом");
  }

  return normalizeBrandReferences([await response.json()])[0] ?? null;
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
