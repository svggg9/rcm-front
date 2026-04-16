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
export type DeliveryMethod = "PICKUP_POINT" | "COURIER";
export type CheckoutStep = "CONTACT" | "DELIVERY" | "PAYMENT";

export type PickupPoint = {
  id: string;
  name: string;
  type: string;
  fullAddress: string;
  instruction?: string;
  latitude?: number | null;
  longitude?: number | null;
  paymentMethods?: string[];
  yandexBranded?: boolean | null;
  marketPartner?: boolean | null;
  operatorId?: string;
};

export type PickupPointSearchResponse = {
  geoId: number | null;
  detectedAddress: string;
  points: PickupPoint[];
};

export type DeliveryOffer = {
  offerId: string;
  expiresAt?: string | null;
  pricingTotalAmount?: number | null;
  pricingTotalCurrency?: string | null;
  pricingAmount?: number | null;
  pricingCurrency?: string | null;
  deliveryFrom?: string | null;
  deliveryTo?: string | null;
  deliveryPolicy?: string | null;
  pickupFrom?: string | null;
  pickupTo?: string | null;
};

export type DeliveryOffersResponse = {
  pickupPointId: string;
  offers: DeliveryOffer[];
};

export type CheckoutRequest = {
  cartId: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string;
  deliveryAddress: string;
  deliveryMethod: DeliveryMethod;
  pickupPointId?: string;
  deliveryOfferId?: string;
  deliveryPriceAmount?: number;
  deliveryCurrency?: string;
  comment?: string;
};

export type OrderDeliveryInfoResponse = {
  provider: string | null;
  method: string | null;
  requestId: string | null;
  shipmentStatus: string | null;
  trackingUrl: string | null;
  priceAmount: number | null;
  currency: string | null;
};

export type OrderResponse = {
  id: number;
  orderGroupId: string;
  delivery?: OrderDeliveryInfoResponse | null;
};

export type PaymentInitResponse = {
  orderId: number;
  paymentId: number;
  externalPaymentId: string;
  status: string;
  confirmationUrl: string;
};