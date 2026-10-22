import { API_URL, apiFetch } from "../../../../lib/api";
import { productActionResponseError } from "../../../lib/sellerProductActions";
import type { ProductImageItem, ProductVariant, SellerProduct } from "./types";
import { variantColorGroupKey } from "./utils";

export type PendingPhoto = { file: File; clientUploadId: string };

export async function readSavedProduct(productId: number): Promise<SellerProduct> {
  const response = await apiFetch(`${API_URL}/api/seller/products/${productId}`, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(await productActionResponseError(response));
  return response.json();
}

/** Retries reconcile server-issued image IDs by the stable per-file upload token. */
export async function commitProductMedia({ productId, savedProduct, desired, variants, pending, deleted, onProgress }: {
  productId: number;
  savedProduct: SellerProduct;
  desired: ProductImageItem[];
  variants: ProductVariant[];
  pending: Map<number, PendingPhoto>;
  deleted: Set<number>;
  onProgress: (progress: { done: number; total: number }) => void;
}): Promise<SellerProduct> {
  const base = `${API_URL}/api/seller/products/${productId}`;
  const savedImages = savedProduct.imageItems ?? [];
  for (const id of [...deleted]) {
    if (savedImages.some(image => image.id === id)) {
      const response = await apiFetch(`${base}/images/${id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 404) throw new Error(await productActionResponseError(response));
    }
    deleted.delete(id);
  }
  let done = 0;
  for (const image of desired) {
    const file = pending.get(image.id);
    if (!file) continue;
    if (!savedImages.some(existing => existing.clientUploadId === file.clientUploadId)) {
      const variant = variants.find(item => variantColorGroupKey(item) === image.draftGroupKey);
      const group = savedProduct.colorways?.find(item => item.id === variant?.colorwayId)
        ?? savedProduct.colorways?.find(item => (item.color ?? "").trim().toLocaleLowerCase() === (variant?.color ?? "").trim().toLocaleLowerCase());
      if (image.draftGroupKey && !group) throw new Error("Не удалось связать фото с оттенком — проверьте варианты товара");
      const body = new FormData();
      body.append("file", file.file);
      body.append("clientUploadId", file.clientUploadId);
      if (group) body.append("colorwayId", String(group.id));
      const response = await apiFetch(`${base}/images`, { method: "POST", body });
      if (!response.ok) throw new Error(await productActionResponseError(response));
    }
    onProgress({ done: ++done, total: pending.size });
  }
  let current = await readSavedProduct(productId);
  const actual = current.imageItems ?? [];
  const order = desired.map(image => image.id > 0 ? image.id : actual.find(item => item.clientUploadId === pending.get(image.id)?.clientUploadId)?.id);
  if (order.some(id => id === undefined)) throw new Error("Не удалось подтвердить сохранение фотографий — повторите сохранение");
  // Preserve photos added concurrently instead of silently omitting them.
  const ids = [...order as number[], ...actual.filter(image => !order.includes(image.id)).map(image => image.id)];
  if (ids.length && ids.some((id, index) => actual[index]?.id !== id)) {
    const response = await apiFetch(`${base}/images/reorder`, { method: "POST", body: JSON.stringify({ imageIds: ids }) });
    if (!response.ok) throw new Error(await productActionResponseError(response));
    current = await readSavedProduct(productId);
  }
  return current;
}
