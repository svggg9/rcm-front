export type Variant = {
  id: number;
  colorwayId?: number | null;
  size: string;
  color: string;
  price: number;
  availableQuantity: number | null;
  sku: string;
  sellerArticle?: string | null;
  stockTrackingEnabled?: boolean;
};

export type ProductColorway = {
  id: number;
  colorId?: number | null;
  color: string;
  colorHex?: string | null;
  sortOrder?: number | null;
  isDefault?: boolean;
  images: string[];
};

export type Product = {
  id: number;
  publicId?: string | null;
  sellerId: number;
  title: string;
  description: string;
  composition?: string;
  article?: string;
  brand: string;
  brandSlug?: string | null;
  brandDescription?: string | null;
  category: string;
  audience?: "MEN" | "WOMEN" | "UNISEX";
  status?:
    | "DRAFT"
    | "MODERATION"
    | "NEEDS_REVISION"
    | "ACTIVE"
    | "ARCHIVED"
    | "BLOCKED";
  images: string[];
  colorways?: ProductColorway[];
  variants: Variant[];
};
