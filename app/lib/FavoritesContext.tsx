"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import { apiFetch, API_URL } from "./api";
import { getClientSession } from "./client-session";
import {
  getGuestFavoriteIds,
  addGuestFavorite,
  removeGuestFavorite,
} from "./favorites";

type FavoritesContextType = {
  favoriteIds: number[];
  isFavorite: (id: number) => boolean;
  count: number;
  toggle: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextType | null>(null);
const EMPTY_FAVORITES: number[] = [];
const NEVER_FAVORITE = () => false;

async function hasSession() {
  return (await getClientSession()) !== null;
}

export function FavoritesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const skipCommerceLoad =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/seller" ||
    pathname.startsWith("/seller/");
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const isFavorite = useCallback(
    (id: number) => favoriteIdSet.has(id),
    [favoriteIdSet]
  );

  const refresh = useCallback(async () => {
    if (skipCommerceLoad) return;

    const authenticated = await hasSession();

    if (!authenticated) {
      setFavoriteIds(getGuestFavoriteIds());
      return;
    }

    try {
      const response = await apiFetch(`${API_URL}/api/favorites/ids`);

      if (!response.ok) {
        setFavoriteIds([]);
        return;
      }

      const data: unknown = await response.json();

      if (!Array.isArray(data)) {
        setFavoriteIds([]);
        return;
      }

      const ids = data.filter(
        (id): id is number => typeof id === "number" && Number.isFinite(id)
      );

      setFavoriteIds(ids);
    } catch {
      setFavoriteIds([]);
    }
  }, [skipCommerceLoad]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  useEffect(() => {
    if (skipCommerceLoad) return;

    const handler = () => {
      void refresh();
    };

    window.addEventListener("auth-changed", handler);
    return () => window.removeEventListener("auth-changed", handler);
  }, [refresh, skipCommerceLoad]);

  const toggle = useCallback(
    async (id: number) => {
      const isFav = favoriteIdSet.has(id);
      const authenticated = await hasSession();

      if (!authenticated) {
        const next = isFav
          ? removeGuestFavorite(id)
          : addGuestFavorite(id);

        setFavoriteIds(next);
        return;
      }

      const method = isFav ? "DELETE" : "POST";

      const response = await apiFetch(`${API_URL}/api/favorites/${id}`, {
        method,
      });

      if (!response.ok) {
        throw new Error("Не удалось обновить избранное");
      }

      setFavoriteIds((prev) =>
        isFav ? prev.filter((value) => value !== id) : [...prev, id]
      );
    },
    [favoriteIdSet]
  );

  const contextValue = useMemo<FavoritesContextType>(
    () => ({
      favoriteIds: skipCommerceLoad ? EMPTY_FAVORITES : favoriteIds,
      isFavorite: skipCommerceLoad ? NEVER_FAVORITE : isFavorite,
      count: skipCommerceLoad ? 0 : favoriteIds.length,
      toggle,
      refresh,
    }),
    [favoriteIds, isFavorite, refresh, skipCommerceLoad, toggle]
  );

  return (
    <FavoritesContext.Provider
      value={contextValue}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);

  if (!ctx) {
    throw new Error("useFavorites must be used inside FavoritesProvider");
  }

  return ctx;
}
