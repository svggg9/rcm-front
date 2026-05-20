import { API_URL } from "../lib/api";
import { CatalogClient } from "../components/Catalog/CatalogClient";
import {
  buildCatalogTitle,
  normalizeAudience,
  normalizeProducts,
  parsePage,
  normalizeSort,
} from "../components/Catalog/catalogUtils";
import type {
  CatalogProduct,
  CatalogSearchParams,
} from "../components/Catalog/catalogTypes";

async function getCatalogProducts(params: {
  audience: string;
  category: string;
  brand: string;
  q: string;
  sort: string;
  page: number;
}): Promise<{
  products: CatalogProduct[];
  totalPages: number;
  totalProducts: number;
  hasError: boolean;
}> {
  try {
    const search = new URLSearchParams();

    if (params.audience && params.audience !== "all") {
      search.set("audience", params.audience);
    }

    if (params.category) {
      search.set("category", params.category);
    }

    if (params.brand) {
      search.set("brand", params.brand);
    }

    if (params.q) {
      search.set("q", params.q);
    }

    if (params.sort) {
      search.set("sort", params.sort);
    }

    search.set("page", String(Math.max(0, params.page - 1)));
    search.set("size", "48");

    const response = await fetch(
      `${API_URL}/api/products/page?${search.toString()}`,
      {
        next: { revalidate: 60 },
      }
    );

    if (!response.ok) {
      return {
        products: [],
        totalPages: 1,
        totalProducts: 0,
        brands: [],
        hasError: true,
      } as never;
    }

    const data: unknown = await response.json();

    if (typeof data !== "object" || data === null || !("content" in data)) {
      return {
        products: [],
        totalPages: 1,
        totalProducts: 0,
        brands: [],
        hasError: true,
      } as never;
    }

    const pageData = data as {
      content?: unknown;
      totalPages?: unknown;
      totalElements?: unknown;
    };

    return {
      products: normalizeProducts(pageData.content),
      totalPages:
        typeof pageData.totalPages === "number" && pageData.totalPages > 0
          ? pageData.totalPages
          : 1,
      totalProducts:
        typeof pageData.totalElements === "number" ? pageData.totalElements : 0,
      hasError: false,
    };
  } catch {
    return {
      products: [],
      totalPages: 1,
      totalProducts: 0,
      hasError: true,
    };
  }
}

async function getCatalogBrands(params: {
  audience: string;
  category: string;
  q: string;
}): Promise<string[]> {
  try {
    const search = new URLSearchParams();

    if (params.audience && params.audience !== "all") {
      search.set("audience", params.audience);
    }

    if (params.category) {
      search.set("category", params.category);
    }

    if (params.q) {
      search.set("q", params.q);
    }

    const response = await fetch(
      `${API_URL}/api/products/brands?${search.toString()}`,
      {
        next: { revalidate: 60 },
      }
    );

    if (!response.ok) return [];

    const data: unknown = await response.json();

    return Array.isArray(data)
      ? data.filter((brand): brand is string => typeof brand === "string")
      : [];
  } catch {
    return [];
  }
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams?: Promise<CatalogSearchParams>;
}) {
  const params = (searchParams ? await searchParams : {}) ?? {};

  const selectedCategory = params.category ?? "";
  const selectedAudience = normalizeAudience(params.audience ?? null);
  const selectedBrand = params.brand ?? "";
  const searchQuery = (params.q ?? "").trim().toLowerCase();
  const page = parsePage(params.page);
  const sortBy = normalizeSort(params.sort);

  const [{ products, totalPages, totalProducts, hasError }, brands] =
    await Promise.all([
      getCatalogProducts({
        audience: selectedAudience,
        category: selectedCategory,
        brand: selectedBrand,
        q: searchQuery,
        sort: sortBy,
        page,
      }),
      getCatalogBrands({
        audience: selectedAudience,
        category: selectedCategory,
        q: searchQuery,
      }),
    ]);

  const pageTitle = buildCatalogTitle(selectedCategory, selectedAudience);

  return (
    <div className="pageContainer">
      <CatalogClient
        products={products}
        totalProducts={totalProducts}
        brands={brands}
        selectedCategory={selectedCategory}
        selectedAudience={selectedAudience}
        initialBrand={selectedBrand}
        searchQuery={searchQuery}
        pageTitle={pageTitle}
        currentPage={page}
        totalPages={totalPages}
        initialSort={sortBy}
        hasError={hasError}
      />
    </div>
  );
}