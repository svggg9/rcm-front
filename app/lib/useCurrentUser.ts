"use client";

import { useEffect, useState } from "react";

import { AUTH_EVENT } from "./authEvents";

import { getClientSession } from "./client-session";

import type { SessionUser } from "./session";

export function useCurrentUser() {
  const [user, setUser] = useState<SessionUser | null>(null);

  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const data = await getClientSession();

      setUser(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();

    window.addEventListener(AUTH_EVENT, load);

    return () => {
      window.removeEventListener(AUTH_EVENT, load);
    };
  }, []);

  return {
    user,
    loading,
    isAuthenticated: !!user,
  };
}