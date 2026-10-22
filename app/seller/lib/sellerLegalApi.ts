import { apiFetch, API_URL } from "../../lib/api";
import { readApiError } from "../../lib/apiErrors";

export type SellerType = "IP" | "OOO" | "SELF_EMPLOYED";

export type SellerLegalInfo = {
  id: number;
  sellerId: number;
  sellerType: SellerType;
  inn: string;
  ogrn: string | null;
  ogrnip: string | null;
  companyName: string | null;
  legalName: string | null;
  contactName: string | null;
  phone: string | null;
  legalAddress: string | null;
  shippingCountryCode: string | null;
  shippingCityCode: number | null;
  shippingCityName: string | null;
  shippingAddress: string | null;
  cdekShipmentPoint: string | null;
  bankName: string | null;
  bik: string | null;
  checkingAccount: string | null;
  correspondentAccount: string | null;
  agreementAccepted: boolean;
  agreementAcceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SellerLegalInfoForm = {
  sellerType: SellerType;
  inn: string;
  ogrn: string;
  ogrnip: string;
  companyName: string;
  legalName: string;
  contactName: string;
  phone: string;
  legalAddress: string;
  shippingCountryCode: string;
  shippingCityCode: string;
  shippingCityName: string;
  shippingAddress: string;
  cdekShipmentPoint: string;
  bankName: string;
  bik: string;
  checkingAccount: string;
  correspondentAccount: string;
  agreementAccepted: boolean;
};

export type DeliveryCityOption = {
  code: number;
  cityUuid: string | null;
  fullName: string;
  countryCode: string | null;
};

export type CdekReceptionPoint = {
  id: string;
  name: string | null;
  type: string | null;
  fullAddress: string | null;
  instruction: string | null;
  cityCode: number | null;
  latitude: number | null;
  longitude: number | null;
};

type SellerProfileContact = {
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
};

export function profileContactName(profile: SellerProfileContact | null): string {
  if (!profile) return "";

  const displayName = profile.displayName?.trim();
  if (displayName) return displayName;

  return [profile.lastName, profile.firstName, profile.middleName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ");
}

export async function getSellerProfileContactName(): Promise<string> {
  const response = await apiFetch(`${API_URL}/api/profile`);

  if (!response.ok) return "";

  return profileContactName((await response.json()) as SellerProfileContact);
}

export async function getSellerLegalInfo(): Promise<SellerLegalInfo | null> {
  const response = await apiFetch(`${API_URL}/api/seller/legal-info`);

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Не удалось загрузить реквизиты");
  }

  return response.json();
}

export async function searchDeliveryCities(
  query: string
): Promise<DeliveryCityOption[]> {
  const response = await apiFetch(
    `${API_URL}/api/delivery/cities/search?query=${encodeURIComponent(
      query
    )}&countryCode=RU`
  );

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as DeliveryCityOption[];
  return Array.isArray(data) ? data : [];
}

export async function getCdekReceptionPoints(
  cityCode: number,
  query?: string,
  size?: number
): Promise<CdekReceptionPoint[]> {
  const params = new URLSearchParams({
    cityCode: String(cityCode),
  });

  if (query?.trim()) {
    params.set("query", query.trim());
  }

  if (size !== undefined) params.set("size", String(size));

  const response = await apiFetch(
    `${API_URL}/api/seller/shipping/cdek/reception-points?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error("Не удалось загрузить пункты приёма СДЭК. Попробуйте ещё раз.");
  }

  const data = (await response.json()) as CdekReceptionPoint[];
  return Array.isArray(data) ? data : [];
}

export async function saveSellerLegalInfo(
  payload: SellerLegalInfoForm
): Promise<SellerLegalInfo> {
  const response = await apiFetch(`${API_URL}/api/seller/legal-info`, {
    method: "PUT",
    body: JSON.stringify({
      ...payload,
      shippingCityCode: payload.shippingCityCode
        ? Number(payload.shippingCityCode)
        : null,
    }),
  });

  if (!response.ok) {
    throw await readApiError(response, "Не удалось сохранить реквизиты", {
      LEGAL_VERIFIED_LOCKED: "Реквизиты уже подтверждены — отправьте запрос на изменение в поддержку",
    });
  }

  return response.json();
}
