import { apiFetch, API_URL } from "../../lib/api";

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
};

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
  query?: string
): Promise<CdekReceptionPoint[]> {
  const params = new URLSearchParams({
    cityCode: String(cityCode),
  });

  if (query?.trim()) {
    params.set("query", query.trim());
  }

  const response = await apiFetch(
    `${API_URL}/api/seller/shipping/cdek/reception-points?${params.toString()}`
  );

  if (!response.ok) {
    return [];
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
    const text = await response.text().catch(() => "");
    throw new Error(text || "Не удалось сохранить реквизиты");
  }

  return response.json();
}
