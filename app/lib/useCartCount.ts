"use client";

import { useEffect, useState } from "react";
import { CART_EVENT } from "./cartEvents";
import { getCartId } from "./auth";
import { apiFetch } from "./api";

type CartItem = {
  quantity: number;
};

export function useCartCount() {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    const load = async () => {
      const cartId = getCartId();
      if (!cartId) {
        setCount(0);
        return;
      }

      try {
        const res = await apiFetch(
          `http://localhost:9696/api/cart?cartId=${cartId}`
        );
        const items: CartItem[] = await res.json();
        const total = items.reduce((sum, i) => sum + i.quantity, 0);
        setCount(total);
      } catch {
        setCount(0);
      }
    };

    load(); // initial

    window.addEventListener(CART_EVENT, load);
    return () => window.removeEventListener(CART_EVENT, load);
  }, []);

  return count;
}
