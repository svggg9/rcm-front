export type CartItem = {
  productId: number;
  variantId: number;
  sellerId?: number | null;
  title: string;
  size: string;
  color: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
};
