import type {
  CountryCode,
  DeliveryMethod,
  FittingMode,
  PaymentMethod,
} from "../types";

const CHECKOUT_DRAFT_KEY = "checkout_draft_v1";

function isEmailLike(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isPhoneLike(value: string): boolean {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");

  return digits.length >= 10 && /^[+\d\s\-()]+$/.test(trimmed);
}

function getCheckoutDraftKey(): string {
  if (typeof window === "undefined") return CHECKOUT_DRAFT_KEY;

  const scopedCartId =
    localStorage.getItem("user_cart_id") ||
    localStorage.getItem("guest_cart_id") ||
    "";

  if (!scopedCartId) return CHECKOUT_DRAFT_KEY;

  return `${CHECKOUT_DRAFT_KEY}:${scopedCartId}`;
}

export type CheckoutDraft = {
  email: string;
  fullName: string;
  phone: string;
  deliveryMethod: DeliveryMethod;
  selectedAddressId: string;
  selectedPickupPointLabel: string;
  deliveryAddress: string;
  countryCode: CountryCode;
  selectedCityCode: number | null;
  selectedCityName: string;
  apartment: string;
  floor: string;
  intercom: string;
  fittingMode: FittingMode;
  otherRecipientEnabled: boolean;
  otherRecipientName: string;
  otherRecipientPhone: string;
  comment: string;
  paymentMethod: PaymentMethod;
};

export function loadCheckoutDraft(): CheckoutDraft | null {
  if (typeof window === "undefined") return null;

  try {
    localStorage.removeItem(CHECKOUT_DRAFT_KEY);

    const raw = localStorage.getItem(getCheckoutDraftKey());

    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") return null;

    const deliveryMethod: DeliveryMethod = "PICKUP";

    const paymentMethod: PaymentMethod =
      parsed.paymentMethod === "CARD" ||
      parsed.paymentMethod === "SBP"
        ? parsed.paymentMethod
        : "CARD";

    return {
      email:
        typeof parsed.email === "string" && isEmailLike(parsed.email)
          ? parsed.email
          : "",

      fullName:
        typeof parsed.fullName === "string" && !isPhoneLike(parsed.fullName)
          ? parsed.fullName
          : "",

      phone:
        typeof parsed.phone === "string"
          ? parsed.phone
          : "",

      deliveryMethod,

      selectedAddressId:
        typeof parsed.selectedAddressId === "string"
          ? parsed.selectedAddressId
          : "",

      selectedPickupPointLabel:
        typeof parsed.selectedPickupPointLabel === "string"
          ? parsed.selectedPickupPointLabel
          : "",

      deliveryAddress:
        typeof parsed.deliveryAddress === "string"
          ? parsed.deliveryAddress
          : "",

      countryCode: "RU",

      selectedCityCode:
        typeof parsed.selectedCityCode === "number"
          ? parsed.selectedCityCode
          : null,

      selectedCityName:
        typeof parsed.selectedCityName === "string"
          ? parsed.selectedCityName
          : "",

      apartment:
        typeof parsed.apartment === "string"
          ? parsed.apartment
          : "",

      floor:
        typeof parsed.floor === "string"
          ? parsed.floor
          : "",

      intercom:
        typeof parsed.intercom === "string"
          ? parsed.intercom
          : "",

      fittingMode: "WITHOUT_FITTING",

      otherRecipientEnabled:
        parsed.otherRecipientEnabled === true,

      otherRecipientName:
        typeof parsed.otherRecipientName === "string"
          ? parsed.otherRecipientName
          : "",

      otherRecipientPhone:
        typeof parsed.otherRecipientPhone === "string"
          ? parsed.otherRecipientPhone
          : "",

      comment:
        typeof parsed.comment === "string"
          ? parsed.comment
          : "",

      paymentMethod,
    };
  } catch {
    return null;
  }
}

export function saveCheckoutDraft(
  draft: CheckoutDraft
): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    getCheckoutDraftKey(),
    JSON.stringify(draft)
  );
}

export function clearCheckoutDraft(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(CHECKOUT_DRAFT_KEY);
  localStorage.removeItem(getCheckoutDraftKey());
}
