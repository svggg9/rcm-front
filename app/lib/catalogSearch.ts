// Match ProductService's UTF-16 limit and CatalogSearch's Java Unicode whitespace.
export function normalizeCatalogSearch(value: string): string {
  const trimmed = value.replace(/^[\u0000-\u0020]+|[\u0000-\u0020]+$/g, "");
  let end = Math.min(trimmed.length, 120);
  if (end < trimmed.length && end > 0 && /[\uD800-\uDBFF]/.test(trimmed[end - 1]) && /[\uDC00-\uDFFF]/.test(trimmed[end])) end--;
  return trimmed.slice(0, end);
}

export function hasTooManyCatalogSearchTerms(value: string): boolean {
  const terms = normalizeCatalogSearch(value).split(/\p{White_Space}+/u).filter(Boolean);
  // The server deduplicates before case folding; differently cased terms remain distinct.
  return new Set(terms).size > 10;
}

export const catalogSearchLimitMessage = "Не больше 10 разных слов";
