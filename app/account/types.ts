export type OrderStatus =
  | "NEW"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "COMPLETED"
  | "CANCELED";

export type PaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export type DeliveryStatus =
  | "PENDING"
  | "READY_FOR_SHIPMENT"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";

export type OrderItem = {
  productId: number;
  variantId: number;
  sellerId: number;
  sku: string;
  productTitle: string;
  size: string;
  color: string;
  imageUrl: string | null;
  quantity: number;
  price: number;
  lineTotal: number;
};

export type OrderItemPreview = {
  imageUrl: string | null;
};

export type OrderDelivery = {
  provider: string | null;
  method: string | null;
  requestId: string | null;
  shipmentStatus: string | null;
  trackingUrl: string | null;
  priceAmount: number | null;
  currency: string | null;
};

export type Order = {
  id: number;
  orderGroupId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  subtotalAmount: number;
  deliveryAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  deliveryMethod: string;
  trackingNumber: string | null;
  createdAt: string;
  items: OrderItem[];
  delivery?: OrderDelivery | null;
};