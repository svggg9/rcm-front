export type ProductVariant = {
  price: number;
};

export type HomeProduct = {
  id: number;
  publicId?: string | null;
  title: string;
  images: string[];
  brand: string | null;
  category?: string | null;
  audience: "MEN" | "WOMEN" | "UNISEX";
  minPrice: number;
  variants?: ProductVariant[];
};

export type ProductShowcaseData = {
  title: string;
  href: string;
  description?: string | null;
  products: HomeProduct[];
};

export type HomePageData = {
  products: HomeProduct[];
  blocks: ProductShowcaseData[];
  status: "ready" | "error";
};
