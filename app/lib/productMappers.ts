import type { CarouselProduct } from "../components/ProductCarousel/types";

type ProductVariantLike = {
  price: number;
};

type ProductLike = {
  id: number;
  title: string;
  brand: string | null;
  images: string[];
  variants: ProductVariantLike[];
};

export function mapProductToCarouselProduct(
  product: ProductLike
): CarouselProduct {
  return {
    id: product.id,
    title: product.title,
    brand: product.brand,
    images: product.images,
    minPrice: product.variants.length
      ? Math.min(...product.variants.map((variant) => variant.price))
      : 0,
  };
}