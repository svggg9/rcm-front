import { API_URL } from "../../lib/api";

export type StorefrontHome = {
  heroImageUrl: string | null;
  updatedAt: string | null;
  heroPositionX: number;
  heroPositionY: number;
  collections: StorefrontHomeCollection[];
};

export type StorefrontHomeCollection = {
  id: number;
  title: string;
  description: string | null;
  products: StorefrontHomeProduct[];
};

export type StorefrontHomeProduct = {
  id: number;
  publicId: string | null;
  title: string;
  brand: string | null;
  category: string | null;
  audience: "MEN" | "WOMEN" | "UNISEX";
  coverImage: string | null;
  hoverImage: string | null;
  minPrice: number;
};

function normalizeStorefrontHome(data: unknown): StorefrontHome | null {
  if (!data || typeof data !== "object") return null;

  const raw = data as Record<string, unknown>;
  const heroImageUrl =
    typeof raw.heroImageUrl === "string" && raw.heroImageUrl.trim()
      ? raw.heroImageUrl.trim()
      : null;
  const updatedAt =
    typeof raw.updatedAt === "string" && raw.updatedAt.trim()
      ? raw.updatedAt.trim()
      : null;
  const heroPositionX =
    typeof raw.heroPositionX === "number" ? raw.heroPositionX : 50;
  const heroPositionY =
    typeof raw.heroPositionY === "number" ? raw.heroPositionY : 50;

  const collections = Array.isArray(raw.collections)
    ? raw.collections.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const collection = item as Record<string, unknown>;
        if (typeof collection.id !== "number" || typeof collection.title !== "string") {
          return [];
        }
        const products = Array.isArray(collection.products)
          ? collection.products.flatMap((itemProduct) => {
              if (!itemProduct || typeof itemProduct !== "object") return [];
              const product = itemProduct as Record<string, unknown>;
              if (typeof product.id !== "number" || typeof product.title !== "string") {
                return [];
              }
              const audience: StorefrontHomeProduct["audience"] =
                product.audience === "MEN" || product.audience === "WOMEN"
                  ? product.audience
                  : "UNISEX";
              return [{
                id: product.id,
                publicId: typeof product.publicId === "string" ? product.publicId : null,
                title: product.title,
                brand: typeof product.brand === "string" ? product.brand : null,
                category: typeof product.category === "string" ? product.category : null,
                audience,
                coverImage: typeof product.coverImage === "string" ? product.coverImage : null,
                hoverImage: typeof product.hoverImage === "string" ? product.hoverImage : null,
                minPrice: typeof product.minPrice === "number" ? product.minPrice : 0,
              }];
            })
          : [];
        return [{
          id: collection.id,
          title: collection.title,
          description: typeof collection.description === "string" ? collection.description : null,
          products,
        }];
      })
    : [];

  return { heroImageUrl, updatedAt, heroPositionX, heroPositionY, collections };
}

export async function getStorefrontHome(): Promise<StorefrontHome | null> {
  try {
    const response = await fetch(`${API_URL}/api/storefront/home`, {
      next: { revalidate: 30 },
    });

    if (!response.ok) return null;

    return normalizeStorefrontHome(await response.json());
  } catch {
    return null;
  }
}

export function getVersionedHeroImageUrl(home: StorefrontHome | null): string | null {
  if (!home?.heroImageUrl) return null;
  if (!home.updatedAt) return home.heroImageUrl;

  const separator = home.heroImageUrl.includes("?") ? "&" : "?";
  return `${home.heroImageUrl}${separator}v=${encodeURIComponent(home.updatedAt)}`;
}
