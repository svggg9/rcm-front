export type CartItem = {
  productId: number;
  variantId: number;
  title: string;
  size: string;
  color: string;
  price: number;
  quantity: number;
  imageUrl: string;
};

export type OrderResponse = {
  id: number;
};

export type PaymentMethod = "SBP" | "CARD";

export type CheckoutStep = "CONTACT" | "DELIVERY" | "PAYMENT";

export type DeliveryOption = {
  id: string;
  label: string;
  hint?: string;
};