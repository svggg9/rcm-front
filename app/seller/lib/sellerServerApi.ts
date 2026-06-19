import { cookies } from "next/headers";

import { API_URL } from "../../lib/config";
import type {
  PageResponse,
  SellerBrand,
  SellerOrderListItem,
  SellerProductListItem,
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

export async function getSellerProductsServer(): Promise<SellerProductListItem[]> {
  const data = await serverFetch<PageResponse<SellerProductListItem>>(
    "/api/seller/products/list?page=0&size=50"
  );

  return Array.isArray(data?.content) ? data.content : [];
}

export async function getSellerOrdersServer(): Promise<SellerOrderListItem[]> {
  const data = await serverFetch<PageResponse<SellerOrderListItem>>(
    "/api/seller/orders/list?page=0&size=20"
  );

  return Array.isArray(data?.content) ? data.content : [];
}

export async function getSellerBrandsServer(): Promise<SellerBrand[]> {
  const data = await serverFetch<SellerBrand[]>("/api/seller/brands");

  return Array.isArray(data) ? data : [];
}
