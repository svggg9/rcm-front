"use client";

import { useEffect, useState } from "react";
import { getUserRole } from "./auth";

export function useUserRole() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setRole(getUserRole());
    sync();

    window.addEventListener("auth-changed", sync as EventListener);
    return () => window.removeEventListener("auth-changed", sync as EventListener);
  }, []);

  return role;
}