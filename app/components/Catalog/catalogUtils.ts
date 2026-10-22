import { buildCategoryTree, categoryDepth, categoryValue, findCategory, flattenCategoryTree } from "../../lib/categories";
import type {
  CatalogCategory,
  CatalogCategoryGroup,
  CatalogView,
  CatalogProduct,
  CatalogProductsQuery,
  CatalogSearchParamValue,
  SelectedAudience,
  SortValue,
} from "./catalogTypes";

export const audienceLabels: Record<SelectedAudience, string> = {
  men: "Для него",
  women: "Для неё",
  all: "Для всех",
};

export const sortLabels: Record<Exclude<SortValue, "">, string> = {
  newest: "Сначала новинки",
  "price-asc": "Цена по возрастанию",
  "price-desc": "Цена по убыванию",
};

export function groupCatalogCategories(categories: CatalogCategory[]): CatalogCategoryGroup[] {
  return buildCategoryTree(categories).map(root => ({
    name: root.label, value: categoryValue(root), rootCategory: root,
    categories: flattenCategoryTree(root.children),
  }));
}

export function expandCategorySelection(selectedCategory: string, groups: CatalogCategoryGroup[]): string[] {
  void groups;
  // The server resolves the stable selection and all descendants, including historical aliases.
  return selectedCategory ? [selectedCategory] : [];
}

export function getMobileCategoryChoices(
  groups: CatalogCategoryGroup[], availableValues: string[] | null, selectedCategories: string[],
  labels: Record<string, string> = {},
): Array<{ value: string; label: string; depth: number; path?: string; parentValue: string | null }> {
  const available = availableValues === null ? null : new Set(availableValues);
  const selected = new Set(selectedCategories);
  const dictionary = groups.flatMap(group => group.rootCategory ? [group.rootCategory, ...group.categories] : group.categories);
  const byId = new Map(dictionary.map(category => [category.id, category]));
  // Keep the navigation path to a selected category even when its facet count is zero.
  for (const value of selectedCategories) {
    let current = dictionary.find(category => categoryValue(category) === value);
    while (current) {
      selected.add(categoryValue(current));
      current = current.parentId === null ? undefined : byId.get(current.parentId);
    }
  }
  const choices = groups.flatMap(group => {
    const root = group.rootCategory;
    if (!root) return [];
    const children = group.categories.filter(category => available === null || available.has(categoryValue(category)) || selected.has(categoryValue(category)));
    if (available !== null && !available.has(group.value) && !selected.has(group.value) && children.length === 0) return [];
    return [{value: group.value, label: group.name, depth: 0, path: root.name, parentValue: null}, ...children.map(category => ({
      value: categoryValue(category), label: category.label, depth: categoryDepth(dictionary, category.id) - 1, path: category.name,
      parentValue: category.parentId === null ? null : categoryValue(byId.get(category.parentId)!),
    }))];
  });
  return [...choices, ...selectedCategories.filter(value => !choices.some(choice => choice.value === value))
    .map(value => ({value, label: labels[value] ?? value, depth: 0, path: labels[value] ?? value, parentValue: null}))];
}

export function firstSearchParam(value: CatalogSearchParamValue): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function canonicalCategoryName(value: string): string { return value.trim(); }

export function expandCategorySelections(categories: string[], groups: CatalogCategoryGroup[]): string[] {
  void groups;
  return [...new Set(categories)];
}

export function categoryGroupSelected(categories: string[], group: CatalogCategoryGroup): boolean {
  return categories.some(value => value === group.value || group.categories.some(child => categoryValue(child) === value));
}

export function toggleCategorySelection(categories: string[], category: string, groups: CatalogCategoryGroup[]): string[] {
  const root = groups.find(group => group.value === category);
  if (root) return [root.value];
  const parent = groups.find(group => group.categories.some(child => categoryValue(child) === category));
  if (!parent) return [category];
  const dictionary = parent.rootCategory ? [parent.rootCategory, ...parent.categories] : parent.categories;
  const byId = new Map(dictionary.map(item => [item.id, item]));
  const target = dictionary.find(item => categoryValue(item) === category)!;
  const isAncestor = (ancestorId: number, item: CatalogCategory) => {
    let parentId = item.parentId;
    while (parentId !== null) {
      if (parentId === ancestorId) return true;
      parentId = byId.get(parentId)?.parentId ?? null;
    }
    return false;
  };
  const siblings = categories.filter(value => {
    const item = parent.categories.find(child => categoryValue(child) === value);
    return item && (item.id === target.id || (!isAncestor(item.id, target) && !isAncestor(target.id, item)));
  });
  const next = siblings.includes(category) ? siblings.filter(value => value !== category) : [...siblings, category];
  return next.length ? next : [parent.value];
}

export function normalizeCategorySelection(categories: string[], groups: CatalogCategoryGroup[]): string[] {
  const dictionary = groups.flatMap(group => group.rootCategory ? [group.rootCategory, ...group.categories] : group.categories);
  // Unknown historical aliases stay in the request for the server to resolve; never broaden to all products.
  return [...new Set(categories.map(value => {
    const found = findCategory(dictionary, value);
    return found ? categoryValue(found) : value;
  }))];
}

export function categorySelectionLabel(value: string, groups: CatalogCategoryGroup[]): string {
  const dictionary = groups.flatMap(group => group.rootCategory ? [group.rootCategory, ...group.categories] : group.categories);
  return findCategory(dictionary, value)?.label ?? value;
}

export function normalizeSearchList(value: CatalogSearchParamValue): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];

  return Array.from(
    new Set(
      values
        .flatMap((item) => item.split(","))
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

export function parsePrice(value: CatalogSearchParamValue): number | undefined {
  const raw = firstSearchParam(value).trim();
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

type RawProduct = {
  id?: unknown;
  publicId?: unknown;
  title?: unknown;
  brand?: unknown;
  brandSlug?: unknown;
  category?: unknown;
  audience?: unknown;
  status?: unknown;
  coverImage?: unknown;
  hoverImage?: unknown;
  minPrice?: unknown;
  inStock?: unknown;

  images?: unknown;
  variants?: unknown;
};

export function getMinPrice(product: CatalogProduct): number {
  return product.minPrice;
}

/** The public products endpoint uses zero-based pages; catalog URLs use one-based pages. */
export function buildCatalogProductsQuery(params: CatalogProductsQuery): string {
  const search = new URLSearchParams();
  if (params.audience !== "all") search.set("audience", params.audience);
  params.categories.forEach((category) => search.append("categories", category));
  params.brands.forEach((brand) => search.append("brands", brand));
  params.sizes.forEach((size) => search.append("sizes", size));
  if (params.minPrice !== undefined) search.set("minPrice", String(params.minPrice));
  if (params.maxPrice !== undefined) search.set("maxPrice", String(params.maxPrice));
  if (params.q) search.set("q", params.q);
  if (params.sort) search.set("sort", params.sort);
  if (params.collectionId !== undefined) search.set("collectionId", String(params.collectionId));
  search.set("page", String(Math.max(0, params.page - 1)));
  search.set("size", "48");
  return search.toString();
}

export function normalizeAudience(value: string | null): SelectedAudience {
  if (value === "men" || value === "women") return value;
  return "all";
}

export function normalizeProducts(data: unknown): CatalogProduct[] {
  if (!Array.isArray(data)) return [];

  return data
    .map((item): CatalogProduct | null => {
      const product = item as RawProduct;

      if (typeof product.id !== "number" || typeof product.title !== "string") {
        return null;
      }

      const brand = typeof product.brand === "string" ? product.brand : "";

      const brandSlug =
        typeof product.brandSlug === "string" && product.brandSlug.length > 0
          ? product.brandSlug
          : null;

      const category =
        typeof product.category === "string" ? product.category : "";

      const audience =
        product.audience === "MEN" ||
        product.audience === "WOMEN" ||
        product.audience === "UNISEX"
          ? product.audience
          : "UNISEX";

      const coverImage =
        typeof product.coverImage === "string" && product.coverImage.length > 0
          ? product.coverImage
          : null;

      const hoverImage =
        typeof product.hoverImage === "string" &&
        product.hoverImage.length > 0 &&
        product.hoverImage !== coverImage
          ? product.hoverImage
          : null;

      const lightweightImages = [coverImage, hoverImage].filter(
        (image): image is string => typeof image === "string"
      );

      const fallbackImages = Array.isArray(product.images)
        ? product.images.filter(
            (image): image is string => typeof image === "string"
          )
        : [];

      const images =
        lightweightImages.length > 0 ? lightweightImages : fallbackImages;

      const fallbackVariants = Array.isArray(product.variants)
        ? product.variants
            .map((variant): { price: number } | null => {
              if (
                typeof variant === "object" &&
                variant !== null &&
                "price" in variant &&
                typeof (variant as { price?: unknown }).price === "number"
              ) {
                return { price: (variant as { price: number }).price };
              }

              return null;
            })
            .filter((variant): variant is { price: number } => variant !== null)
        : [];

      const minPrice =
        typeof product.minPrice === "number"
          ? product.minPrice
          : fallbackVariants.length
            ? Math.min(...fallbackVariants.map((variant) => variant.price))
            : 0;

      return {
        id: product.id,
        publicId:
          typeof product.publicId === "string" && product.publicId.length > 0
            ? product.publicId
            : null,
        title: product.title,
        brand,
        brandSlug,
        category,
        audience,
        status: typeof product.status === "string" ? product.status : null,
        images,
        variants: fallbackVariants,
        minPrice,
        inStock:
          typeof product.inStock === "boolean" ? product.inStock : undefined,
      };
    })
    .filter((product): product is CatalogProduct => product !== null);
}

export function parsePage(value?: CatalogSearchParamValue): number {
  const page = Number(firstSearchParam(value));
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.floor(page);
}

export function parsePositiveId(value?: CatalogSearchParamValue): number | undefined {
  const raw = firstSearchParam(value).trim();
  if (!/^\d+$/.test(raw)) return undefined;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

export function buildCatalogQuery(params: {
  basePath?: string;
  omitBrands?: boolean;
  audience?: string;
  category?: string;
  categories?: string[];
  brands?: string[];
  sizes?: string[];
  minPrice?: number;
  maxPrice?: number;
  q?: string;
  page?: number;
  sort?: SortValue;
  view?: CatalogView;
  collectionId?: number;
}): string {
  const searchParams = new URLSearchParams();

  if (params.audience && params.audience !== "all") {
    searchParams.set("audience", params.audience);
  }

  const categories = params.categories ?? (params.category ? [params.category] : []);
  Array.from(new Set(categories)).filter(Boolean).forEach((category) => searchParams.append("category", category));

  if (!params.omitBrands) params.brands?.forEach((brand) => searchParams.append("brands", brand));
  params.sizes?.forEach((size) => searchParams.append("sizes", size));

  if (params.minPrice !== undefined) {
    searchParams.set("minPrice", String(params.minPrice));
  }

  if (params.maxPrice !== undefined) {
    searchParams.set("maxPrice", String(params.maxPrice));
  }

  if (params.q) {
    searchParams.set("q", params.q);
  }

  if (params.page && params.page > 1) {
    searchParams.set("page", String(params.page));
  }

  if (params.sort) {
    searchParams.set("sort", params.sort);
  }

  if (params.view) {
    searchParams.set("view", params.view);
  }

  if (params.collectionId !== undefined) {
    searchParams.set("collection", String(params.collectionId));
  }

  const query = searchParams.toString();
  return query ? `${params.basePath ?? "/catalog"}?${query}` : params.basePath ?? "/catalog";
}

export function normalizeCatalogView(value?: string): CatalogView {
  return value === "new" ? "new" : "";
}

export function normalizeSort(value?: string): SortValue {
  if (value === "newest" || value === "price-asc" || value === "price-desc") {
    return value;
  }

  return "";
}
