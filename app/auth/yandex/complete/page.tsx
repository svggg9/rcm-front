"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { setAuth } from "../../../lib/auth";
import { safeReturnPath } from "../../../lib/safeReturnPath";
import {
  clearGuestFavoriteIds,
  getGuestFavoriteIds,
  syncFavoritesAfterLogin,
} from "../../../lib/favorites";

function YandexAuthCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    async function complete() {
      const error = searchParams.get("error");
      const cartId = searchParams.get("cartId");
      const safeNext = safeReturnPath(searchParams.get("next"));

      if (error) {
        toast.error("Не удалось войти через Яндекс");
        router.replace(safeNext);
        return;
      }

      if (cartId) {
        const guestFavoriteIds = getGuestFavoriteIds();
        setAuth(cartId);

        if (guestFavoriteIds.length > 0) {
          const synced = await syncFavoritesAfterLogin(guestFavoriteIds);
          if (synced) clearGuestFavoriteIds();
        }

      }

      if (!cancelled) {
        router.replace(safeNext);
        router.refresh();
      }
    }

    void complete();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return null;
}

export default function YandexAuthCompletePage() {
  return (
    <Suspense fallback={null}>
      <YandexAuthCompleteContent />
    </Suspense>
  );
}
