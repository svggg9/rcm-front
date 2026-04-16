const CHECKOUT_DRAFT_KEY = "checkout_draft_v1";

export type CheckoutDraft = {
  email: string;
  fullName: string;
  phone: string;
  deliveryMethod: "PICKUP" | "COURIER";
  selectedAddressId: string;
  deliveryAddress: string;
  comment: string;
  paymentMethod: "SBP" | "CARD";
};

export function loadCheckoutDraft(): CheckoutDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(CHECKOUT_DRAFT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") return null;

    return {
      email: typeof parsed.email === "string" ? parsed.email : "",
      fullName: typeof parsed.fullName === "string" ? parsed.fullName : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      deliveryMethod:
        parsed.deliveryMethod === "COURIER" ? "COURIER" : "PICKUP",
      selectedAddressId:
        typeof parsed.selectedAddressId === "string"
          ? parsed.selectedAddressId
          : "",
      deliveryAddress:
        typeof parsed.deliveryAddress === "string" ? parsed.deliveryAddress : "",
      comment: typeof parsed.comment === "string" ? parsed.comment : "",
      paymentMethod: parsed.paymentMethod === "CARD" ? "CARD" : "SBP",
    };
  } catch {
    return null;
  }
}

export function saveCheckoutDraft(draft: CheckoutDraft): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
}

export function clearCheckoutDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CHECKOUT_DRAFT_KEY);
}