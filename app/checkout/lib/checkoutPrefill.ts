import type {
  CountryCode,
  DeliveryCityOption,
  DeliveryMethod,
  FittingMode,
} from "../types";

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
  defaultDeliveryCountryCode: string | null;
  defaultDeliveryCityCode: number | null;
  defaultDeliveryCityName: string | null;
  defaultDeliveryApartment: string | null;
  defaultDeliveryFloor: string | null;
  defaultDeliveryIntercom: string | null;
  defaultPickupPointId: string | null;
  defaultPickupPointLabel: string | null;
  defaultFittingMode: string | null;
};

export type CheckoutPrefill = {
  email: string;
  fullName: string;
  phone: string;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string;
  countryCode: CountryCode;
  selectedCity: DeliveryCityOption | null;
  selectedAddressId: string;
  pickupPointLabel: string;
  apartment: string;
  floor: string;
  intercom: string;
  fittingMode: FittingMode;
  comment: string;
};

function normalizeCountryCode(value?: string | null): CountryCode {
  return value === "RU" ? "RU" : "RU";
}

function isEmailLike(value?: string | null): boolean {
  return Boolean(value?.trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/));
}

function isPhoneLike(value?: string | null): boolean {
  const trimmed = value?.trim() ?? "";
  const digits = trimmed.replace(/\D/g, "");

  return digits.length >= 10 && /^[+\d\s\-()]+$/.test(trimmed);
}

function buildCityOption(me: Me | null): DeliveryCityOption | null {
  if (!me?.defaultDeliveryCityCode || !me.defaultDeliveryCityName?.trim()) {
    return null;
  }

  return {
    code: me.defaultDeliveryCityCode,
    cityUuid: String(me.defaultDeliveryCityCode),
    fullName: me.defaultDeliveryCityName.trim(),
    countryCode: normalizeCountryCode(me.defaultDeliveryCountryCode),
  };
}

export function buildCheckoutPrefill(params: {
  me?: Me | null;
  existing?: Partial<CheckoutPrefill> | null;
}): CheckoutPrefill {
  const me = params.me ?? null;
  const existing = params.existing ?? {};

  const existingEmail = (existing.email ?? "").trim();
  const profileEmail = me?.email?.trim() ?? "";
  const existingFullName = (existing.fullName ?? "").trim();
  const profileDisplayName = me?.displayName?.trim() ?? "";

  return {
    email:
      (isEmailLike(existingEmail) ? existingEmail : "") ||
      (isEmailLike(profileEmail) ? profileEmail : "") ||
      "",

    fullName:
      (!isPhoneLike(existingFullName) ? existingFullName : "") ||
      (!isPhoneLike(profileDisplayName) ? profileDisplayName : "") ||
      "",

    phone:
      (existing.phone ?? "").trim() ||
      me?.phone?.trim() ||
      "",

    deliveryMethod: "PICKUP",

    deliveryAddress:
      (existing.deliveryAddress ?? "").trim() ||
      me?.defaultDeliveryAddress?.trim() ||
      "",

    countryCode:
      existing.countryCode || normalizeCountryCode(me?.defaultDeliveryCountryCode),

    selectedCity:
      existing.selectedCity ?? buildCityOption(me),

    selectedAddressId: "",

    pickupPointLabel: "",

    apartment:
      (existing.apartment ?? "").trim() ||
      me?.defaultDeliveryApartment?.trim() ||
      "",

    floor:
      (existing.floor ?? "").trim() ||
      me?.defaultDeliveryFloor?.trim() ||
      "",

    intercom:
      (existing.intercom ?? "").trim() ||
      me?.defaultDeliveryIntercom?.trim() ||
      "",

    fittingMode: "WITHOUT_FITTING",

    comment:
      (existing.comment ?? "").trim() || "",
  };
}
