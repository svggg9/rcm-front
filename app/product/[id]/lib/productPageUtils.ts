import type { Product } from "./types";

export function getMinPrice(product: Product): number {
  const prices = product.variants
    .map((variant) => variant.price)
    .filter((price): price is number => typeof price === "number");

  return prices.length ? Math.min(...prices) : 0;
}

export function getSizesText(product: Product): string {
  const sizes = Array.from(
    new Set(
      product.variants
        .map((variant) => variant.size)
        .filter(
          (size): size is string =>
            typeof size === "string" && size.trim().length > 0
        )
    )
  );

  if (sizes.length === 0) return "Размеры уточняются";
  if (sizes.length === 1) return `Доступен размер: ${sizes[0]}`;

  return `Доступные размеры: ${sizes.join(", ")}`;
}