"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CART_EVENT } from "./cartEvents";
import { loadResolvedCartCount } from "./cartAuthority";

export function useCartCount() {
  const pathname = usePathname();
  const skipCommerceLoad =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/seller" ||
    pathname.startsWith("/seller/");
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    if (skipCommerceLoad) return;

    let active = true;
    let requestId = 0;

    const load = async () => {
      const currentRequestId = ++requestId;
      try {
        const total = await loadResolvedCartCount();

        if (active && currentRequestId === requestId) {
          setCount(total);
        }
      } catch {
        if (active && currentRequestId === requestId) {
          setCount(0);
        }
      }
    };

    void load();

    window.addEventListener(CART_EVENT, load);

    return () => {
      active = false;
      window.removeEventListener(CART_EVENT, load);
    };
  }, [skipCommerceLoad]);

  return skipCommerceLoad ? 0 : count;
}
