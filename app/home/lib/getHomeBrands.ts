import { API_URL } from "../../lib/config";

export type HomeBrand = { id: number; name: string; slug: string; wordmarkUrl: string | null };

export async function getHomeBrands(): Promise<{ brands: HomeBrand[]; status: "ready" | "error" }> {
  try {
    const response = await fetch(`${API_URL}/api/brands`, {
      next: { revalidate: 120 }, signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("Brands unavailable");
    const data: unknown = await response.json();
    if (!Array.isArray(data)) throw new Error("Invalid brands");
    const seen = new Set<number>();
    const brands = data.flatMap((item): HomeBrand[] => {
      if (!item || typeof item !== "object" || !Number.isSafeInteger(item.id) || item.id <= 0 ||
        typeof item.name !== "string" || !item.name.trim() || typeof item.slug !== "string" || !item.slug.trim() || seen.has(item.id)) return [];
      seen.add(item.id);
      return [{ id: item.id, name: item.name.trim(), slug: item.slug.trim(),
        wordmarkUrl: typeof item.wordmarkUrl === "string" && item.wordmarkUrl.trim() ? item.wordmarkUrl.trim() : null }];
    });
    if (data.length && !brands.length) throw new Error("Invalid brands");
    return { brands, status: "ready" };
  } catch {
    return { brands: [], status: "error" };
  }
}
