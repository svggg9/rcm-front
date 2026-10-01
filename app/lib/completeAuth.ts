import { setAuth } from "./auth";
import {
  clearGuestFavoriteIds,
  getGuestFavoriteIds,
  syncFavoritesAfterLogin,
} from "./favorites";

export async function completeAuth(cartId: string) {
  const guestFavoriteIds = getGuestFavoriteIds();
  setAuth(cartId);

  if (guestFavoriteIds.length > 0) {
    const synced = await syncFavoritesAfterLogin(guestFavoriteIds);
    if (synced) clearGuestFavoriteIds();
  }
}
