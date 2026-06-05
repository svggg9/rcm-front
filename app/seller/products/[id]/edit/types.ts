export type Audience = "MEN" | "WOMEN" | "UNISEX";

export type Option = {
  id: number;
  name: string;
};

export type ProductStatus =
  | "DRAFT"
  | "MODERATION"
  | "NEEDS_REVISION"
  | "ACTIVE"
  | "ARCHIVED"
  | "BLOCKED";

export type ProductVariant = {
  id: number | null;
  sizeId: number | "";
  size: string;
  colorId: number | "";
  color: string;
  colorHex?: string | null;
  price: number;
  availableQuantity: number | null;
  sku: string;
  stockTrackingEnabled: boolean;
};

export type ProductImageItem = {
  id: number;
  url: string;
  sortOrder: number;
};

export type SellerProduct = {
  id: number;
  title: string;
  description: string;
  composition: string | null;
  article: string | null;
  brandId: number | null;
  brand: string | null;
  categoryId: number | null;
  category: string | null;
  audience: Audience;
  status: ProductStatus;
  moderationComment: string | null;
  packageWidthCm: number | null;
  packageHeightCm: number | null;
  packageLengthCm: number | null;
  packageWeightKg: number | null;
  variants: ProductVariant[];
  images: string[];
  imageItems: ProductImageItem[];
};