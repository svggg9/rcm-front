
import { API_URL, apiFetch } from "../../lib/api";
import type {
  SellerBrand,
  SellerBrandImage,
  SellerBrandProfileRequest,
  SellerStorefrontCollection,
  SellerStorefrontCollectionRequest,
} from "../types";

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

export async function getSellerBrandImages(
  brandId: number
): Promise<SellerBrandImage[]> {
  const response = await apiFetch(
    `${API_URL}/api/seller/brands/${brandId}/images`
  );
  if (!response.ok) throw new Error("Не удалось загрузить фотографии бренда");
  const data: unknown = await response.json();
  return Array.isArray(data) ? (data as SellerBrandImage[]) : [];
}

export async function uploadSellerBrandImage(
  brandId: number,
  file: File
): Promise<SellerBrandImage> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiFetch(
    `${API_URL}/api/seller/brands/${brandId}/images`,
    { method: "POST", body: formData }
  );
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Не удалось загрузить фотографию бренда");
  }
  return response.json();
}

export async function deleteSellerBrandImage(
  brandId: number,
  imageId: number
): Promise<void> {
  const response = await apiFetch(
    `${API_URL}/api/seller/brands/${brandId}/images/${imageId}`,
    { method: "DELETE" }
  );
  if (!response.ok) throw new Error("Не удалось удалить фотографию бренда");
}

export async function reorderSellerBrandImages(
  brandId: number,
  imageIds: number[]
): Promise<void> {
  const response = await apiFetch(
    `${API_URL}/api/seller/brands/${brandId}/images/order`,
    {
      method: "PUT",
      body: JSON.stringify({ imageIds }),
    }
  );
  if (!response.ok) throw new Error("Не удалось изменить порядок фотографий");
}

export async function getSellerStorefrontCollections(
  brandId: number
): Promise<SellerStorefrontCollection[]> {
  const response = await apiFetch(
    `${API_URL}/api/seller/brands/${brandId}/collections`
  );
  if (response.status === 404) return [];
  if (!response.ok) throw new Error("Не удалось загрузить подборки");
  const data: unknown = await response.json();
  return Array.isArray(data) ? (data as SellerStorefrontCollection[]) : [];
}

export async function createSellerStorefrontCollection(
  brandId: number,
  payload: SellerStorefrontCollectionRequest
): Promise<SellerStorefrontCollection> {
  const response = await apiFetch(
    `${API_URL}/api/seller/brands/${brandId}/collections`,
    { method: "POST", body: JSON.stringify(payload) }
  );
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Не удалось создать подборку");
  }
  return response.json();
}

export async function deleteSellerStorefrontCollection(
  brandId: number,
  collectionId: number
): Promise<void> {
  const response = await apiFetch(
    `${API_URL}/api/seller/brands/${brandId}/collections/${collectionId}`,
    { method: "DELETE" }
  );
  if (!response.ok) throw new Error("Не удалось удалить подборку");
}
