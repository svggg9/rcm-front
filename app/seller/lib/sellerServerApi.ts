import { cookies } from "next/headers";

import { API_URL } from "../../lib/config";
import type {
  PageResponse,
  SellerBrand,
  SellerFinanceSummary,
  SellerDashboardSummary,
  SellerOrderListItem,
  SellerProductListItem,
} from "../types";
import type { SellerOnboardingStatus } from "./sellerOnboardingApi";

async function serverFetch<T>(path: string): Promise<T | null> {
  return (await serverFetchResult<T>(path)).data;
}

async function serverFetchResult<T>(path: string) {
  const cookieStore = await cookies();

  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      Cookie: cookieStore.toString(),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return { data: null, status: response.status } as const;
  }

  return {
    data: (await response.json()) as T,
    status: response.status,
  } as const;
}

export async function getSellerProductsServer() {
  const result = await serverFetchResult<PageResponse<SellerProductListItem>>(
    "/api/seller/products/list?page=0&size=50"
  );
  const items = Array.isArray(result.data?.content) ? result.data.content : [];

  return {
    items,
    totalElements: result.data?.totalElements ?? items.length,
    nextPage: getNextPage(result.data),
    loaded: result.data !== null,
  };
}

export async function getSellerOrdersServer() {
  const result = await serverFetchResult<PageResponse<SellerOrderListItem>>(
    "/api/seller/orders/list?page=0&size=20"
  );
  const items = Array.isArray(result.data?.content) ? result.data.content : [];

  return {
    items,
    totalElements: result.data?.totalElements ?? items.length,
    nextPage: getNextPage(result.data),
    loaded: result.data !== null,
  };
}

function getNextPage<T>(page: PageResponse<T> | null) {
  if (!page || page.number + 1 >= page.totalPages) return null;
  return page.number + 1;
}

export async function getSellerBrandsServer(): Promise<SellerBrand[]> {
  return (await getSellerAccessAndBrandsServer()).brands;
}

export async function getSellerAccessAndBrandsServer() {
  const result = await serverFetchResult<SellerBrand[]>("/api/seller/brands");

  return {
    brands: Array.isArray(result.data) ? result.data : [],
    status: result.status,
  };
}

export async function getSellerProductDetailsServer<T>(productId: number) {
  const result = await serverFetchResult<T>(`/api/seller/products/${productId}`);

  return {
    product: result.data,
    status: result.status,
  };
}

export async function getSellerFinanceServer(): Promise<SellerFinanceSummary | null> {
  return serverFetch<SellerFinanceSummary>("/api/seller/finance/summary");
}

export async function getSellerDashboardSummaryServer(): Promise<SellerDashboardSummary | null> {
  return serverFetch<SellerDashboardSummary>("/api/seller/dashboard-summary");
}

export async function getSellerOnboardingStatusServer(): Promise<SellerOnboardingStatus | null> {
  return serverFetch<SellerOnboardingStatus>("/api/seller/onboarding-status");
}
