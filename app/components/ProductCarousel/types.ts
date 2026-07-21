export type CarouselProduct = {
  id: number;
  publicId?: string | null;
  title: string;
  brand: string | null;
  category?: string | null;
  images: string[];
  minPrice: number;
};
