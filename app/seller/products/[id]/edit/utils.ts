import type { ProductVariant } from "./types";
import type { StatusBadgeTone } from "../../../../components/ui/StatusBadge";

export function numberOrNull(value: number | "") {
  return value === "" ? null : Number(value);
}

export function formatProductStatus(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Черновик",
    MODERATION: "На модерации",
    NEEDS_REVISION: "Нужны исправления",
    ACTIVE: "Активен",
    ARCHIVED: "Архив",
    BLOCKED: "Заблокирован",
    DELETED: "Удалён",
  };

  return labels[status] ?? status;
}

export function getProductStatusTone(status: string): StatusBadgeTone {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "MODERATION":
      return "warning";
    case "NEEDS_REVISION":
    case "BLOCKED":
      return "danger";
    default:
      return "default";
  }
}

export function variantColorGroupKey(variant: ProductVariant): string {
  return variant.groupKey || String(variant.colorwayId ?? (variant.colorId || variant.color.trim().toLowerCase()));
}

export function inconsistentColorPriceIndexes(variants: ProductVariant[]): Set<number> {
  const groups = new Map<string, number[]>();
  variants.forEach((variant, index) => {
    const key = variantColorGroupKey(variant);
    groups.set(key, [...(groups.get(key) ?? []), index]);
  });
  const inconsistent = new Set<number>();
  for (const indexes of groups.values()) {
    if (indexes.some(index => !Object.is(variants[index].price, variants[indexes[0]].price))) {
      indexes.forEach(index => inconsistent.add(index));
    }
  }
  return inconsistent;
}
