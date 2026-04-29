export type AdminTab = "products" | "sellers";

export type ProductStatus =
  | "DRAFT"
  | "MODERATION"
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
  category: string | null;
  audience: string;
  status: ProductStatus;
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