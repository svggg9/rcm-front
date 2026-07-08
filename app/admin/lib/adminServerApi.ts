import { cookies } from "next/headers";

import { API_URL } from "../../lib/config";
import type {
  AdminProduct,
  AdminSellerApplication,
  AdminFinancialLedgerEntry,
  DictionaryItem,
  DictionaryKind,
  PageResponse,
  ProductStatus,
  SellerApplicationStatus,
} from "../types";

async function serverFetch<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies();

  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      Cookie: cookieStore.toString(),
    },
    cache: "no-store",
  });

  if (!response.ok) return null;

  return response.json() as Promise<T>;
}

export async function getAdminProductsServer(
  status: ProductStatus | "ALL",
  page = 0,
  size = 50
): Promise<PageResponse<AdminProduct> | null> {
  const query =
    status === "ALL"
      ? `page=${page}&size=${size}`
      : `status=${status}&page=${page}&size=${size}`;

  return serverFetch<PageResponse<AdminProduct>>(
    `/api/admin/products?${query}`
  );
}

export async function getAdminProductStatusCountsServer(): Promise<
  Record<ProductStatus | "ALL", number>
> {
  const statuses: Array<ProductStatus | "ALL"> = [
    "MODERATION",
    "NEEDS_REVISION",
    "ACTIVE",
    "BLOCKED",
    "DRAFT",
    "ARCHIVED",
    "ALL",
  ];

  const pairs = await Promise.all(
    statuses.map(async (status) => {
      const data = await getAdminProductsServer(status, 0, 1);
      return [status, data?.totalElements ?? 0] as const;
    })
  );

  return Object.fromEntries(pairs) as Record<ProductStatus | "ALL", number>;
}

export async function getAdminProductServer(
  id: number
): Promise<AdminProduct | null> {
  return serverFetch<AdminProduct>(`/api/admin/products/${id}`);
}

export async function getAdminDictionaryServer(
  kind: DictionaryKind
): Promise<DictionaryItem[]> {
  const data = await serverFetch<DictionaryItem[]>(
    `/api/admin/dictionaries/${kind}`
  );

  return Array.isArray(data) ? data : [];
}

export async function getAdminSellerApplicationsServer(
  status: SellerApplicationStatus | "ALL",
  page = 0,
  size = 50
): Promise<PageResponse<AdminSellerApplication> | null> {
  const query =
    status === "ALL"
      ? `page=${page}&size=${size}`
      : `status=${status}&page=${page}&size=${size}`;

  return serverFetch<PageResponse<AdminSellerApplication>>(
    `/api/admin/seller-applications?${query}`
  );
}

export async function getAdminSellerApplicationStatusCountsServer(): Promise<
  Record<SellerApplicationStatus | "ALL", number>
> {
  const statuses: Array<SellerApplicationStatus | "ALL"> = [
    "NEW",
    "APPROVED",
    "REJECTED",
    "ALL",
  ];

  const pairs = await Promise.all(
    statuses.map(async (status) => {
      const data = await getAdminSellerApplicationsServer(status, 0, 1);
      return [status, data?.totalElements ?? 0] as const;
    })
  );

  return Object.fromEntries(pairs) as Record<
    SellerApplicationStatus | "ALL",
    number
  >;
}

export async function getAdminLedgerEntriesServer(
  page = 0,
  size = 50
): Promise<PageResponse<AdminFinancialLedgerEntry> | null> {
  return serverFetch<PageResponse<AdminFinancialLedgerEntry>>(
    `/api/admin/finance/ledger?page=${page}&size=${size}`
  );
}
