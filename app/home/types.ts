export type ProductVariant = {
  price: number;
};

export type HomeProduct = {
  id: number;
  title: string;
  images: string[];
  brand: string | null;
  category?: string | null;
  audience: "MEN" | "WOMEN" | "UNISEX";
  minPrice: number;
  variants?: ProductVariant[];
};

export type HeroBlock = {
  eyebrow: string;
  title: string;
  text: string;
  buttonLabel: string;
  buttonHref: string;
  image: string;
  imageAlt: string;
};

export type ProductShowcaseData = {
  title: string;
  href: string;
  products: HomeProduct[];
};

export type HomePageData = {
  brandShowcase: ProductShowcaseData;
  categoryShowcase: ProductShowcaseData;
  latestShowcase: ProductShowcaseData;
};