import { cookies } from "next/headers";

import { API_URL } from "../../lib/config";
import type { Me, Order, OrderListItem, PageResponse } from "../types";

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

export async function getAccountMeServer(): Promise<Me | null> {
  return serverFetch<Me>("/api/profile");
}

export async function getAccountOrdersServer(): Promise<OrderListItem[]> {
  const data = await serverFetch<PageResponse<OrderListItem>>(
    "/api/orders/my/list?page=0&size=20"
  );

  return Array.isArray(data?.content) ? data.content : [];
}

export async function getAccountOrderServer(orderId: number): Promise<Order | null> {
  return serverFetch<Order>(`/api/orders/${orderId}`);
}
