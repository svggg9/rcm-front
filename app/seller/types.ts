export type SellerTab = "orders" | "products";

export type Option = {
  id: number;
  name: string;
};

export type Audience = "MEN" | "WOMEN" | "UNISEX";

export type CreateProductReq = {
  title: string;
  description: string;
  categoryId: number;
  brandId: number;
  audience: Audience;
  variants: Array<{
    size: string;
    color: string;
    price: number;
    quantity: number;
    sku: string;
  }>;
};

export type SellerOrderStatus = "NEW" | "CONFIRMED" | "CANCELED" | "COMPLETED";

export type SellerPaymentStatus = "PENDING" | "PAID" | "FAILED" | "CANCELED";

export type SellerDeliveryStatus =
  | "PENDING"
  | "READY_FOR_SHIPMENT"
  | "IN_TRANSIT"
  | "DELIVERED";

export type SellerOrderItem = {
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

export type SellerOrder = {
  id: number;
  orderGroupId: string;
  status: SellerOrderStatus;
  paymentStatus: SellerPaymentStatus;
  deliveryStatus: SellerDeliveryStatus;
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
  items: SellerOrderItem[];
};

export type PageResponse<T> = {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
};