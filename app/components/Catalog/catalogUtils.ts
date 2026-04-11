import type {
  Audience,
  CatalogProduct,
  PaginatedProducts,
  SelectedAudience,
  SortValue,
} from "./catalogTypes";

export const audienceLabels: Record<SelectedAudience, string> = {
  men: "Для него",
  women: "Для нее",
  all: "Для всех",
};

export const sortLabels: Record<Exclude<SortValue, "">, string> = {
  newest: "Новинки",
  "price-asc": "По возрастанию цены",
  "price-desc": "По убыванию цены",
};

type RawProduct = {
  id?: unknown;
  title?: unknown;
  brand?: unknown;
  category?: unknown;
  audience?: unknown;
  images?: unknown;
  variants?: unknown;
};

export function getMinPrice(product: CatalogProduct): number {
  if (!product.variants.length) return 0;
  return Math.min(...product.variants.map((variant) => variant.price));
}

export function normalizeAudience(value: string | null): SelectedAudience {
  if (value === "men" || value === "women") return value;
  return "all";
}

export function matchesAudience(
  productAudience: Audience,
  selectedAudience: SelectedAudience
): boolean {
  if (selectedAudience === "all") return true;
  if (selectedAudience === "men") {
    return productAudience === "MEN" || productAudience === "UNISEX";
  }
  return productAudience === "WOMEN" || productAudience === "UNISEX";
}

export function buildCatalogTitle(
  category: string,
  selectedAudience: SelectedAudience
): string {
  if (!category) {
    if (selectedAudience === "men") return "Все товары для мужчин";
    if (selectedAudience === "women") return "Все товары для женщин";
    return "Все товары";
  }

  if (selectedAudience === "men") return `${category} для мужчин`;
  if (selectedAudience === "women") return `${category} для женщин`;
  return category;
}

export function normalizeProducts(data: unknown): CatalogProduct[] {
  if (!Array.isArray(data)) return [];

  return data
    .map((item): CatalogProduct | null => {
      const product = item as RawProduct;

      if (
        typeof product.id !== "number" ||
        typeof product.title !== "string" ||
        typeof product.brand !== "string" ||
        typeof product.category !== "string"
      ) {
        return null;
      }

      const audience =
        product.audience === "MEN" ||
        product.audience === "WOMEN" ||
        product.audience === "UNISEX"
          ? product.audience
          : "UNISEX";

      const images = Array.isArray(product.images)
        ? product.images.filter((image): image is string => typeof image === "string")
        : [];

      const variants = Array.isArray(product.variants)
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

      return {
        id: product.id,
        title: product.title,
        brand: product.brand,
        category: product.category,
        audience,
        images,
        variants,
      };
    })
    .filter((product): product is CatalogProduct => product !== null);
}

export function filterProducts(
  products: CatalogProduct[],
  params: {
    selectedAudience: SelectedAudience;
    selectedCategory: string;
    selectedBrand: string;
    searchQuery: string;
  }
): CatalogProduct[] {
  const { selectedAudience, selectedCategory, selectedBrand, searchQuery } =
    params;

  return products.filter((product) => {
    if (!matchesAudience(product.audience, selectedAudience)) return false;
    if (selectedCategory && product.category !== selectedCategory) return false;
    if (selectedBrand && product.brand !== selectedBrand) return false;

    if (searchQuery) {
      const haystack =
        `${product.title} ${product.brand} ${product.category}`.toLowerCase();

      if (!haystack.includes(searchQuery)) return false;
    }

    return true;
  });
}

export function sortProducts(
  products: CatalogProduct[],
  sortBy: SortValue
): CatalogProduct[] {
  switch (sortBy) {
    case "price-asc":
      return [...products].sort((a, b) => getMinPrice(a) - getMinPrice(b));
    case "price-desc":
      return [...products].sort((a, b) => getMinPrice(b) - getMinPrice(a));
    case "newest":
      return [...products].sort((a, b) => b.id - a.id);
    default:
      return products;
  }
}

export function getBrands(products: CatalogProduct[]): string[] {
  return Array.from(
    new Set(
      products
        .map((product) => product.brand)
        .filter((brand) => brand.trim().length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));
}

export function parsePage(value?: string): number {
  const page = Number(value);
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.floor(page);
}

export function paginateProducts(
  products: CatalogProduct[],
  page: number,
  perPage: number
): PaginatedProducts {
  const totalPages = Math.max(1, Math.ceil(products.length / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const start = (safePage - 1) * perPage;
  const end = start + perPage;

  return {
    items: products.slice(start, end),
    page: safePage,
    totalPages,
  };
}

export function buildCatalogQuery(params: {
  audience?: string;
  category?: string;
  brand?: string;
  q?: string;
  page?: number;
}): string {
  const searchParams = new URLSearchParams();

  if (params.audience && params.audience !== "all") {
    searchParams.set("audience", params.audience);
  }

  if (params.category) {
    searchParams.set("category", params.category);
  }

  if (params.brand) {
    searchParams.set("brand", params.brand);
  }

  if (params.q) {
    searchParams.set("q", params.q);
  }

  if (params.page && params.page > 1) {
    searchParams.set("page", String(params.page));
  }

  const query = searchParams.toString();
  return query ? `/catalog?${query}` : "/catalog";
}