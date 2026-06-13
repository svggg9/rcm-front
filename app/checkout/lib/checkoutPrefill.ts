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

function normalizeDeliveryMethod(value?: string | null): DeliveryMethod | null {
  if (value === "COURIER") return "COURIER";
  if (value === "PICKUP" || value === "PICKUP_POINT") return "PICKUP";
  return null;
}

function normalizeFittingMode(value?: string | null): FittingMode | null {
  if (value === "WITH_FITTING" || value === "WITHOUT_FITTING") return value;
  return null;
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

  const resolvedDeliveryMethod =
    existing.deliveryMethod ||
    normalizeDeliveryMethod(me?.defaultDeliveryMethod) ||
    "PICKUP";

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

    phone:
      (existing.phone ?? "").trim() ||
      me?.phone?.trim() ||
      "",

    deliveryMethod:
      resolvedDeliveryMethod === "COURIER" ? "COURIER" : "PICKUP",

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

    fittingMode:
      existing.fittingMode ||
      normalizeFittingMode(me?.defaultFittingMode) ||
      "WITH_FITTING",

    comment:
      (existing.comment ?? "").trim() || "",
  };
}
