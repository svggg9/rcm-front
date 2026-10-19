export type CartItem = {
  productId: number;
  variantId: number;
  sellerId?: number | null;
  title: string;
  publicId?: string | null;
  article?: string | null;
  brand?: string | null;
  size: string;
  color: string;
  price: number;
  quantity: number;
  availableQuantity?: number | null;
  imageUrl: string | null;
};
