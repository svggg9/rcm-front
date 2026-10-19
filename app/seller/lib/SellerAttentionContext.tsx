"use client";
import { createContext, useContext } from "react";
import type { useSellerNavigationAttention } from "./useSellerNavigationAttention";
export const SellerAttentionContext = createContext<ReturnType<typeof useSellerNavigationAttention> | null>(null);
export function useSellerAttention() {
  const value = useContext(SellerAttentionContext);
  if (!value) throw new Error("SellerAttentionContext is required");
  return value;
}
