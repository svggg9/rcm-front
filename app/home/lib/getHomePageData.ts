import { API_URL } from "../../lib/config";
import type { HomePageData } from "../types";
import { buildHomeBlocks, normalizeHomeProducts } from "./homePresentation";

export async function getHomePageData(
  audience: "men" | "women" | "all" = "all",
): Promise<HomePageData> {
  try {
    const search = new URLSearchParams({ page: "0", size: "24", sort: "newest" });
    if (audience !== "all") search.set("audience", audience);
    const response = await fetch(`${API_URL}/api/products/page?${search}`, {
      next: { revalidate: 120 },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("Home catalog unavailable");
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || !("content" in data) || !Array.isArray(data.content)) {
      throw new Error("Invalid home catalog");
    }
    const products = normalizeHomeProducts(data.content, audience);
    return { products, blocks: buildHomeBlocks(products, audience), status: "ready" };
  } catch {
    return { products: [], blocks: [], status: "error" };
  }
}
