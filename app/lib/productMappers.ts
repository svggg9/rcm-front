import type { CarouselProduct } from "../components/ProductCarousel/types";

type ProductLike = {
  id: number;
  publicId?: string | null;
  title: string;
  brand: string | null;
  category?: string | null;
  images?: string[];
  coverImage?: string | null;
  hoverImage?: string | null;
  minPrice?: number | null;
  variants?: Array<{
    price: number;
  }>;
};

export function mapProductToCarouselProduct(
  product: ProductLike
): CarouselProduct {
  const lightweightImages = [product.coverImage, product.hoverImage].filter(
    (image): image is string => typeof image === "string" && image.length > 0
  );

  const images = lightweightImages.length > 0 ? lightweightImages : product.images ?? [];

  const minPrice =
    typeof product.minPrice === "number"
      ? product.minPrice
      : product.variants?.length
        ? Math.min(...product.variants.map((variant) => variant.price))
        : 0;

  return {
    id: product.id,
    publicId: product.publicId,
    title: product.title,
    brand: product.brand,
    category: product.category ?? null,
    images,
    minPrice,
  };
}
