"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
} from "react";
import { apiFetch, API_URL } from "./api";
import { getToken } from "./auth";
import {
  getGuestFavoriteIds,
  addGuestFavorite,
  removeGuestFavorite,
} from "./favorites";

type FavoritesContextType = {
  favoriteIds: number[];
  count: number;
  toggle: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export function FavoritesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);

  const refresh = useCallback(async () => {
    const token = getToken();

    if (!token) {
      setFavoriteIds(getGuestFavoriteIds());
      return;
    }

    try {
      const r = await apiFetch(`${API_URL}/api/favorites`);

      if (!r.ok) {
        setFavoriteIds([]);
        return;
      }

      const data = await r.json();

      if (Array.isArray(data)) {
        const ids = data
          .map((p: any) => p?.id)
          .filter((x: any): x is number => typeof x === "number");

        setFavoriteIds(ids);
      } else {
        setFavoriteIds([]);
      }
    } catch {
      setFavoriteIds([]);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handler = () => {
      refresh();
    };

    window.addEventListener("auth-changed", handler);
    return () => window.removeEventListener("auth-changed", handler);
  }, [refresh]);

  const toggle = useCallback(
    async (id: number) => {
      const token = getToken();
      const isFav = favoriteIds.includes(id);

      if (!token) {
        const next = isFav
          ? removeGuestFavorite(id)
          : addGuestFavorite(id);

        setFavoriteIds(next);
        return;
      }

      const method = isFav ? "DELETE" : "POST";
      const r = await apiFetch(`${API_URL}/api/favorites/${id}`, { method });

      if (!r.ok) return;

      setFavoriteIds((prev) =>
        isFav ? prev.filter((x) => x !== id) : [...prev, id]
      );
    },
    [favoriteIds]
  );

  return (
    <FavoritesContext.Provider
      value={{
        favoriteIds,
        count: favoriteIds.length,
        toggle,
        refresh,
      }}
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