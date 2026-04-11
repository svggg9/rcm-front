export type CartItem = {
  productId: number;
  variantId: number;
  title: string;
  size: string;
  color: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
};