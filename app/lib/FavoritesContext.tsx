"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import { apiFetch, API_URL } from "./api";
import { getClientSession, getClientSessionRevision } from "./client-session";
import { useCurrentUser } from "./useCurrentUser";
import { ApiRequestError, readApiError, toApiError } from "./apiErrors";
import {
  getGuestFavoriteIds,
  addGuestFavorite,
  removeGuestFavorite,
  FAVORITES_EVENT,
  emitFavoritesChanged,
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
  const session = useCurrentUser();
  const [confirmed, setConfirmed] = useState<{ revision: number; ids: number[]; hasLoaded: boolean }>({ revision: -1, ids: [], hasLoaded: false });
  const favoriteIds = confirmed.revision === session.revision ? confirmed.ids : EMPTY_FAVORITES;
  const requestVersion = useRef(0);
  const pendingRead = useRef<Promise<void> | null>(null);
  const mutations = useRef(new Map<number, Promise<void>>());
  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const isFavorite = useCallback(
    (id: number) => favoriteIdSet.has(id),
    [favoriteIdSet]
  );

  const refresh = useCallback((): Promise<void> => {
    if (skipCommerceLoad || mutations.current.size > 0) return Promise.resolve();
    if (pendingRead.current) return pendingRead.current;
    const ticket = ++requestVersion.current;
    const revision = getClientSessionRevision();
    const request = (async () => {
      try {
        const user = await getClientSession();
        if (ticket !== requestVersion.current || revision !== getClientSessionRevision()) return;
        let ids = getGuestFavoriteIds();
        if (user) {
          const response = await apiFetch(`${API_URL}/api/favorites/ids`, { signal: AbortSignal.timeout(15_000) });
          if (!response.ok) throw await readApiError(response, "Не удалось загрузить избранное");
          const data: unknown = await response.json();
          if (!Array.isArray(data) || !data.every(id => Number.isSafeInteger(id) && id > 0)) throw new ApiRequestError("Не удалось загрузить избранное", "invalid-response");
          ids = [...new Set(data as number[])];
        }
        if (ticket === requestVersion.current && revision === getClientSessionRevision()) setConfirmed({ revision, ids, hasLoaded: true });
      } catch { /* Keep the confirmed favorites; an unavailable session is never a guest. */ }
    })().finally(() => { if (pendingRead.current === request) pendingRead.current = null; });
    pendingRead.current = request;
    return request;
  }, [skipCommerceLoad]);

  useEffect(() => {
    requestVersion.current++;
    pendingRead.current = null;
    if (!session.loading && session.hasResolved && !session.error) void refresh();
  }, [refresh, session.loading, session.hasResolved, session.error, session.revision]);

  useEffect(() => () => { requestVersion.current++; pendingRead.current = null; }, []);
  useEffect(() => { mutations.current.clear(); }, [session.revision]);

  useEffect(() => {
    if (skipCommerceLoad) return;

    const handler = () => {
      void refresh();
    };

    window.addEventListener(FAVORITES_EVENT, handler);
    return () => window.removeEventListener(FAVORITES_EVENT, handler);
  }, [refresh, skipCommerceLoad]);

  const toggle = useCallback(
    async (id: number) => {
      if (mutations.current.has(id)) return mutations.current.get(id);
      const isFav = favoriteIdSet.has(id);
      const revision = getClientSessionRevision();
      const request = (async () => {
        try {
          const user = await getClientSession();
          if (revision !== getClientSessionRevision() || confirmed.revision !== revision || !confirmed.hasLoaded) {
            throw new ApiRequestError("Не удалось обновить избранное — попробуйте ещё раз", "invalid-response");
          }
          requestVersion.current++;
          pendingRead.current = null;
          if (!user) {
            const ids = isFav ? removeGuestFavorite(id) : addGuestFavorite(id);
            setConfirmed({ revision, ids, hasLoaded: true });
            return;
          }
          const response = await apiFetch(`${API_URL}/api/favorites/${id}`, { method: isFav ? "DELETE" : "POST", signal: AbortSignal.timeout(15_000) });
          if (!response.ok) throw await readApiError(response, "Не удалось обновить избранное");
          if (revision !== getClientSessionRevision()) return;
          setConfirmed(prev => prev.revision !== revision ? prev : { ...prev, ids: isFav ? prev.ids.filter(value => value !== id) : [...new Set([...prev.ids, id])] });
          emitFavoritesChanged();
        } catch (failure) { throw toApiError(failure, "Не удалось обновить избранное"); }
      })().finally(() => {
        if (mutations.current.get(id) === request) {
          mutations.current.delete(id);
          if (mutations.current.size === 0) void refresh();
        }
      });
      mutations.current.set(id, request);
      return request;
    },
    [favoriteIdSet, confirmed, refresh]
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
