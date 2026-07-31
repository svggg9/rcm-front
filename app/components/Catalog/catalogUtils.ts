import type {
  CatalogCategory,
  CatalogCategoryGroup,
  CatalogView,
  CatalogProduct,
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

const CATEGORY_GROUPS = [
  {
    name: "Одежда",
    keywords: [
      "футбол",
      "майк",
      "топ",
      "лонгслив",
      "свит",
      "худи",
      "толстов",
      "рубаш",
      "блуз",
      "плать",
      "юбк",
      "брюк",
      "джинс",
      "шорт",
      "костюм",
      "пиджак",
      "жакет",
      "куртк",
      "пальто",
      "жилет",
      "бель",
      "купаль",
      "легинс",
      "олимп",
      "поло",
      "носк",
      "одежд",
    ],
  },
  {
    name: "Обувь",
    keywords: [
      "кроссов",
      "кед",
      "ботин",
      "сапог",
      "туфл",
      "лофер",
      "сандал",
      "босонож",
      "тапоч",
      "обув",
    ],
  },
  {
    name: "Аксессуары",
    keywords: [
      "сумк",
      "рюкзак",
      "кошел",
      "ремн",
      "головн",
      "шапк",
      "панам",
      "кепк",
      "шарф",
      "перчат",
      "очк",
      "украшен",
      "аксессуар",
    ],
  },
] as const;

function normalizeCategoryName(value: string): string {
  return value.trim().toLocaleLowerCase("ru");
}

function childLabel(categoryName: string): string {
  const parts = categoryName.split("/").map((part) => part.trim());
  return parts.length > 1 ? parts.slice(1).join(" / ") : categoryName.trim();
}

function dedupeCategoryChildren(
  categories: CatalogCategory[]
): Array<CatalogCategory & { label: string }> {
  const byLabel = new Map<string, CatalogCategory & { label: string }>();

  for (const category of categories) {
    const label = childLabel(category.name);
    const key = normalizeCategoryName(label);
    const previous = byLabel.get(key);

    if (!previous || (previous.name.includes("/") && !category.name.includes("/"))) {
      byLabel.set(key, { ...category, label });
    }
  }

  return Array.from(byLabel.values());
}

export function groupCatalogCategories(
  categories: CatalogCategory[]
): CatalogCategoryGroup[] {
  const assigned = new Set<number>();
  const result: CatalogCategoryGroup[] = [];
  const knownNames = new Set(CATEGORY_GROUPS.map((group) => normalizeCategoryName(group.name)));

  for (const group of CATEGORY_GROUPS) {
    const groupName = normalizeCategoryName(group.name);
    const rootCategory = categories.find(
      (category) => normalizeCategoryName(category.name) === groupName
    );
    if (rootCategory) assigned.add(rootCategory.id);

    const matches = categories.filter((category) => {
      if (category.id === rootCategory?.id) return false;
      const [parent] = category.name.split("/").map((part) => part.trim());
      const hasExplicitParent = category.name.includes("/");
      const normalized = normalizeCategoryName(category.name);
      const isMatch = hasExplicitParent
        ? normalizeCategoryName(parent) === groupName
        : group.keywords.some((keyword) => normalized.includes(keyword));

      if (isMatch) assigned.add(category.id);
      return isMatch;
    });

    if (rootCategory || matches.length > 0) {
      result.push({
        name: group.name,
        rootCategory,
        categories: dedupeCategoryChildren(matches),
      });
    }
  }

  const explicitParents = Array.from(
    new Set(
      categories
        .filter((category) => category.name.includes("/"))
        .map((category) => category.name.split("/")[0].trim())
        .filter((parent) => !knownNames.has(normalizeCategoryName(parent)))
    )
  );

  for (const parent of explicitParents) {
    const rootCategory = categories.find(
      (category) => normalizeCategoryName(category.name) === normalizeCategoryName(parent)
    );
    if (rootCategory) assigned.add(rootCategory.id);

    const matches = categories.filter((category) => {
      if (!category.name.includes("/")) return false;
      const explicitParent = category.name.split("/")[0].trim();
      const isMatch = normalizeCategoryName(explicitParent) === normalizeCategoryName(parent);
      if (isMatch) assigned.add(category.id);
      return isMatch;
    });

    result.push({
      name: parent,
      rootCategory,
      categories: dedupeCategoryChildren(matches),
    });
  }

  for (const category of categories) {
    if (assigned.has(category.id)) continue;
    result.push({ name: category.name, rootCategory: category, categories: [] });
  }

  return result;
}

export function expandCategorySelection(
  selectedCategory: string,
  groups: CatalogCategoryGroup[]
): string[] {
  if (!selectedCategory) return [];

  const group = groups.find(
    (item) => normalizeCategoryName(item.name) === normalizeCategoryName(selectedCategory)
  );

  if (!group) return [selectedCategory];

  return Array.from(
    new Set([
      ...(group.rootCategory ? [group.rootCategory.name] : []),
      ...group.categories.map((category) => category.name),
    ])
  );
}

export function firstSearchParam(value: CatalogSearchParamValue): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
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
  audience?: string;
  category?: string;
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

  if (params.category) {
    searchParams.set("category", params.category);
  }

  params.brands?.forEach((brand) => searchParams.append("brands", brand));
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
  return query ? `/catalog?${query}` : "/catalog";
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

