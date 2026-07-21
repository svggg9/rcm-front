import { cookies } from "next/headers";

import { API_URL } from "../../lib/config";
import type {
  AdminOrder,
  AdminOrderListItem,
  AdminProduct,
  AdminSellerApplication,
  AdminFinancialLedgerEntry,
  AdminCdekWebhookEvent,
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
  const data = await serverFetch<Record<ProductStatus | "ALL", number>>(
    "/api/admin/products/status-counts"
  );

  return data ?? {
    MODERATION: 0,
    NEEDS_REVISION: 0,
    ACTIVE: 0,
    BLOCKED: 0,
    DRAFT: 0,
    ARCHIVED: 0,
    ALL: 0,
  };
}

export async function getAdminProductServer(
  id: number
): Promise<AdminProduct | null> {
  return serverFetch<AdminProduct>(`/api/admin/products/${id}`);
}

export async function getAdminOrdersServer(
  page = 0,
  size = 50
): Promise<PageResponse<AdminOrderListItem> | null> {
  return serverFetch<PageResponse<AdminOrderListItem>>(
    `/api/admin/orders/list?page=${page}&size=${size}`
  );
}

export async function getAdminOrderServer(
  id: number
): Promise<AdminOrder | null> {
  return serverFetch<AdminOrder>(`/api/admin/orders/${id}`);
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
  const data = await serverFetch<
    Record<SellerApplicationStatus | "ALL", number>
  >("/api/admin/seller-applications/status-counts");

  return data ?? {
    NEW: 0,
    APPROVED: 0,
    REJECTED: 0,
    ALL: 0,
  };
}

export async function getAdminLedgerEntriesServer(
  page = 0,
  size = 50
): Promise<PageResponse<AdminFinancialLedgerEntry> | null> {
  return serverFetch<PageResponse<AdminFinancialLedgerEntry>>(
    `/api/admin/finance/ledger?page=${page}&size=${size}`
  );
}

export async function getAdminCdekWebhookEventsServer(
  page = 0,
  size = 50
): Promise<PageResponse<AdminCdekWebhookEvent> | null> {
  return serverFetch<PageResponse<AdminCdekWebhookEvent>>(
    `/api/admin/delivery/cdek/webhook-events?page=${page}&size=${size}`
  );
}
