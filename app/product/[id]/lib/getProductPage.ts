import { cache } from "react";
import { API_URL } from "../../../lib/config";
import { ApiRequestError, toApiError } from "../../../lib/apiErrors";
import { mapProductToCarouselProduct } from "../../../lib/productMappers";
import type { CarouselProduct } from "../../../components/ProductCarousel/types";
import type { Product, ProductColorway, Variant } from "./types";

const FAILURE_MESSAGE = "Не удалось загрузить товар — попробуйте ещё раз";
const INVALID_MESSAGE = "Не удалось прочитать сведения о товаре — попробуйте ещё раз";

export type ProductPageData = {
  product: Product;
  related: CarouselProduct[];
};

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function positiveId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function nullableText(value: unknown): value is string | null | undefined {
  return value == null || typeof value === "string";
}

function imageList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(image => typeof image === "string");
}

/** Reject malformed purchase data as an unavailable response, never as a 404. */
function productPayload(value: unknown): Product | null {
  if (!record(value) || !positiveId(value.id) || !positiveId(value.sellerId) ||
      typeof value.title !== "string" || !value.title.trim() ||
      ![value.description, value.brand, value.category, value.publicId, value.brandSlug,
        value.brandDescription, value.composition, value.article].every(nullableText) ||
      !imageList(value.images) || !Array.isArray(value.variants)) return null;

  const variants: Variant[] = [];
  for (const item of value.variants) {
    if (!record(item) || !positiveId(item.id) || typeof item.price !== "number" ||
        !Number.isFinite(item.price) || item.price < 0 ||
        ![item.size, item.color, item.sku].every(nullableText) ||
        !(item.availableQuantity == null || (typeof item.availableQuantity === "number" &&
          Number.isSafeInteger(item.availableQuantity) && item.availableQuantity >= 0))) return null;
    variants.push({ ...item, size: item.size ?? "", color: item.color ?? "", sku: item.sku ?? "",
      availableQuantity: item.availableQuantity ?? null } as Variant);
  }

  const colorways: ProductColorway[] = [];
  if (value.colorways != null) {
    if (!Array.isArray(value.colorways)) return null;
    for (const item of value.colorways) {
      if (!record(item) || !positiveId(item.id) || !nullableText(item.color) || !imageList(item.images)) return null;
      colorways.push({ ...item, color: item.color ?? "" } as ProductColorway);
    }
  }

  return { ...value, description: value.description ?? "", brand: value.brand ?? "",
    category: value.category ?? "", variants, colorways } as Product;
}

/** A bad optional recommendation must not hide an otherwise valid product. */
function relatedPayload(value: unknown): CarouselProduct[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (!record(item) || !positiveId(item.id) || typeof item.title !== "string" || !item.title.trim()) return [];
    const variants = Array.isArray(item.variants) ? item.variants.flatMap(variant =>
      record(variant) && typeof variant.price === "number" && Number.isFinite(variant.price) && variant.price >= 0
        ? [{ price: variant.price }] : []) : [];
    return [mapProductToCarouselProduct({
      id: item.id, title: item.title, publicId: typeof item.publicId === "string" ? item.publicId : null,
      brand: typeof item.brand === "string" ? item.brand : null,
      category: typeof item.category === "string" ? item.category : null,
      coverImage: typeof item.coverImage === "string" ? item.coverImage : null,
      hoverImage: typeof item.hoverImage === "string" ? item.hoverImage : null,
      images: Array.isArray(item.images) ? item.images.filter((image): image is string => typeof image === "string") : [],
      minPrice: typeof item.minPrice === "number" && Number.isFinite(item.minPrice) && item.minPrice >= 0
        ? item.minPrice : null,
      variants,
    })];
  });
}

export async function loadProductPage(id: string): Promise<ProductPageData | null> {
  const signal = AbortSignal.timeout(20_000);
  try {
    const response = await fetch(`${API_URL}/api/products/${encodeURIComponent(id)}/page?relatedLimit=12`, {
      cache: "no-store", signal,
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new ApiRequestError(response.status === 429
      ? "Слишком много запросов — попробуйте позже" : FAILURE_MESSAGE, "http", response.status);
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      if (signal.aborted) throw signal.reason;
      throw new ApiRequestError(INVALID_MESSAGE, "invalid-response");
    }
    const product = record(data) ? productPayload(data.product) : null;
    if (!product) throw new ApiRequestError(INVALID_MESSAGE, "invalid-response");
    return { product, related: relatedPayload(record(data) ? data.related : null) };
  } catch (error) {
    throw toApiError(signal.aborted ? signal.reason : error, FAILURE_MESSAGE);
  }
}

// Metadata and the page share one result within an RSC request. Refresh starts a new request.
export const getProductPage = cache(loadProductPage);
