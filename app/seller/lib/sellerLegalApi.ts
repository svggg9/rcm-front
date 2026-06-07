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
  legalAddress: string | null;
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
  legalAddress: string;
  bankName: string;
  bik: string;
  checkingAccount: string;
  correspondentAccount: string;
  agreementAccepted: boolean;
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

export async function saveSellerLegalInfo(
  payload: SellerLegalInfoForm
): Promise<SellerLegalInfo> {
  const response = await apiFetch(`${API_URL}/api/seller/legal-info`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Не удалось сохранить реквизиты");
  }

  return response.json();
}