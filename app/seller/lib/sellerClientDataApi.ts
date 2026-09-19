import { apiFetch, API_URL } from "../../lib/api";
import type { ProductSort } from "./sellerProductSort";

import type {
  PageResponse,
  SellerFinanceSummary,
  SellerDashboardSummary,
  SellerOrderListItem,
  SellerProductListItem,
} from "../types";

export const SELLER_PRODUCTS_PAGE_SIZE = 50;

export async function getSellerProductsClient(
  page = 0,
  size = SELLER_PRODUCTS_PAGE_SIZE,
  sort: ProductSort | null = null
): Promise<PageResponse<SellerProductListItem>> {
  return getPage<SellerProductListItem>(
    `/api/seller/products/list?page=${page}&size=${size}&sort=${sort ? `${sort.key},${sort.direction}` : "createdAt,desc"}`,
    "Не удалось загрузить товары"
  );
}

export async function getSellerActiveProductsClient(signal?: AbortSignal): Promise<SellerProductListItem[]> {
  const products = new Map<number, SellerProductListItem>();
  // The seller endpoint is ownership-scoped but has no status filter. Continue
  // past draft-only pages so the quick-access row never reports a false empty state.
  for (let page = 0; ; page += 1) {
    const result = await getPage<SellerProductListItem>(
      `/api/seller/products/list?page=${page}&size=50&sort=id,desc`,
      "Не удалось загрузить товары",
      signal
    );
    for (const product of result.content) {
      if (product.status === "ACTIVE") products.set(product.id, product);
      if (products.size === 12) return [...products.values()];
    }
    if (!result.content.length || page + 1 >= result.totalPages) return [...products.values()];
  }
}

export async function getSellerOrdersClient(
  page = 0,
  size = 20
): Promise<PageResponse<SellerOrderListItem>> {
  return getPage<SellerOrderListItem>(
    `/api/seller/orders/list?page=${page}&size=${size}`,
    "Не удалось загрузить заказы"
  );
}

export async function getSellerFinanceClient(): Promise<SellerFinanceSummary> {
  const response = await apiFetch(`${API_URL}/api/seller/finance/summary`);

  if (!response.ok) {
    throw new Error("Не удалось загрузить финансовую сводку");
  }

  return response.json() as Promise<SellerFinanceSummary>;
}

export async function getSellerDashboardSummaryClient(): Promise<SellerDashboardSummary> {
  const response = await apiFetch(`${API_URL}/api/seller/dashboard-summary`);

  if (!response.ok) {
    throw new Error("Не удалось загрузить сводку магазина");
  }

  return response.json() as Promise<SellerDashboardSummary>;
}

async function getPage<T>(path: string, errorMessage: string, signal?: AbortSignal): Promise<PageResponse<T>> {
  const response = await apiFetch(`${API_URL}${path}`, { signal });

  if (!response.ok) {
    throw new Error(errorMessage);
  }

  const data = (await response.json()) as PageResponse<T>;

  return {
    ...data,
    content: Array.isArray(data.content) ? data.content : [],
  };
}
