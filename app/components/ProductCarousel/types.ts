export type CarouselProduct = {
  id: number;
  publicId?: string | null;
  title: string;
  brand: string | null;
  images: string[];
  minPrice: number;
};
