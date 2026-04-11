export type Variant = {
  id: number;
  size: string;
  color: string;
  price: number;
  quantity: number;
  sku: string;
};

export type Product = {
  id: number;
  title: string;
  description: string;
  brand: string;
  category: string;
  audience?: "MEN" | "WOMEN" | "UNISEX";
  images: string[];
  variants: Variant[];
};