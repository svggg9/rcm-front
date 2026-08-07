import { cookies } from "next/headers";

import { API_URL } from "../../lib/config";
import type { Me } from "./checkoutPrefill";
import type { CheckoutCartBootstrap } from "../types";

export async function getCheckoutProfileServer(): Promise<Me | null> {
  const cookieStore = await cookies();
  const response = await fetch(`${API_URL}/api/profile`, {
    headers: { Cookie: cookieStore.toString() },
    cache: "no-store",
  });

  if (!response.ok) return null;
  return response.json() as Promise<Me>;
}

export async function getCheckoutCartServer(): Promise<CheckoutCartBootstrap | null> {
  const cookieStore = await cookies();
  const response = await fetch(`${API_URL}/api/cart/me`, {
    headers: { Cookie: cookieStore.toString() },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const data = (await response.json()) as CheckoutCartBootstrap;
  if (!data || typeof data.cartId !== "string" || !Array.isArray(data.items)) {
    return null;
  }

  return data;
}
