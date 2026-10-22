import type { HomeProduct, ProductShowcaseData } from "../types";
import type { StorefrontHomeCollection } from "./getStorefrontHome";
import { buildCategoryTree, categoryFacetTotals, categoryValue, type CategoryFacet, type CategoryOption } from "../../lib/categories";

export type HomeAudience = "men" | "women" | "all";

export function homeCatalogHref(audience: HomeAudience, filters: Record<string, string> = {}) {
  const search = new URLSearchParams(filters);
  if (audience !== "all") search.set("audience", audience);
  return `/catalog${search.size ? `?${search}` : ""}`;
}

export function normalizeHomeProducts(data: unknown, audience: HomeAudience = "all"): HomeProduct[] {
  if (!Array.isArray(data)) return [];
  const seen = new Set<number>();
  return data.flatMap((raw): HomeProduct[] => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    if (typeof item.id !== "number" || !Number.isSafeInteger(item.id) || item.id <= 0 || seen.has(item.id) ||
      typeof item.title !== "string" || !item.title.trim() || item.inStock === false) return [];
    const productAudience = item.audience === "MEN" || item.audience === "WOMEN" ? item.audience : "UNISEX";
    if (audience !== "all" && productAudience !== "UNISEX" && productAudience !== audience.toUpperCase()) return [];
    seen.add(item.id);
    const images = (Array.isArray(item.images) ? item.images : [item.coverImage, item.hoverImage])
      .filter((image): image is string => typeof image === "string" && Boolean(image.trim()));
    return [{
      id: item.id, title: item.title.trim(), publicId: typeof item.publicId === "string" ? item.publicId : null,
      brand: typeof item.brand === "string" && item.brand.trim() ? item.brand.trim() : null,
      category: typeof item.category === "string" ? item.category.trim() : null,
      audience: productAudience, images: [...new Set(images)],
      minPrice: typeof item.minPrice === "number" && Number.isFinite(item.minPrice) && item.minPrice > 0 ? item.minPrice : 0,
    }];
  });
}

/** Respect editorial ordering, but never repeat a product just to fill another row. */
export function buildHomeBlocks(
  products: HomeProduct[], audience: HomeAudience = "all",
  collections: StorefrontHomeCollection[] = [], excludeIds: number[] = [],
): ProductShowcaseData[] {
  const used = new Set(excludeIds);
  const blocks: ProductShowcaseData[] = [];
  for (const collection of collections) {
    const unique = normalizeHomeProducts(collection.products, audience).filter(product => !used.has(product.id)).slice(0, 4);
    if (!unique.length) continue;
    unique.forEach(product => used.add(product.id));
    blocks.push({ title: collection.title, description: collection.description,
      href: homeCatalogHref(audience, { collection: String(collection.id) }), products: unique });
  }
  if (!blocks.length) {
    const latest = products.filter(product => !used.has(product.id)).slice(0, 4);
    if (latest.length) blocks.push({ title: "Новинки", href: homeCatalogHref(audience, { sort: "newest" }), products: latest });
  }
  return blocks;
}

/** Use the shared hierarchy and complete audience facets, independently of the product preview page. */
export function homeCategories(categories: CategoryOption[], facets: CategoryFacet[], audience: HomeAudience) {
  const totals = categoryFacetTotals(categories, facets);
  return buildCategoryTree(categories)
    .filter(category => category.effectiveActive && (totals.get(category.id) ?? 0) > 0)
    .map(category => ({ title: category.label, href: homeCatalogHref(audience, { category: categoryValue(category) }) }));
}

