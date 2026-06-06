
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