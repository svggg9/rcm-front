"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CART_EVENT } from "./cartEvents";
import { loadResolvedCartCount } from "./cartAuthority";
import { useCurrentUser } from "./useCurrentUser";

export function useCartCount() {
  const pathname = usePathname();
  const skipCommerceLoad =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/seller" ||
    pathname.startsWith("/seller/");
  const session = useCurrentUser();
  const [confirmed, setConfirmed] = useState({ revision: -1, count: 0 });

  useEffect(() => {
    if (skipCommerceLoad || session.loading || !session.hasResolved || session.error) return;

    let active = true;
    let requestId = 0;

    const load = async () => {
      const currentRequestId = ++requestId;
      try {
        const total = await loadResolvedCartCount();

        if (active && currentRequestId === requestId) {
          setConfirmed({ revision: session.revision, count: total });
        }
      } catch { /* Keep the last confirmed count for this identity. */ }
    };

    void load();

    window.addEventListener(CART_EVENT, load);

    return () => {
      active = false;
      window.removeEventListener(CART_EVENT, load);
    };
  }, [skipCommerceLoad, session.loading, session.hasResolved, session.error, session.revision]);

  return skipCommerceLoad || confirmed.revision !== session.revision ? 0 : confirmed.count;
}
