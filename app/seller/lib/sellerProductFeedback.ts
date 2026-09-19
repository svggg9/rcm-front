import type { ProductAction, ProductActionFailure, ProductActionResult } from "./sellerProductActions";

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

export function productFailureDestination(failure: ProductActionFailure) {
  const legal = /юридические данные|реквизиты|адрес отправления|оферту продавца/i.test(failure.reason);
  return legal
    ? { href: "/seller?tab=legal", label: "Данные и документы" }
    : { href: `/seller/products/${failure.product.id}/edit`, label: "Открыть товар" };
}
