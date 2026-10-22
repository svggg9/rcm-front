type Colorway = { id: number; isDefault?: boolean };

export function resolveProductColorway<T extends Colorway>(colorways: T[], requested: string | null): T | null {
  const id = requested && /^[1-9]\d*$/.test(requested) ? Number(requested) : null;
  return colorways.find(color => color.id === id) ?? colorways.find(color => color.isDefault) ?? colorways[0] ?? null;
}

export function productColorVariants<T extends { colorwayId?: number | null }>(variants: T[], colorwayId: number | null): T[] {
  return colorwayId === null ? variants : variants.filter(variant => variant.colorwayId === colorwayId);
}

const letterSizes = ["XXXS", "XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "4XL", "5XL", "6XL", "7XL", "8XL"];

function sizeKey(size: string) {
  return size.trim().toUpperCase().replace(/\s+/g, "").replace(/^2XL$/, "XXL").replace(/^3XL$/, "XXXL").replace(/^2XS$/, "XXS").replace(/^3XS$/, "XXXS");
}

export function sortProductSizes<T extends { size: string }>(options: T[]): T[] {
  // Keep mixed/custom systems in their supplied order; don't invent a relation between EU and S/M/L.
  const keys = options.map(option => sizeKey(option.size));
  const letters = keys.every(key => letterSizes.includes(key));
  const numericKeys = keys.map(key => key.match(/^(\d+(?:[.,]\d+)?)(?:[-/](\d+(?:[.,]\d+)?))?(RU|EU|UK|US|CM|СМ)?$/));
  const numbers = numericKeys.every(Boolean) && new Set(numericKeys.map(key => key?.[3] ?? "")).size <= 1;
  if (!letters && !numbers) return [...options];
  return [...options].sort((a, b) => letters
    ? letterSizes.indexOf(sizeKey(a.size)) - letterSizes.indexOf(sizeKey(b.size))
    : compareNumericSizes(sizeKey(a.size), sizeKey(b.size)));
}

function compareNumericSizes(a: string, b: string): number {
  const parts = (value: string) => value.match(/\d+(?:[.,]\d+)?/g)!.map(part => Number(part.replace(",", ".")));
  const [aFirst, aLast = 0] = parts(a), [bFirst, bLast = 0] = parts(b);
  return aFirst - bFirst || aLast - bLast;
}

export function compactProductMedia(category: string): boolean {
  return /аксессуар|обувь|посуда|предметы интерьера|товары для дома|украшени|часы/i.test(category);
}

export function productSummary(description: string, limit = 220): { text: string; hasMore: boolean } {
  const paragraphs = description.trim().split(/\n\s*\n/);
  const first = paragraphs[0]?.trim() ?? "";
  if (!first || /^(?:[▪•*—-]|\d+[.)])\s/m.test(first)) return { text: "", hasMore: Boolean(description.trim()) };
  if (first.length <= limit) return { text: first, hasMore: description.trim() !== first };
  const end = first.lastIndexOf(" ", limit);
  return { text: `${first.slice(0, end > limit / 2 ? end : limit).trim()}…`, hasMore: true };
}
