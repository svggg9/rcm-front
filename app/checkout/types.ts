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
  latitude?: number | null;
  longitude?: number | null;
  cityCode?: number | null;
};

export type PickupPointSearchResponse = {
  detectedAddress: string | null;
  points: {
    id: string;
    name: string | null;
    type: string | null;
    fullAddress: string | null;
    instruction: string | null;
    latitude: number | null;
    longitude: number | null;
    cityCode: number | null;
  }[];
};

export type DeliveryQuoteResponse = {
  quoteToken: string;
  provider: string;
  method: string;
  priceAmount: number;
  currency: string;
  etaMinutes: number | null;
  externalOfferId: string | null;
  expiresAt: string;
};

export type CheckoutRequest = {
  cartId: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  deliveryAddress: string;

  // backend ожидает именно это значение
  deliveryMethod: "PICKUP_POINT" | "COURIER";

  pickupPointId?: string;
  deliveryOfferId?: string;
  deliveryPriceAmount?: number;
  deliveryCurrency?: string;
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

export type DeliveryCityOption = {
  code: number;
  cityUuid: string;
  fullName: string;
  countryCode: string;
};