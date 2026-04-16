import type { DeliveryMethod } from "../types";

export type Me = {
  id: number;
  username: string;
  email: string | null;
  displayName: string | null;
  role: string;
  sellerApproved: boolean;
  phone: string | null;
  defaultDeliveryAddress: string | null;
  defaultDeliveryMethod: string | null;
};

export type CheckoutPrefill = {
  email: string;
  fullName: string;
  phone: string;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string;
  comment: string;
};

function normalizeDeliveryMethod(value: string | null | undefined): DeliveryMethod {
  if (value === "COURIER") {
    return "COURIER";
  }

  if (value === "PICKUP_POINT" || value === "PICKUP") {
    return "PICKUP_POINT";
  }

  return "PICKUP_POINT";
}

export function buildCheckoutPrefill(params: {
  me?: Me | null;
  existing?: Partial<CheckoutPrefill> | null;
}): CheckoutPrefill {
  const me = params.me ?? null;
  const existing = params.existing ?? {};

  const resolvedDeliveryMethod =
    existing.deliveryMethod || normalizeDeliveryMethod(me?.defaultDeliveryMethod);

  return {
    email:
      (existing.email ?? "").trim() ||
      me?.email?.trim() ||
      me?.username?.trim() ||
      "",

    fullName:
      (existing.fullName ?? "").trim() ||
      me?.displayName?.trim() ||
      me?.username?.trim() ||
      "",

    phone: (existing.phone ?? "").trim() || me?.phone?.trim() || "",

    deliveryMethod: normalizeDeliveryMethod(resolvedDeliveryMethod),

    deliveryAddress:
      (existing.deliveryAddress ?? "").trim() ||
      me?.defaultDeliveryAddress?.trim() ||
      "",

    comment: (existing.comment ?? "").trim() || "",
  };
}