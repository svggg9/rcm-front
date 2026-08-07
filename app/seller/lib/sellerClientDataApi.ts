import { apiFetch, API_URL } from "../../lib/api";

import type {
  PageResponse,
  SellerFinanceSummary,
  SellerDashboardSummary,
  SellerOrderListItem,
  SellerProductListItem,
} from "../types";

export async function getSellerProductsClient(
  page = 0,
  size = 50
): Promise<PageResponse<SellerProductListItem>> {
  return getPage<SellerProductListItem>(
    `/api/seller/products/list?page=${page}&size=${size}`,
    "Не удалось загрузить товары"
  );
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

async function getPage<T>(path: string, errorMessage: string): Promise<PageResponse<T>> {
  const response = await apiFetch(`${API_URL}${path}`);

  if (!response.ok) {
    throw new Error(errorMessage);
  }

  const data = (await response.json()) as PageResponse<T>;

  return {
    ...data,
    content: Array.isArray(data.content) ? data.content : [],
  };
}
