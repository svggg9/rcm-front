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
  brand?: string;
  q?: string;
  page?: string;
  sort?: string;
};

export type PaginatedProducts = {
  items: CatalogProduct[];
  page: number;
  totalPages: number;
};