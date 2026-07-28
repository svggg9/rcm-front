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
  defaultDeliveryCountryCode: string | null;
  defaultDeliveryCityCode: number | null;
  defaultDeliveryCityName: string | null;
  defaultDeliveryApartment: string | null;
  defaultDeliveryFloor: string | null;
  defaultDeliveryIntercom: string | null;
};

export type PageResponse<T> = {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
};

export type OrderStatus =
  | "NEW"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "COMPLETED"
  | "PAID"
  | "CANCELED";

export type PaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "CANCELED"
  | "REFUNDED";

export type DeliveryStatus =
  | "PENDING"
  | "READY_FOR_SHIPMENT"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "RETURNED"
  | "CANCELLED"
  | "READY_FOR_PICKUP";

export type OrderItemPreview = {
  imageUrl?: string | null;
};

export type OrderItem = {
  productId: number;
  productPublicId?: string | null;
  variantId: number;
  sellerId: number;
  sku: string;
  productTitle: string;
  brandName: string | null;
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
  fittingMode: string | null;
  trackingNumber: string | null;
  createdAt: string;
  paidAt: string | null;
  cancellationAvailableUntil: string | null;
  cancellationRequestedAt: string | null;
  cancelledAt: string | null;
  cancellationAllowed: boolean;
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
  productTitles?: string[];
  firstImageUrl: string | null;
  itemsCount: number;
  createdAt: string;
};
