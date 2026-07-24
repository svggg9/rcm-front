
import { API_URL, apiFetch } from "../../lib/api";
import type { SellerBrand, SellerBrandProfileRequest } from "../types";

export async function getSellerBrands(): Promise<SellerBrand[]> {
  const response = await apiFetch(`${API_URL}/api/seller/brands`);

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Не удалось загрузить бренды");
  }

  const data: unknown = await response.json();

  return Array.isArray(data) ? (data as SellerBrand[]) : [];
}

export async function updateSellerBrandProfile(
  brandId: number,
  payload: SellerBrandProfileRequest
): Promise<SellerBrand> {
  const response = await apiFetch(`${API_URL}/api/seller/brands/${brandId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Не удалось сохранить профиль производителя");
  }

  return response.json();
}
export async function uploadSellerBrandLogo(
  brandId: number,
  file: File
): Promise<SellerBrand> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiFetch(`${API_URL}/api/seller/brands/${brandId}/logo`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Не удалось загрузить логотип производителя");
  }

  return response.json();
}

export async function uploadSellerBrandWordmark(
  brandId: number,
  file: File
): Promise<SellerBrand> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiFetch(
    `${API_URL}/api/seller/brands/${brandId}/wordmark`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Не удалось загрузить вордмарк бренда");
  }

  return response.json();
}
