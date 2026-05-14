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
  title: string;
  description: string;
  brand: string;
  category: string;
  audience?: "MEN" | "WOMEN" | "UNISEX";
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED" | "BLOCKED";
  images: string[];
  variants: Variant[];
};