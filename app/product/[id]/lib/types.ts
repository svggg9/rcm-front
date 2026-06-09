export type Variant = {
  id: number;
  size: string;
  color: string;
  price: number;
  availableQuantity: number | null;
  sku: string;
  stockTrackingEnabled?: boolean;
};

export type Product = {
  id: number;
  sellerId: number;
  title: string;
  description: string;
  composition?: string;
  article?: string;
  brand: string;
  brandSlug?: string | null;
  category: string;
  audience?: "MEN" | "WOMEN" | "UNISEX";
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED" | "BLOCKED";
  images: string[];
  variants: Variant[];
};