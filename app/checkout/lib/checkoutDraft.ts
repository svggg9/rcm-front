const CHECKOUT_DRAFT_KEY = "checkout_draft_v1";

export type CheckoutDraft = {
  email: string;
  fullName: string;
  phone: string;
  deliveryMethod: "PICKUP" | "COURIER";
  selectedAddressId: string;
  deliveryAddress: string;
  countryCode: "RU" | "BY" | "KZ" | "AM";
  apartment: string;
  floor: string;
  intercom: string;
  fittingMode: "WITH_FITTING" | "WITHOUT_FITTING";
  otherRecipientEnabled: boolean;
  otherRecipientName: string;
  otherRecipientPhone: string;
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
      countryCode:
        parsed.countryCode === "BY" ||
        parsed.countryCode === "KZ" ||
        parsed.countryCode === "AM"
          ? parsed.countryCode
          : "RU",

      apartment: typeof parsed.apartment === "string" ? parsed.apartment : "",
      floor: typeof parsed.floor === "string" ? parsed.floor : "",
      intercom: typeof parsed.intercom === "string" ? parsed.intercom : "",
      fittingMode:
        parsed.fittingMode === "WITHOUT_FITTING"
          ? "WITHOUT_FITTING"
          : "WITH_FITTING",

      otherRecipientEnabled: parsed.otherRecipientEnabled === true,
      otherRecipientName:
        typeof parsed.otherRecipientName === "string"
          ? parsed.otherRecipientName
          : "",
      otherRecipientPhone:
        typeof parsed.otherRecipientPhone === "string"
          ? parsed.otherRecipientPhone
          : "",
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