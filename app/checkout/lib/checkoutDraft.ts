import type { DeliveryMethod, DeliveryOffer, PaymentMethod, PickupPoint } from "../types";

const CHECKOUT_DRAFT_KEY = "checkout_draft_v2";

export type CheckoutDraft = {
  email: string;
  fullName: string;
  phone: string;
  deliveryMethod: DeliveryMethod;
  pickupSearchQuery: string;
  selectedPickupPoint: PickupPoint | null;
  selectedOffer: DeliveryOffer | null;
  deliveryAddress: string;
  comment: string;
  paymentMethod: PaymentMethod;
};

type LegacyCheckoutDraft = {
  email?: unknown;
  fullName?: unknown;
  phone?: unknown;
  deliveryMethod?: unknown;
  selectedAddressId?: unknown;
  deliveryAddress?: unknown;
  comment?: unknown;
  paymentMethod?: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeDeliveryMethod(value: unknown): DeliveryMethod {
  if (value === "COURIER") {
    return "COURIER";
  }

  if (value === "PICKUP_POINT" || value === "PICKUP") {
    return "PICKUP_POINT";
  }

  return "PICKUP_POINT";
}

function normalizePaymentMethod(value: unknown): PaymentMethod {
  return value === "CARD" ? "CARD" : "SBP";
}

function normalizePickupPoint(value: unknown): PickupPoint | null {
  if (!isObject(value)) {
    return null;
  }

  const id = typeof value.id === "string" ? value.id : "";
  const name = typeof value.name === "string" ? value.name : "";
  const type = typeof value.type === "string" ? value.type : "pickup_point";
  const fullAddress =
    typeof value.fullAddress === "string" ? value.fullAddress : "";

  if (!id || !fullAddress) {
    return null;
  }

  return {
    id,
    name,
    type,
    fullAddress,
    instruction:
      typeof value.instruction === "string" ? value.instruction : undefined,
    latitude:
      typeof value.latitude === "number" ? value.latitude : null,
    longitude:
      typeof value.longitude === "number" ? value.longitude : null,
    paymentMethods: Array.isArray(value.paymentMethods)
      ? value.paymentMethods.filter(
          (item): item is string => typeof item === "string"
        )
      : undefined,
    yandexBranded:
      typeof value.yandexBranded === "boolean" ? value.yandexBranded : null,
    marketPartner:
      typeof value.marketPartner === "boolean" ? value.marketPartner : null,
    operatorId:
      typeof value.operatorId === "string" ? value.operatorId : undefined,
  };
}

function normalizeOffer(value: unknown): DeliveryOffer | null {
  if (!isObject(value)) {
    return null;
  }

  const offerId = typeof value.offerId === "string" ? value.offerId : "";
  if (!offerId) {
    return null;
  }

  return {
    offerId,
    expiresAt:
      typeof value.expiresAt === "string" ? value.expiresAt : null,
    pricingTotalAmount:
      typeof value.pricingTotalAmount === "number"
        ? value.pricingTotalAmount
        : null,
    pricingTotalCurrency:
      typeof value.pricingTotalCurrency === "string"
        ? value.pricingTotalCurrency
        : null,
    pricingAmount:
      typeof value.pricingAmount === "number" ? value.pricingAmount : null,
    pricingCurrency:
      typeof value.pricingCurrency === "string" ? value.pricingCurrency : null,
    deliveryFrom:
      typeof value.deliveryFrom === "string" ? value.deliveryFrom : null,
    deliveryTo:
      typeof value.deliveryTo === "string" ? value.deliveryTo : null,
    deliveryPolicy:
      typeof value.deliveryPolicy === "string" ? value.deliveryPolicy : null,
    pickupFrom:
      typeof value.pickupFrom === "string" ? value.pickupFrom : null,
    pickupTo:
      typeof value.pickupTo === "string" ? value.pickupTo : null,
  };
}

export function loadCheckoutDraft(): CheckoutDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(CHECKOUT_DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!isObject(parsed)) return null;

      return {
        email: typeof parsed.email === "string" ? parsed.email : "",
        fullName: typeof parsed.fullName === "string" ? parsed.fullName : "",
        phone: typeof parsed.phone === "string" ? parsed.phone : "",
        deliveryMethod: normalizeDeliveryMethod(parsed.deliveryMethod),
        pickupSearchQuery:
          typeof parsed.pickupSearchQuery === "string"
            ? parsed.pickupSearchQuery
            : "",
        selectedPickupPoint: normalizePickupPoint(parsed.selectedPickupPoint),
        selectedOffer: normalizeOffer(parsed.selectedOffer),
        deliveryAddress:
          typeof parsed.deliveryAddress === "string" ? parsed.deliveryAddress : "",
        comment: typeof parsed.comment === "string" ? parsed.comment : "",
        paymentMethod: normalizePaymentMethod(parsed.paymentMethod),
      };
    }

    const legacyRaw = localStorage.getItem("checkout_draft_v1");
    if (!legacyRaw) return null;

    const legacyParsed = JSON.parse(legacyRaw) as LegacyCheckoutDraft;
    const legacyDeliveryMethod = normalizeDeliveryMethod(
      legacyParsed.deliveryMethod
    );

    return {
      email: typeof legacyParsed.email === "string" ? legacyParsed.email : "",
      fullName:
        typeof legacyParsed.fullName === "string" ? legacyParsed.fullName : "",
      phone: typeof legacyParsed.phone === "string" ? legacyParsed.phone : "",
      deliveryMethod: legacyDeliveryMethod,
      pickupSearchQuery:
        typeof legacyParsed.deliveryAddress === "string"
          ? legacyParsed.deliveryAddress
          : "",
      selectedPickupPoint: null,
      selectedOffer: null,
      deliveryAddress:
        typeof legacyParsed.deliveryAddress === "string"
          ? legacyParsed.deliveryAddress
          : "",
      comment:
        typeof legacyParsed.comment === "string" ? legacyParsed.comment : "",
      paymentMethod: normalizePaymentMethod(legacyParsed.paymentMethod),
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
  localStorage.removeItem("checkout_draft_v1");
}