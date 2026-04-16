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

export type PaymentMethod = "SBP" | "CARD";
export type DeliveryMethod = "PICKUP" | "COURIER";
export type CheckoutStep = "CONTACT" | "DELIVERY" | "PAYMENT";

export type DeliveryOption = {
  id: string;
  label: string;
  hint?: string;
};

export type CheckoutRequest = {
  cartId: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  deliveryMethod: DeliveryMethod;
  comment?: string;
};

export type OrderResponse = {
  id: number;
  orderGroupId: string;
};

export type PaymentInitResponse = {
  orderId: number;
  paymentId: number;
  externalPaymentId: string;
  status: string;
  confirmationUrl: string;
};