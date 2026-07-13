type ProductUrlSource = {
  id: number;
  publicId?: string | null;
  title?: string | null;
  brand?: string | null;
};

const cyrillicMap: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "c",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

export function productPath(product: ProductUrlSource): string {
  const code = normalizePublicId(product.publicId);
  if (!code) {
    return `/product/${product.id}`;
  }

  const readableSlug = slugifyProduct(product);

  return `/p/${code}/${readableSlug}`;
}

function normalizePublicId(value?: string | null): string {
  const normalized = (value ?? "").trim().toLowerCase();

  return normalized.startsWith("p_") ? normalized.slice(2) : normalized;
}

function slugifyProduct(product: ProductUrlSource): string {
  const base = [product.brand, product.title]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ");

  const slug = transliterate(base)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || "product";
}

function transliterate(value: string): string {
  return value
    .split("")
    .map((char) => cyrillicMap[char.toLowerCase()] ?? char)
    .join("");
}
