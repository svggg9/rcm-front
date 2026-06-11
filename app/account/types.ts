export type Me = {
  id: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  birthDate: string | null;
  gender: "men" | "women" | null;
  email: string | null;
  displayName: string | null;
  role: string;
  sellerApproved: boolean;
  phone: string | null;
  defaultDeliveryAddress: string | null;
  defaultDeliveryMethod: string | null;
};

export type PageResponse<T> = {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
};

export type OrderStatus = "NEW" | "CONFIRMED" | "CANCELED" | "COMPLETED";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "CANCELED";

export type DeliveryStatus =
  | "PENDING"
  | "READY_FOR_SHIPMENT"
  | "IN_TRANSIT"
  | "DELIVERED";

export type OrderItemPreview = {
  imageUrl?: string | null;
};

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

export type OrderDeliveryInfo = {
  provider: string | null;
  method: string | null;
  requestId: string | null;
  cdekNumber: string | null;
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
  delivery: OrderDeliveryInfo | null;
};

export type OrderListItem = {
  id: number;
  orderGroupId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  totalAmount: number;
  currency: string;
  firstProductTitle: string | null;
  firstImageUrl: string | null;
  itemsCount: number;
  createdAt: string;
};