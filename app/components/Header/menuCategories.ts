import { API_URL } from "../../lib/config";
import { buildCategoryTree, categoryValue, flattenCategoryTree, normalizeCategories } from "../../lib/categories";

export type MenuCategory = {
  id: number;
  name: string;
  slug?: string | null;
  values?: string[];
};

export function normalizeMenuCategories(data: unknown): MenuCategory[] {
  return buildCategoryTree(normalizeCategories(data)).filter(category => category.effectiveActive)
    .map(category => ({id: category.id, name: category.label, slug: category.slug,
      values: flattenCategoryTree([category]).flatMap(item => [categoryValue(item), String(item.id), item.name, ...(item.aliases ?? [])]) }));
}

export async function loadMenuCategories(): Promise<MenuCategory[]> {
  // Public navigation only: never forward user cookies into the shared cache.
  const response = await fetch(`${API_URL}/api/catalog/categories`, {
    cache: "no-store",
    signal: AbortSignal.timeout(2500),
  });
  if (!response.ok) throw new Error("Failed to load menu categories");
  return normalizeMenuCategories(await response.json());
}
