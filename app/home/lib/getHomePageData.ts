import { API_URL } from "../../lib/api";
import {
  HomePageData,
  HomeProduct,
  ProductShowcaseData,
} from "../types";

type CatalogAudience = "men" | "women" | "all";
type ProductAudience = "MEN" | "WOMEN" | "UNISEX";

function resolveMinPrice(item: any): number {
  if (Array.isArray(item.variants) && item.variants.length > 0) {
    const prices = item.variants
      .map((v: any) => v?.price)
      .filter((price: unknown): price is number => typeof price === "number");

    if (prices.length > 0) {
      return Math.min(...prices);
    }
  }

  return 0;
}

function normalizeProducts(data: unknown): HomeProduct[] {
  if (!Array.isArray(data)) return [];

  return data.map((item: any) => ({
    id: item.id,
    title: item.title,
    images: Array.isArray(item.images) ? item.images : [],
    brand: typeof item.brand === "string" ? item.brand : null,
    category: typeof item.category === "string" ? item.category : null,
    audience:
      item.audience === "MEN" || item.audience === "WOMEN" || item.audience === "UNISEX"
        ? item.audience
        : "UNISEX",
    minPrice: resolveMinPrice(item),
    variants: Array.isArray(item.variants) ? item.variants : [],
  }));
}

function matchesAudience(
  productAudience: ProductAudience,
  selectedAudience: CatalogAudience
) {
  if (selectedAudience === "all") return true;
  if (selectedAudience === "men") {
    return productAudience === "MEN" || productAudience === "UNISEX";
  }
  if (selectedAudience === "women") {
    return productAudience === "WOMEN" || productAudience === "UNISEX";
  }
  return true;
}

function filterByAudience(
  products: HomeProduct[],
  audience: CatalogAudience
): HomeProduct[] {
  return products.filter((p) => matchesAudience(p.audience, audience));
}

function getFirstBrand(products: HomeProduct[]): string | null {
  const found = products.find(
    (p) => typeof p.brand === "string" && p.brand.trim().length > 0
  );
  return found?.brand ?? null;
}

function getFirstCategory(products: HomeProduct[]): string | null {
  const found = products.find(
    (p) => typeof p.category === "string" && p.category.trim().length > 0
  );
  return found?.category ?? null;
}

function fallbackProducts(products: HomeProduct[], count = 4): HomeProduct[] {
  return products.slice(0, count);
}

function latestProducts(products: HomeProduct[], count = 4): HomeProduct[] {
  return [...products].slice(-count).reverse();
}

function buildCatalogHref(params: {
  audience?: CatalogAudience;
  category?: string | null;
  brand?: string | null;
}) {
  const qs = new URLSearchParams();

  if (params.audience && params.audience !== "all") {
    qs.set("audience", params.audience);
  }

  if (params.category) {
    qs.set("category", params.category);
  }

  if (params.brand) {
    qs.set("brand", params.brand);
  }

  const query = qs.toString();
  return query ? `/catalog?${query}` : "/catalog";
}

function buildBrandShowcase(
  products: HomeProduct[],
  audience: CatalogAudience
): ProductShowcaseData {
  const brand = getFirstBrand(products);

  if (!brand) {
    return {
      title: "Новинки из коллекций лучших брендов",
      href: buildCatalogHref({ audience }),
      products: fallbackProducts(products),
    };
  }

  const brandProducts = products.filter((p) => p.brand === brand).slice(0, 4);

  return {
    title: "Новинки из коллекций лучших брендов",
    href: buildCatalogHref({ audience, brand }),
    products: brandProducts.length ? brandProducts : fallbackProducts(products),
  };
}

function buildCategoryShowcase(
  products: HomeProduct[],
  audience: CatalogAudience
): ProductShowcaseData {
  const category = getFirstCategory(products);

  if (!category) {
    return {
      title: "Новые поступления",
      href: buildCatalogHref({ audience }),
      products: fallbackProducts(products),
    };
  }

  const categoryProducts = products
    .filter((p) => p.category === category)
    .slice(0, 4);

  return {
    title: `${category} из новых коллекций`,
    href: buildCatalogHref({ audience, category }),
    products: categoryProducts.length
      ? categoryProducts
      : fallbackProducts(products),
  };
}

function buildLatestShowcase(
  products: HomeProduct[],
  audience: CatalogAudience
): ProductShowcaseData {
  return {
    title: "Актуальные новинки",
    href: buildCatalogHref({ audience }),
    products: latestProducts(products, 4),
  };
}

export async function getHomePageData(
  audience: CatalogAudience = "all"
): Promise<HomePageData> {
  try {
    const response = await fetch(`${API_URL}/api/products`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("products request failed");
    }

    const json = await response.json();
    const products = filterByAudience(normalizeProducts(json), audience);

    return {
      brandShowcase: buildBrandShowcase(products, audience),
      categoryShowcase: buildCategoryShowcase(products, audience),
      latestShowcase: buildLatestShowcase(products, audience),
    };
  } catch {
    return {
      brandShowcase: {
        title: "Новинки из коллекций лучших брендов",
        href: buildCatalogHref({ audience }),
        products: [],
      },
      categoryShowcase: {
        title: "Новые поступления",
        href: buildCatalogHref({ audience }),
        products: [],
      },
      latestShowcase: {
        title: "Актуальные новинки",
        href: buildCatalogHref({ audience }),
        products: [],
      },
    };
  }
}