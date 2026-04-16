"use client";

import { useEffect, useState } from "react";
import { CART_EVENT } from "./cartEvents";
import { AUTH_EVENT } from "./authEvents";
import { ensureCartId } from "./auth";
import { apiFetch, API_URL } from "./api";

type CartItem = {
  quantity: number;
};

export function useCartCount() {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const cartId = await ensureCartId();

        if (!active) return;

        if (!cartId) {
          setCount(0);
          return;
        }

        const res = await apiFetch(
          `${API_URL}/api/cart?cartId=${encodeURIComponent(cartId)}`
        );

        if (!res.ok) {
          setCount(0);
          return;
        }

        const items: CartItem[] = await res.json();
        const total = Array.isArray(items)
          ? items.reduce((sum, i) => sum + i.quantity, 0)
          : 0;

        if (active) {
          setCount(total);
        }
      } catch {
        if (active) {
          setCount(0);
        }
      }
    };

    void load();

    window.addEventListener(CART_EVENT, load);
    window.addEventListener(AUTH_EVENT, load);

    return () => {
      active = false;
      window.removeEventListener(CART_EVENT, load);
      window.removeEventListener(AUTH_EVENT, load);
    };
  }, []);

  return count;
}