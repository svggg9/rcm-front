export type SellerTab =
  | "home"
  | "orders"
  | "products"
  | "finance"
  | "brand"
  | "legal";

export type Option = {
  id: number;
  name: string;
};

export type Audience = "MEN" | "WOMEN" | "UNISEX";

export type ProductStatus =
  | "DRAFT"
  | "MODERATION"
  | "NEEDS_REVISION"
  | "ACTIVE"
  | "ARCHIVED"
  | "BLOCKED"
  | "DELETED";

export type CreateProductReq = {
  title: string;
  description: string;
  categoryId: number;
  brandId: number;
  audience: Audience;
  variants: {
    sizeId: number;
    colorId: number;
    price: number;
    quantity: number | null;
    sku: string;
    stockTrackingEnabled: boolean;
  }[];
};

export type SellerOrderStatus = "NEW" | "CONFIRMED" | "CANCELED" | "COMPLETED";

export type SellerPaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "CANCELED"
  | "REFUNDED";

export type SellerDeliveryStatus =
  | "PENDING"
  | "READY_FOR_SHIPMENT"
  | "READY_FOR_PICKUP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "RETURNED"
  | "CANCELLED";

export type SellerOrderItem = {
  productId: number;
  productPublicId?: string | null;
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

export type SellerOrderDeliveryInfo = {
  provider: string | null;
  method: string | null;
  requestId: string | null;
  cdekNumber: string | null;
  shipmentStatus: string | null;
  trackingUrl: string | null;
  priceAmount: number | null;
  currency: string | null;
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
  fittingMode: string | null;
  trackingNumber: string | null;
  createdAt: string;
  items: SellerOrderItem[];
  delivery: SellerOrderDeliveryInfo | null;
};

export type PageResponse<T> = {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
};

export type SellerProductVariant = {
  id: number;
  size: string;
  color: string;
  price: number;
  availableQuantity: number | null;
  sku: string;
  stockTrackingEnabled?: boolean;
};

export type SellerProduct = {
  id: number;
  title: string;
  description: string;
  composition: string;
  article: string | null;
  brand: string | null;
  category: string | null;
  audience?: "MEN" | "WOMEN" | "UNISEX";
  status?: ProductStatus;
  variants: SellerProductVariant[];
  images: string[];
};

export type SellerProductListItem = {
  id: number;
  title: string;
  status?: ProductStatus;

  brandName: string | null;
  categoryName: string | null;

  coverImage: string | null;

  minPrice: number | null;
  totalStock: number | null;
  variantsCount: number | null;
};

export type SellerOrderListItem = {
  id: number;
  orderGroupId: string;

  status: SellerOrderStatus;
  paymentStatus: SellerPaymentStatus;
  deliveryStatus: SellerDeliveryStatus;

  totalAmount: number;
  currency: string;

  recipientName: string;

  firstProductTitle: string | null;
  productTitles?: string[];
  firstImageUrl: string | null;

  itemsCount: number;

  createdAt: string;
};

export type SellerBrand = {
  id: number;
  name: string;
  slug: string | null;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  telegram: string | null;
  vk: string | null;
  country: string | null;
  foundationYear: number | null;
};

export type SellerBrandProfileRequest = {
  name: string;
  description: string;
  logoUrl: string;
  website: string;
  telegram: string;
  vk: string;
  country: string;
  foundationYear: number | null;
};

export type SellerFinanceOperation = {
  type: "SALE" | "SELLER_DEBIT" | "SELLER_PAYOUT";
  direction: "CREDIT" | "DEBIT";
  amount: number;
  currency: string;
  orderId: number | null;
  description: string | null;
  createdAt: string;
};

export type SellerPayoutStatus =
  | "READY"
  | "SENT"
  | "PAID"
  | "FAILED"
  | "CANCELLED";

export type SellerPayoutItem = {
  id: number;
  type: "ORDER" | "ADJUSTMENT";
  orderId: number | null;
  grossAmount: number;
  commissionAmount: number;
  adjustmentAmount: number;
  netAmount: number;
  description: string | null;
};

export type SellerPayout = {
  id: number;
  sellerId: number;
  sellerName: string;
  status: SellerPayoutStatus;
  scheduledDate: string;
  currency: string;
  grossSalesAmount: number;
  commissionAmount: number;
  adjustmentsAmount: number;
  payoutAmount: number;
  inn: string;
  bankName: string;
  bik: string;
  checkingAccount: string;
  correspondentAccount: string | null;
  paymentOrderNumber: string | null;
  adminComment: string | null;
  createdAt: string;
  sentAt: string | null;
  paidAt: string | null;
  items: SellerPayoutItem[];
};

export type SellerFinanceSummary = {
  salesAmount: number;
  commissionAmount: number;
  adjustmentsAmount: number;
  paidOutAmount: number;
  estimatedBalance: number;
  availableAmount: number;
  processingAmount: number;
  nextPayoutAmount: number;
  paidThisMonthAmount: number;
  nextPayoutDate: string;
  bankDetailsReady: boolean;
  payouts: SellerPayout[];
  operations: SellerFinanceOperation[];
};
