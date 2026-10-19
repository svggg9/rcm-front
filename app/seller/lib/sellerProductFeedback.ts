import type { ProductAction, ProductActionFailure, ProductActionResult } from "./sellerProductActions";

export type ProductFailureGroup = { reason: string; failures: ProductActionFailure[] };
export type ProductFailureDestination = { href: string; label: string; refresh?: boolean };

export function groupProductFailures(failures: ProductActionFailure[]): ProductFailureGroup[] {
  const groups = new Map<string, ProductFailureGroup>();
  for (const failure of failures) {
    const reason = failure.reason.trim();
    const group = groups.get(reason);
    if (group) group.failures.push(failure);
    else groups.set(reason, { reason, failures: [failure] });
  }
  return [...groups.values()];
}

const messages: Record<ProductAction, [string, string, string]> = {
  publish: ["Товар отправлен на модерацию", "Отправлено на модерацию", "Не удалось отправить на модерацию"],
  archive: ["Товар перенесён в архив", "Перенесено в архив", "Не удалось перенести в архив"],
  draft: ["Товар возвращён в черновики", "Возвращено в черновики", "Не удалось вернуть в черновики"],
  delete: ["Товар удалён", "Удалено", "Не удалось удалить товар"],
};

export function productFeedback(action: ProductAction, result: ProductActionResult) {
  const count = result.changes.length;
  const failed = result.failures.length;
  const form = new Intl.PluralRules("ru").select(count);
  const noun = form === "one" ? "товар" : form === "few" ? "товара" : "товаров";
  const success = count === 1 ? messages[action][0] : `${messages[action][1]} ${count} ${noun}`;
  return {
    title: failed ? (count ? `${success} · Не удалось: ${failed}` : messages[action][2]) : success,
    singleFailure: !count && failed === 1 ? result.failures[0] : null,
  };
}

export function productFailureDestination(failure: ProductActionFailure): ProductFailureDestination {
  if (failure.product.status === "BLOCKED" || /заблокирован|поддержк/i.test(failure.reason)) {
    return { href: "/contacts", label: "Поддержка" };
  }
  if (/сессия истекла|войдите снова/i.test(failure.reason)) {
    return { href: "/auth/login?next=%2Fseller%2Fproducts", label: "Войти снова" };
  }
  if (/обновите список|подтверждение от сервера|потери соединения|уже удалён/i.test(failure.reason)) {
    return { href: "/seller/products", label: "Обновить список", refresh: true };
  }
  const legal = /юридические данные|реквизиты|адрес отправления|оферту продавца/i.test(failure.reason);
  return legal
    ? { href: "/seller/legal", label: "Данные и документы" }
    : { href: `/seller/products/${failure.product.id}/edit`, label: "Открыть товар" };
}
