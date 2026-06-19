export type AdminTab = "products" | "sellers" | "dictionaries";

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
};

export type DictionaryKind = "categories" | "brands" | "sizes";

export type SellerApplicationStatus = "NEW" | "APPROVED" | "REJECTED";

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
