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

export function getMobileCategoryChoices(
  groups: CatalogCategoryGroup[],
  availableNames: string[] | null,
  selectedCategories: string[]
): Array<{ value: string; label: string }> {
  const dictionary = groups.flatMap((group) => [
    ...(group.rootCategory ? [group.rootCategory.name] : []),
    ...group.categories.map((category) => category.name),
  ]);
  // Availability uses exact backend values. Grouping may deduplicate a plain
  // and a prefixed dictionary name; it must not discard a published category.
  const names = Array.from(new Set(availableNames ?? dictionary));
  selectedCategories.forEach((category) => {
    if (!names.includes(category)) names.push(category);
  });
  const labelFor = (name: string) => name.split("/").map((part) => part.trim()).filter(Boolean).at(-1) ?? name;
  const dictionaryIndex = (name: string) => {
    const index = dictionary.findIndex((item) => item === name || labelFor(item) === labelFor(name));
    return index < 0 ? dictionary.length : index;
  };
  names.sort((a, b) => dictionaryIndex(a) - dictionaryIndex(b) || a.localeCompare(b, "ru"));
  const labelCounts = new Map<string, number>();
  names.forEach((name) => labelCounts.set(labelFor(name), (labelCounts.get(labelFor(name)) ?? 0) + 1));
  return names.map((value) => ({
    value,
    label: (labelCounts.get(labelFor(value)) ?? 0) > 1 ? value : labelFor(value),
  }));
}

export function firstSearchParam(value: CatalogSearchParamValue): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function canonicalCategoryName(value: string): string {
  const name = value.trim();
  const [root, ...children] = name.split(" / ");
  return root === "Дом" || root === "Искусство"
    ? ["Дом и искусство", ...children].join(" / ")
    : name;
}

export function expandCategorySelections(
  categories: string[],
  groups: CatalogCategoryGroup[]
): string[] {
  return Array.from(new Set(categories.flatMap((category) => expandCategorySelection(category, groups))));
}

export function categoryGroupSelected(categories: string[], group: CatalogCategoryGroup): boolean {
  return categories.some((category) =>
    category === group.name || category === group.rootCategory?.name ||
    group.categories.some((child) => child.name === category)
  );
}

export function toggleCategorySelection(
  categories: string[],
  category: string,
  groups: CatalogCategoryGroup[]
): string[] {
  const root = groups.find((group) => group.name === category || group.rootCategory?.name === category);
  if (root) return [root.name];
  const parent = groups.find((group) => group.categories.some((child) => child.name === category));
  if (!parent) return [category];
  const siblings = categories.filter((value) => parent.categories.some((child) => child.name === value));
  const next = siblings.includes(category)
    ? siblings.filter((value) => value !== category)
    : [...siblings, category];
  return next.length > 0 ? next : [parent.name];
}

export function normalizeCategorySelection(categories: string[], groups: CatalogCategoryGroup[]): string[] {
  if (categories.length === 0) return [];
  const group = groups.find((item) => categoryGroupSelected([categories[0]], item));
  if (!group) return [categories[0]];
  if (categories.some((category) => category === group.name || category === group.rootCategory?.name)) {
    return [group.name];
  }
  return categories.filter((category) => categoryGroupSelected([category], group));
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
