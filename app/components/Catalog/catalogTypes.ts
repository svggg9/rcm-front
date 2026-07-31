export type Variant = {
  price: number;
};

export type Audience = "MEN" | "WOMEN" | "UNISEX";
export type SelectedAudience = "men" | "women" | "all";
export type SortValue = "" | "newest" | "price-asc" | "price-desc";
export type CatalogView = "" | "new";

export type CatalogCollectionOption = {
  id: number;
  title: string;
};

export type CatalogCategory = {
  id: number;
  name: string;
  slug?: string | null;
  sortOrder?: number | null;
};

export type CatalogSize = {
  id: number;
  name: string;
  sortOrder?: number | null;
};

export type CatalogCategoryGroup = {
  name: string;
  rootCategory?: CatalogCategory;
  categories: Array<CatalogCategory & { label: string }>;
};

export type CatalogFilterSelection = {
  category: string;
  brands: string[];
  sizes: string[];
  minPrice?: number;
  maxPrice?: number;
};

export type CatalogProduct = {
  id: number;
  publicId?: string | null;
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

export type PaginatedProducts = {
  items: CatalogProduct[];
  page: number;
  totalPages: number;
  totalProducts: number;
};

export type CatalogSearchParamValue = string | string[] | undefined;

export type CatalogSearchParams = {
  category?: CatalogSearchParamValue;
  audience?: CatalogSearchParamValue;
  q?: CatalogSearchParamValue;
  page?: CatalogSearchParamValue;
  sort?: CatalogSearchParamValue;
  brand?: CatalogSearchParamValue;
  brands?: CatalogSearchParamValue;
  sizes?: CatalogSearchParamValue;
  minPrice?: CatalogSearchParamValue;
  maxPrice?: CatalogSearchParamValue;
  view?: CatalogSearchParamValue;
  collection?: CatalogSearchParamValue;
};
