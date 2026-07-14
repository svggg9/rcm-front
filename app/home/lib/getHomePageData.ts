import { API_URL } from "../../lib/api";
import { HomePageData, HomeProduct, ProductShowcaseData } from "../types";

type CatalogAudience = "men" | "women" | "all";
type ProductAudience = "MEN" | "WOMEN" | "UNISEX";

type RawProduct = {
  id?: unknown;
  publicId?: unknown;
  title?: unknown;
  brand?: unknown;
  category?: unknown;
  audience?: unknown;
  coverImage?: unknown;
  hoverImage?: unknown;
  minPrice?: unknown;
};

function normalizeProducts(data: unknown): HomeProduct[] {
  if (!Array.isArray(data)) return [];

  return data
    .map((item): HomeProduct | null => {
      const product = item as RawProduct;

      if (typeof product.id !== "number" || typeof product.title !== "string") {
        return null;
      }

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

      const audience: ProductAudience =
        product.audience === "MEN" ||
        product.audience === "WOMEN" ||
        product.audience === "UNISEX"
          ? product.audience
          : "UNISEX";

      return {
        id: product.id,
        publicId: typeof product.publicId === "string" ? product.publicId : null,
        title: product.title,
        images: [coverImage, hoverImage].filter(
          (image): image is string => typeof image === "string"
        ),
        brand: typeof product.brand === "string" ? product.brand : null,
        category: typeof product.category === "string" ? product.category : null,
        audience,
        minPrice: typeof product.minPrice === "number" ? product.minPrice : 0,
      };
    })
    .filter((product): product is HomeProduct => product !== null);
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
  return products.filter((product) => matchesAudience(product.audience, audience));
}

function getFirstBrand(products: HomeProduct[]): string | null {
  const found = products.find(
    (product) => typeof product.brand === "string" && product.brand.trim().length > 0
  );

  return found?.brand ?? null;
}

function getFirstCategory(products: HomeProduct[]): string | null {
  const found = products.find(
    (product) =>
      typeof product.category === "string" && product.category.trim().length > 0
  );

  return found?.category ?? null;
}

function fallbackProducts(products: HomeProduct[], count = 4): HomeProduct[] {
  return products.slice(0, count);
}

function latestProducts(products: HomeProduct[], count = 4): HomeProduct[] {
  return [...products].slice(0, count);
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

  const brandProducts = products.filter((product) => product.brand === brand).slice(0, 4);

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
    .filter((product) => product.category === category)
    .slice(0, 4);

  return {
    title: `${category} из новых коллекций`,
    href: buildCatalogHref({ audience, category }),
    products: categoryProducts.length ? categoryProducts : fallbackProducts(products),
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
    const response = await fetch(`${API_URL}/api/products/list`, {
      next: { revalidate: 120 },
    });

    if (!response.ok) {
      throw new Error("products request failed");
    }

    const json: unknown = await response.json();
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
