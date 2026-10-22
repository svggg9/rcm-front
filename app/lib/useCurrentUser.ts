"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getClientSession, getClientSessionSnapshot, getServerSessionSnapshot, subscribeClientSession } from "./client-session";

export function useCurrentUser() {
  const state = useSyncExternalStore(subscribeClientSession, getClientSessionSnapshot, getServerSessionSnapshot);
  useEffect(() => { void getClientSession().catch(() => undefined); }, [state.revision]);
  return {
    ...state,
    isAuthenticated: state.user !== null,
    isGuest: state.hasResolved && state.user === null && !state.error,
    async reload() {
      try { return await getClientSession({ force: true }); }
      catch { return undefined; }
    },
  };
}
