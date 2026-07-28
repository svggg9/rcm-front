export type AdminTab = "products" | "orders" | "sellers" | "dictionaries" | "finance" | "delivery";

export type ProductStatus =
  | "DRAFT"
  | "MODERATION"
  | "NEEDS_REVISION"
  | "ACTIVE"
  | "ARCHIVED"
  | "BLOCKED";

export type SellerFilter = "REQUESTS" | "APPROVED" | "ALL";

export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
};

export type AdminProductVariant = {
  id: number;
  size: string;
  color: string;
  price: number;
  availableQuantity: number;
  sku: string;
};

export type AdminProduct = {
  id: number;
  title: string;
  description: string;
  brand: string | null;
  categoryId: number | null;
  category: string | null;
  suggestedCategoryName?: string | null;
  audience: string;
  status: ProductStatus;
  moderationComment: string | null;
  variants: AdminProductVariant[];
  images: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AdminSeller = {
  id: number;
  username: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  sellerApproved: boolean | null;
  sellerRequested: boolean;
};

export type DictionaryItem = {
  id: number;
  name: string;
  slug?: string | null;
  sortOrder?: number | null;
  isActive?: boolean | null;
  status?: "ACTIVE" | "MODERATION" | "DISABLED" | string | null;
  moderationStatus?: "ACTIVE" | "MODERATION" | "DISABLED" | string | null;
  ownerUserId?: number | null;
  ownerUsername?: string | null;
  ownerDisplayName?: string | null;
  ownerEmail?: string | null;
  ownerPhone?: string | null;
};

export type DictionaryKind = "categories" | "brands" | "sizes";

export type SellerApplicationStatus = "NEW" | "APPROVED" | "REJECTED";

export type FinancialLedgerEntryType =
  | "COMMISSION_ACCRUED"
  | "COMMISSION_REVERSED"
  | "BUYER_DELIVERY_FEE"
  | "DELIVERY_COST_FORWARD"
  | "DELIVERY_SUBSIDY"
  | "DELIVERY_COST_RETURN"
  | "BUYER_RETURN_DELIVERY_FEE"
  | "REFUND_ITEM"
  | "REFUND_DELIVERY"
  | "SELLER_DEBIT"
  | "SELLER_PAYOUT"
  | "ACQUIRING_FEE";

export type FinancialLedgerDirection = "CREDIT" | "DEBIT";

export type AdminFinancialLedgerEntry = {
  id: number;
  entryType: FinancialLedgerEntryType;
  accountType: "PLATFORM" | "SELLER" | "BUYER";
  accountUserId: number | null;
  direction: FinancialLedgerDirection;
  amount: number;
  currency: string;
  orderId: number | null;
  orderGroupId: string | null;
  sellerId: number | null;
  buyerId: number | null;
  paymentId: number | null;
  refundId: number | null;
  deliveryShipmentId: number | null;
  sellerPayoutId: number | null;
  idempotencyKey: string | null;
  description: string | null;
  metadataJson: string | null;
  createdAt: string;
};

export type AdminSellerPayoutStatus =
  | "READY"
  | "SENT"
  | "PAID"
  | "FAILED"
  | "CANCELLED";

export type AdminSellerPayoutItem = {
  id: number;
  type: "ORDER" | "ADJUSTMENT";
  orderId: number | null;
  grossAmount: number;
  commissionAmount: number;
  adjustmentAmount: number;
  netAmount: number;
  description: string | null;
};

export type AdminSellerPayout = {
  id: number;
  sellerId: number;
  sellerName: string;
  status: AdminSellerPayoutStatus;
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
  items: AdminSellerPayoutItem[];
};

export type PayoutGenerationResult = {
  scheduledDate: string;
  payouts: AdminSellerPayout[];
  skipped: Array<{
    sellerId: number;
    sellerName: string;
    reason: string;
  }>;
};

export type AdminOrderStatus =
  | "NEW"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "COMPLETED"
  | "PAID"
  | "CANCELED";

export type AdminPaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "CANCELED"
  | "REFUNDED";

export type AdminDeliveryStatus =
  | "PENDING"
  | "READY_FOR_SHIPMENT"
  | "READY_FOR_PICKUP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "RETURNED"
  | "CANCELLED";

export type AdminOrderItem = {
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

export type AdminOrderDeliveryInfo = {
  provider: string | null;
  method: string | null;
  requestId: string | null;
  cdekNumber: string | null;
  shipmentStatus: string | null;
  trackingUrl: string | null;
  priceAmount: number | null;
  currency: string | null;
};

export type AdminOrder = {
  id: number;
  orderGroupId: string;
  status: AdminOrderStatus;
  paymentStatus: AdminPaymentStatus;
  deliveryStatus: AdminDeliveryStatus;
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
  cancellationRequestedAt?: string | null;
  cancelledAt?: string | null;
  items: AdminOrderItem[];
  delivery: AdminOrderDeliveryInfo | null;
};

export type AdminOrderListItem = {
  id: number;
  orderGroupId: string;
  status: AdminOrderStatus;
  paymentStatus: AdminPaymentStatus;
  deliveryStatus: AdminDeliveryStatus;
  totalAmount: number;
  currency: string;
  recipientName: string;
  firstProductTitle: string | null;
  productTitles?: string[];
  firstImageUrl: string | null;
  itemsCount: number;
  createdAt: string;
};

export type CdekWebhookProcessingStatus =
  | "RECEIVED"
  | "PROCESSED"
  | "IGNORED"
  | "FAILED";

export type AdminCdekWebhookEvent = {
  id: number;
  eventType: string | null;
  cdekOrderUuid: string | null;
  cdekOrderCode: string | null;
  statusCode: string | null;
  statusReasonCode: string | null;
  isReturn: boolean | null;
  isReverse: boolean | null;
  isClientReturn: boolean | null;
  processingStatus: CdekWebhookProcessingStatus;
  processingError: string | null;
  rawPayload: string;
  receivedAt: string;
  processedAt: string | null;
};

export type AdminSellerApplication = {
  id: number;
  userId: number;
  username: string;
  brandName: string;
  brandDescription: string | null;
  category: string | null;
  productionRegion: string | null;
  website: string | null;
  telegram: string | null;
  contactName: string;
  phone: string;
  email: string;
  comment: string | null;
  status: SellerApplicationStatus;
  adminComment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminInitialData = {
  tab: AdminTab;
  productStatus: ProductStatus | "ALL";
  applicationStatus: SellerApplicationStatus | "ALL";
  selectedProductId: string | null;
  selectedOrderId: string | null;
  products: AdminProduct[];
  totalProducts: number;
  productStatusCounts: Record<ProductStatus | "ALL", number>;
  selectedProduct: AdminProduct | null;
  orders: AdminOrderListItem[];
  totalOrders: number;
  selectedOrder: AdminOrder | null;
  sellerApplications: AdminSellerApplication[];
  totalSellerApplications: number;
  sellerApplicationStatusCounts: Record<SellerApplicationStatus | "ALL", number>;
  ledgerEntries: AdminFinancialLedgerEntry[];
  totalLedgerEntries: number;
  cdekWebhookEvents: AdminCdekWebhookEvent[];
  totalCdekWebhookEvents: number;
  categories: DictionaryItem[];
  brands: DictionaryItem[];
  sizes: DictionaryItem[];
  error: string | null;
};
