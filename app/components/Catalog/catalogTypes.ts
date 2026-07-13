export type Variant = {
  price: number;
};

export type Audience = "MEN" | "WOMEN" | "UNISEX";
export type SelectedAudience = "men" | "women" | "all";
export type SortValue = "" | "newest" | "price-asc" | "price-desc";

export type CatalogProduct = {
  id: number;
  title: string;
  brand: string;
  brandSlug?: string | null;
  category: string;
  audience: Audience;
  status: string | null;
  images: string[];
  variants: { price: number }[];
  minPrice: number;
  inStock?: boolean;
};

export type CatalogSearchParams = {
  category?: string;
  audience?: string;
  q?: string;
  page?: string;
  sort?: string;
};
