"use client";

import { useEffect, useState } from "react";
import { isAuthenticated } from "./auth";
import { AUTH_EVENT } from "./authEvents";

export function useClientAuth() {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);

  useEffect(() => {
    const update = () => setIsAuth(isAuthenticated());

    update(); // initial

    window.addEventListener(AUTH_EVENT, update);
    return () => window.removeEventListener(AUTH_EVENT, update);
  }, []);

  return isAuth;
}
