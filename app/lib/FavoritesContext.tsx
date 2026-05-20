"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
} from "react";

import { apiFetch, API_URL } from "./api";
import {
  getGuestFavoriteIds,
  addGuestFavorite,
  removeGuestFavorite,
} from "./favorites";

type FavoriteProduct = {
  id?: unknown;
};

type FavoritesContextType = {
  favoriteIds: number[];
  count: number;
  toggle: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextType | null>(null);

async function hasSession() {
  const response = await apiFetch(`${API_URL}/api/auth/session`);
  return response.ok;
}

export function FavoritesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);

  const refresh = useCallback(async () => {
    const authenticated = await hasSession();

    if (!authenticated) {
      setFavoriteIds(getGuestFavoriteIds());
      return;
    }

    try {
      const response = await apiFetch(`${API_URL}/api/favorites`);

      if (!response.ok) {
        setFavoriteIds([]);
        return;
      }

      const data: unknown = await response.json();

      if (!Array.isArray(data)) {
        setFavoriteIds([]);
        return;
      }

      const ids = data
        .map((product: FavoriteProduct) => product.id)
        .filter((id): id is number => typeof id === "number");

      setFavoriteIds(ids);
    } catch {
      setFavoriteIds([]);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  useEffect(() => {
    const handler = () => {
      void refresh();
    };

    window.addEventListener("auth-changed", handler);
    return () => window.removeEventListener("auth-changed", handler);
  }, [refresh]);

  const toggle = useCallback(
    async (id: number) => {
      const isFav = favoriteIds.includes(id);
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

      if (!response.ok) return;

      setFavoriteIds((prev) =>
        isFav ? prev.filter((value) => value !== id) : [...prev, id]
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