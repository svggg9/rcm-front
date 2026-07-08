export type AdminTab = "products" | "sellers" | "dictionaries" | "finance";

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
};

export type DictionaryKind = "categories" | "brands" | "sizes";

export type SellerApplicationStatus = "NEW" | "APPROVED" | "REJECTED";

export type FinancialLedgerEntryType =
  | "COMMISSION_ACCRUED"
  | "BUYER_DELIVERY_FEE"
  | "DELIVERY_COST_FORWARD"
  | "DELIVERY_SUBSIDY"
  | "DELIVERY_COST_RETURN"
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
  idempotencyKey: string | null;
  description: string | null;
  metadataJson: string | null;
  createdAt: string;
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
  products: AdminProduct[];
  totalProducts: number;
  productStatusCounts: Record<ProductStatus | "ALL", number>;
  selectedProduct: AdminProduct | null;
  sellerApplications: AdminSellerApplication[];
  totalSellerApplications: number;
  sellerApplicationStatusCounts: Record<SellerApplicationStatus | "ALL", number>;
  ledgerEntries: AdminFinancialLedgerEntry[];
  totalLedgerEntries: number;
  categories: DictionaryItem[];
  brands: DictionaryItem[];
  sizes: DictionaryItem[];
  error: string | null;
};
