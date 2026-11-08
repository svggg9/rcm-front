import type { ProductDetails } from "../lib/productDetails";
import type { StorefrontSection } from "../lib/storefrontSections";

export type AdminTab =
  | "overview"
  | "returns"
  | "activity"
  | "storefront"
  | "products"
  | "orders"
  | "sellers"
  | "dictionaries"
  | "finance"
  | "contact-messages"
  | "delivery";

export type AdminStorefrontHome = {
  heroImageUrl: string | null;
  updatedAt: string | null;
  heroPositionX: number;
  heroPositionY: number;
  collections: AdminStorefrontCollection[];
  sections: AdminStorefrontSection[];
  newArrivalsCollectionId: number | null;
  newArrivalsCount: number;
};

export type AdminStorefrontSection = StorefrontSection;

export type AdminStorefrontSectionRequest = {
  kind: StorefrontSection["kind"];
  targetId: number;
  active: boolean;
  coverPositionX: number;
  coverPositionY: number;
  removeCover?: boolean;
  file?: File;
};

export type AdminStorefrontProduct = {
  id: number;
  publicId: string | null;
  title: string;
  brand: string | null;
  category: string | null;
  audience: "MEN" | "WOMEN" | "UNISEX";
  status: string | null;
  coverImage: string | null;
  hoverImage: string | null;
  minPrice: number;
  inStock: boolean;
};

export type AdminStorefrontCollection = {
  id: number;
  title: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
  products: AdminStorefrontProduct[];
};

export type AdminStorefrontCollectionRequest = {
  title: string;
  description: string;
  active: boolean;
  productIds: number[];
};

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
  details?: ProductDetails | null;
  colorways?: { id: number; colorId?: number | null; color: string | null; colorHex?: string | null }[];
  revisionSourceId?: number | null;
  id: number;
  title: string;
  description: string;
  composition?: string | null;
  article?: string | null;
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

export type AdminProductListItem = {
  id: number;
  title: string;
  status: ProductStatus;
  brandName: string | null;
  categoryName: string | null;
  suggestedCategoryName: string | null;
  coverImage: string | null;
  minPrice: number | null;
  totalStock: number | null;
  variantsCount: number | null;
  updatedAt: string | null;
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
  /** Category name is a display path; writes use the local label and parentId. */
  label?: string;
  parentId?: number | null;
  effectiveActive?: boolean;
  productCount?: number;
  subtreeProductCount?: number;
  slug?: string | null;
  logoUrl?: string | null;
  wordmarkUrl?: string | null;
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
  | "IN_PROGRESS"
  | "SENT"
  | "REVIEW"
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
  orderCount?: number;
  items?: AdminSellerPayoutItem[];
};

export type AdminSellerPayoutStats = {
  totalCount: number;
  readyAmount: number;
  sentAmount: number;
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

export type AdminOrderStatus = import("../lib/order-contract").OrderStatus;

export type AdminPaymentStatus = import("../lib/order-contract").PaymentStatus;

export type AdminDeliveryStatus = import("../lib/order-contract").DeliveryStatus;

export type AdminOrderItem = import("../lib/order-contract").OrderItem;

export type AdminOrderDeliveryInfo = import("../lib/order-contract").OrderDeliveryInfo;

export type AdminOrder = import("../lib/order-contract").Order;

export type AdminOrderListItem = import("../lib/order-contract").SellerOrderListItem;

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
  rawPayload?: string | null;
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
  /** Current bot binding; absent on older backend versions. */
  telegramLinked?: boolean;
  telegramUsername?: string | null;
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
  query?: string;
  owner?: string;
  sellerView?: string;
  from?: string;
  to?: string;
  paymentFilter?: string;
  deliveryFilter?: string;
  tab: AdminTab;
  tabDataLoaded: boolean;
  categoriesLoaded: boolean;
  productStatus: ProductStatus | "ALL";
  applicationStatus: SellerApplicationStatus | "ALL";
  ledgerEntryType: FinancialLedgerEntryType | "ALL";
  ledgerOrderGroupId: string;
  selectedProductId: string | null;
  selectedOrderId: string | null;
  products: AdminProductListItem[];
  totalProducts: number;
  productStatusCounts: Record<ProductStatus | "ALL", number>;
  selectedProduct: AdminProduct | null;
  orders: AdminOrderListItem[];
  totalOrders: number;
  selectedOrder: AdminOrder | null;
  storefrontHome: AdminStorefrontHome | null;
  sellerApplications: AdminSellerApplication[];
  totalSellerApplications: number;
  sellerApplicationStatusCounts: Record<SellerApplicationStatus | "ALL", number>;
  ledgerEntries: AdminFinancialLedgerEntry[];
  totalLedgerEntries: number;
  ledgerLoaded: boolean;
  cdekWebhookEvents: AdminCdekWebhookEvent[];
  totalCdekWebhookEvents: number;
  categories: DictionaryItem[];
  sizes: DictionaryItem[];
  error: string | null;
};
