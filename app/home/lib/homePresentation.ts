import type { HomeProduct, ProductShowcaseData } from "../types";
import type { StorefrontHomeCollection } from "./getStorefrontHome";
import type { StorefrontSection } from "../../lib/storefrontSections";
import { buildCategoryTree, categoryFacetTotals, categoryValue, type CategoryFacet, type CategoryOption } from "../../lib/categories";

export type HomeAudience = "men" | "women" | "all";

export function homeCatalogHref(audience: HomeAudience, filters: Record<string, string> = {}) {
  const search = new URLSearchParams(filters);
  if (audience !== "all") search.set("audience", audience);
  return `/catalog${search.size ? `?${search}` : ""}`;
}

/** A cover belongs to the editorial entry, independently of its target's products. */
export function buildHomeSectionCards(sections: StorefrontSection[], audience: HomeAudience = "all") {
  return sections.filter(section => section.active && section.available && section.coverImageUrl)
    .slice().sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    .map(section => ({ ...section, href: homeCatalogHref(audience, section.kind === "CATEGORY"
      ? { category: section.targetSlug || String(section.targetId) }
      : { collection: String(section.targetId) }) }));
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
export function homeCategories(categories: CategoryOption[], facets: CategoryFacet[], audience: HomeAudience, includeEmpty = false) {
  const totals = categoryFacetTotals(categories, facets);
  return buildCategoryTree(categories)
    .filter(category => category.effectiveActive && (includeEmpty || (totals.get(category.id) ?? 0) > 0))
    .map(category => ({ title: category.label, href: homeCatalogHref(audience, { category: categoryValue(category) }) }));
}

export type HomeNavigationItem = {
  title: string;
  href: string;
  kind: "catalog" | "category" | "collection";
};

/** Categories and editorial collections share one storefront navigation. */
export function buildHomeNavigation(
  categories: { title: string; href: string }[],
  collections: StorefrontHomeCollection[],
  audience: HomeAudience = "all",
): HomeNavigationItem[] {
  const primaryCategories = ["Одежда", "Аксессуары"].flatMap(title => {
    const category = categories.find(item => item.title.trim().toLocaleLowerCase("ru-RU") === title.toLocaleLowerCase("ru-RU"));
    return category ? [{ ...category, title, kind: "category" as const }] : [];
  });
  return [
    { title: "Весь каталог", href: homeCatalogHref(audience), kind: "catalog" },
    ...primaryCategories,
    { title: "Подарки", href: audience === "all" ? "/gifts" : `/gifts?audience=${audience}`, kind: "collection" },
    ...collections.filter(item => item.products.length > 0 && item.title.trim().toLocaleLowerCase("ru-RU") !== "подарки")
      .map(item => ({ title: item.title, href: homeCatalogHref(audience, { collection: String(item.id) }), kind: "collection" as const })),
  ];
}

