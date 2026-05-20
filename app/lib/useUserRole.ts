"use client";

import { useCurrentUser } from "./useCurrentUser";

export function useUserRole() {
  const { user } = useCurrentUser();

  return user?.role ?? null;
}