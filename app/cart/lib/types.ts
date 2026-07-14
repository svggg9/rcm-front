export type CartItem = {
  productId: number;
  variantId: number;
  sellerId?: number | null;
  title: string;
  publicId?: string | null;
  brand?: string | null;
  size: string;
  color: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
};
