"use client";

import { createContext, useContext } from "react";

export type AuthModalMode = "login" | "register";

export type AuthModalContextValue = {
  openAuth: (mode?: AuthModalMode, next?: string) => void;
  closeAuth: () => void;
};

export const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function useAuthModal() {
  const value = useContext(AuthModalContext);

  if (!value) {
    throw new Error("useAuthModal must be used inside AuthModalProvider");
  }

  return value;
}