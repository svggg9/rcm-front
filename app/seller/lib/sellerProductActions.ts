import { apiFetch, API_URL } from "../../lib/api";
import type { SellerProductListItem } from "../types";

export type ProductAction = "publish" | "archive" | "draft" | "delete";
export type ProductChange = { id: number; status: SellerProductListItem["status"] };
export type ProductActionFailure = { product: SellerProductListItem; reason: string };
export type ProductActionResult = { changes: ProductChange[]; failures: ProductActionFailure[] };

export const productActionLabels: Record<ProductAction, string> = {
  publish: "На модерацию",
  archive: "Перенести в архив",
  draft: "Вернуть в черновики",
  delete: "Удалить",
};

const nextStatus: Record<ProductAction, SellerProductListItem["status"]> = {
  publish: "MODERATION", archive: "ARCHIVED", draft: "DRAFT", delete: "DELETED",
};

// These hints mirror seller permissions; the server still checks ownership,
// current status, seller readiness and the full publication requirements.
export function productActionBlockedReason(action: ProductAction, status: SellerProductListItem["status"]): string | null {
  if (status === "BLOCKED") return "Товар заблокирован — обратитесь в поддержку";
  if (status === "DELETED") return "Товар уже удалён";
  if (!status) return "Обновите список, чтобы проверить статус товара";
  switch (action) {
    case "publish":
      return status === "DRAFT" || status === "NEEDS_REVISION" ? null : "Доступно для черновиков и товаров на доработке";
    case "archive":
      return ["DRAFT", "NEEDS_REVISION", "MODERATION", "ACTIVE"].includes(status) ? null : "Товар уже в архиве";
    case "draft":
      return status === "ARCHIVED" ? null : "Доступно для товаров в архиве";
    case "delete":
      return ["DRAFT", "NEEDS_REVISION", "ARCHIVED"].includes(status) ? null : "Сначала перенесите товар в архив";
  }
}

export function formatSelectedProducts(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `Выбран ${count} товар`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `Выбрано ${count} товара`;
  return `Выбрано ${count} товаров`;
}

async function responseError(response: Response) {
  const body = await response.json().catch(() => null);
  const message = body?.detail || body?.message;
  const legacyReasons: Record<string, string> = {
    "Title is required for publish": "Укажите название товара",
    "Description is required for publish": "Добавьте описание товара",
    "Brand is required for publish": "Выберите бренд товара",
    "Category is required for publish": "Выберите категорию товара",
    "At least one variant is required for publish": "Добавьте хотя бы один вариант товара",
    "At least one active variant is required for publish": "Добавьте хотя бы один вариант товара вне архива",
    "Product cannot be submitted for moderation from its current status": "На модерацию можно отправить только черновик или товар на доработке",
  };
  if (typeof message === "string" && legacyReasons[message]) return legacyReasons[message];
  // Never show raw JSON, stack traces or an HTML error page to the seller.
  if (typeof message === "string" && /[а-яё]/i.test(message) && message.length < 500) {
    return message.replace(/\.+\s*$/, "");
  }
  if (response.status === 401) return "Сессия истекла — войдите снова";
  if (response.status === 403) return "Действие недоступно — проверьте права и данные продавца";
  if (response.status === 404) return "Товар не найден — обновите список";
  if (response.status === 400 || response.status === 409) return "Проверьте статус и обязательные поля в карточке товара";
  return "Не удалось выполнить действие — попробуйте позже";
}

export async function executeProductAction(
  action: ProductAction,
  products: SellerProductListItem[],
  onProgress: (completed: number) => void = () => {},
): Promise<ProductActionResult> {
  const result: ProductActionResult = { changes: [], failures: [] };
  const uniqueProducts = [...new Map(products.map(product => [product.id, product])).values()];
  let interrupted: string | null = null;
  for (const product of uniqueProducts) {
    const blocked = productActionBlockedReason(action, product.status);
    if (blocked || interrupted) {
      result.failures.push({ product, reason: blocked || interrupted! });
    } else {
      try {
        const response = await apiFetch(`${API_URL}/api/seller/products/${product.id}/${action}`, {
          method: "POST", signal: AbortSignal.timeout(20000),
        });
        if (response.ok) result.changes.push({ id: product.id, status: nextStatus[action] });
        else {
          const reason = await responseError(response);
          result.failures.push({ product, reason });
          if (response.status === 401) interrupted = reason;
        }
      } catch {
        result.failures.push({ product, reason: "Не получено подтверждение от сервера — обновите список и проверьте статус перед повтором" });
        // A timed-out POST might have succeeded. Don't retry it automatically
        // or keep sending a batch when the connection is unavailable.
        interrupted = "Не отправлено из-за потери соединения — обновите список перед повтором";
      }
    }
    onProgress(result.changes.length + result.failures.length);
  }
  return result;
}
