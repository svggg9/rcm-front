import { API_URL } from "../../lib/config";

export type MenuCategory = {
  id: number;
  name: string;
};

export function normalizeMenuCategories(data: unknown): MenuCategory[] {
  if (!Array.isArray(data)) throw new Error("Invalid menu categories response");

  return data.flatMap((item: unknown) => {
    if (!item || typeof item !== "object") return [];
    const category = item as Record<string, unknown>;
    if (
      typeof category.id !== "number" ||
      !Number.isFinite(category.id) ||
      typeof category.name !== "string" ||
      !category.name.trim() ||
      category.isActive === false ||
      category.status === "DISABLED" ||
      category.name.includes("/")
    ) return [];

    return [{ id: category.id, name: category.name }];
  });
}

export async function loadMenuCategories(): Promise<MenuCategory[]> {
  // Public navigation only: never forward user cookies into the shared cache.
  const response = await fetch(`${API_URL}/api/catalog/categories`, {
    ...(process.env.NODE_ENV === "development"
      ? { cache: "no-store" as const }
      : { next: { revalidate: 300 } }),
    signal: AbortSignal.timeout(2500),
  });
  if (!response.ok) throw new Error("Failed to load menu categories");
  return normalizeMenuCategories(await response.json());
}
