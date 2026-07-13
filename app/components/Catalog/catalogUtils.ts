import type { CatalogProduct, SelectedAudience, SortValue } from "./catalogTypes";

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

export function parsePage(value?: string): number {
  const page = Number(value);
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.floor(page);
}

export function buildCatalogQuery(params: {
  audience?: string;
  category?: string;
  q?: string;
  page?: number;
  sort?: SortValue;
}): string {
  const searchParams = new URLSearchParams();

  if (params.audience && params.audience !== "all") {
    searchParams.set("audience", params.audience);
  }

  if (params.category) {
    searchParams.set("category", params.category);
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

  const query = searchParams.toString();
  return query ? `/catalog?${query}` : "/catalog";
}

export function normalizeSort(value?: string): SortValue {
  if (value === "newest" || value === "price-asc" || value === "price-desc") {
    return value;
  }

  return "";
}

