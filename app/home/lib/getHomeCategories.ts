import { API_URL } from "../../lib/config";
import { normalizeCategories, normalizeCategoryFacets } from "../../lib/categories";
import { homeCategories, type HomeAudience } from "./homePresentation";

export type HomeCategoriesResult = {
  categories: { title: string; href: string }[];
  status: "ready" | "error";
};

export async function getHomeCategories(audience: HomeAudience = "all"): Promise<HomeCategoriesResult> {
  try {
    const search = new URLSearchParams();
    if (audience !== "all") search.set("audience", audience);
    const [categoriesResponse, facetsResponse] = await Promise.all([
      fetch(`${API_URL}/api/catalog/categories`, { cache: "no-store", signal: AbortSignal.timeout(5000) }),
      fetch(`${API_URL}/api/catalog/category-facets${search.size ? `?${search}` : ""}`, {
        cache: "no-store", signal: AbortSignal.timeout(5000),
      }),
    ]);
    if (!categoriesResponse.ok || !facetsResponse.ok) throw new Error("Home categories unavailable");
    const [categoryData, facetData]: unknown[] = await Promise.all([categoriesResponse.json(), facetsResponse.json()]);
    return { categories: homeCategories(normalizeCategories(categoryData), normalizeCategoryFacets(facetData), audience), status: "ready" };
  } catch {
    return { categories: [], status: "error" };
  }
}
