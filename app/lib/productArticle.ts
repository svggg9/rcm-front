/** The public product article is independent of URL codes and variant SKUs. */
export function productArticle(value?: string | null): string | null {
  const article = value?.trim() ?? "";
  return /^[1-9]\d{5}$/.test(article) ? article : null;
}
