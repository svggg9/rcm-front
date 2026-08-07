import { cookies } from "next/headers";

import { API_URL } from "../../lib/config";
import type {
  AdminOrder,
  AdminOrderListItem,
  AdminProduct,
  AdminProductListItem,
  AdminSellerApplication,
  AdminFinancialLedgerEntry,
  AdminSellerPayout,
  AdminSellerPayoutStats,
  AdminStorefrontHome,
  AdminCdekWebhookEvent,
  DictionaryItem,
  DictionaryKind,
  PageResponse,
  FinancialLedgerEntryType,
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
): Promise<PageResponse<AdminProductListItem> | null> {
  const query =
    status === "ALL"
      ? `page=${page}&size=${size}`
      : `status=${status}&page=${page}&size=${size}`;

  return serverFetch<PageResponse<AdminProductListItem>>(
    `/api/admin/products/list?${query}`
  );
}

export async function getAdminProductStatusCountsServer(): Promise<
  Record<ProductStatus | "ALL", number> | null
> {
  return serverFetch<Record<ProductStatus | "ALL", number>>(
    "/api/admin/products/status-counts"
  );
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

export async function getAdminStorefrontHomeServer(): Promise<AdminStorefrontHome | null> {
  return serverFetch<AdminStorefrontHome>("/api/admin/storefront/home");
}

export async function getAdminDictionaryServer(
  kind: DictionaryKind
): Promise<DictionaryItem[] | null> {
  const data = await serverFetch<DictionaryItem[]>(
    `/api/admin/dictionaries/${kind}`
  );

  return data === null ? null : Array.isArray(data) ? data : [];
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
  Record<SellerApplicationStatus | "ALL", number> | null
> {
  return serverFetch<
    Record<SellerApplicationStatus | "ALL", number>
  >("/api/admin/seller-applications/status-counts");
}

export async function getAdminLedgerEntriesServer(
  page = 0,
  size = 50,
  entryType: FinancialLedgerEntryType | "ALL" = "ALL",
  orderGroupId = ""
): Promise<PageResponse<AdminFinancialLedgerEntry> | null> {
  const query = new URLSearchParams({
    page: String(page),
    size: String(size),
  });

  if (entryType !== "ALL") query.set("entryType", entryType);
  if (orderGroupId.trim()) query.set("orderGroupId", orderGroupId.trim());

  return serverFetch<PageResponse<AdminFinancialLedgerEntry>>(
    `/api/admin/finance/ledger?${query.toString()}`
  );
}

export async function getAdminSellerPayoutsServer(
  page = 0,
  size = 50
): Promise<PageResponse<AdminSellerPayout> | null> {
  return serverFetch<PageResponse<AdminSellerPayout>>(
    `/api/admin/finance/payouts/list?page=${page}&size=${size}`
  );
}

export async function getAdminSellerPayoutStatsServer(): Promise<AdminSellerPayoutStats | null> {
  return serverFetch<AdminSellerPayoutStats>(
    "/api/admin/finance/payouts/stats"
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
