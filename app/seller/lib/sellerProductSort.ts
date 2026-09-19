export type ProductSortKey = "title" | "minPrice" | "variantsCount" | "totalStock" | "status" | "createdAt";
export type ProductSort = { key: ProductSortKey; direction: "asc" | "desc" };
export const DEFAULT_PRODUCT_SORT: ProductSort = { key: "createdAt", direction: "desc" };

export function nextProductSort(current: ProductSort | null, key: ProductSortKey): ProductSort {
  return { key, direction: current?.key === key
    ? (current.direction === "asc" ? "desc" : "asc") : key === "createdAt" ? "desc" : "asc" };
}

export function formatProductCreatedAt(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric", month: "numeric", year: "2-digit", timeZone: "Europe/Moscow",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? "";
  const months = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
  return `${Number(part("day"))}-${months[Number(part("month")) - 1]}-${part("year")}`;
}
