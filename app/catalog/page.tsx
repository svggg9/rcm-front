import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { API_URL } from "../lib/api";
import { CatalogClient } from "../components/Catalog/CatalogClient";
import {
  normalizeAudience,
  normalizeProducts,
  parsePage,
  normalizeSort,
} from "../components/Catalog/catalogUtils";
import type {
  CatalogProduct,
  CatalogSearchParams,
  SelectedAudience,
  SortValue,
} from "../components/Catalog/catalogTypes";

const SITE_NAME = "RCMarket";

function buildCatalogSeoTitle(params: {
  category: string;
  audience: SelectedAudience;
  q: string;
}): string {
  if (params.q) {
    return `Поиск: ${params.q} | ${SITE_NAME}`;
  }

  if (params.category) {
    if (params.audience === "men") {
      return `${params.category} для мужчин | ${SITE_NAME}`;
    }

    if (params.audience === "women") {
      return `${params.category} для женщин | ${SITE_NAME}`;
    }

    return `${params.category} отечественных производителей | ${SITE_NAME}`;
  }

  if (params.audience === "men") {
    return `Товары отечественных производителей для мужчин | ${SITE_NAME}`;
  }

  if (params.audience === "women") {
    return `Товары отечественных производителей для женщин | ${SITE_NAME}`;
  }

  return `Каталог отечественных товаров | ${SITE_NAME}`;
}

function buildCatalogSeoDescription(params: {
  category: string;
  audience: SelectedAudience;
  q: string;
}): string {
  if (params.q) {
    return `Результаты поиска «${params.q}» в каталоге RCMarket — маркетплейсе отечественных производителей.`;
  }

  if (params.category) {
    return `${params.category} в каталоге RCMarket: товары отечественных производителей, российских брендов и локальных марок.`;
  }

  if (params.audience === "men") {
    return `Товары для мужчин в каталоге RCMarket: отечественные производители, российские бренды и локальные марки.`;
  }

  if (params.audience === "women") {
    return `Товары для женщин в каталоге RCMarket: отечественные производители, российские бренды и локальные марки.`;
  }

  return `Каталог RCMarket: товары отечественных производителей, российских брендов и локальных марок в одном месте.`;
}

function buildCatalogCanonical(params: {
  category: string;
  audience: SelectedAudience;
  q: string;
  page: number;
  sort: SortValue;
}): string {
  const search = new URLSearchParams();

  if (params.audience !== "all") {
    search.set("audience", params.audience);
  }

  if (params.category) {
    search.set("category", params.category);
  }

  if (params.q) {
    search.set("q", params.q);
  }

  if (params.page > 1) {
    search.set("page", String(params.page));
  }

  if (params.sort) {
    search.set("sort", params.sort);
  }

  const query = search.toString();

  return query ? `/catalog?${query}` : "/catalog";
}

function normalizeCatalogParams(params: CatalogSearchParams) {
  const selectedCategory = params.category ?? "";
  const selectedAudience = normalizeAudience(params.audience ?? null);
  const searchQuery = (params.q ?? "").trim();
  const page = parsePage(params.page);
  const sortBy = normalizeSort(params.sort);

  return {
    selectedCategory,
    selectedAudience,
    searchQuery,
    page,
    sortBy,
  };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<CatalogSearchParams>;
}): Promise<Metadata> {
  const params = (searchParams ? await searchParams : {}) ?? {};
  const {
    selectedCategory,
    selectedAudience,
    searchQuery,
    page,
    sortBy,
  } = normalizeCatalogParams(params);

  const title = buildCatalogSeoTitle({
    category: selectedCategory,
    audience: selectedAudience,
    q: searchQuery,
  });

  const description = buildCatalogSeoDescription({
    category: selectedCategory,
    audience: selectedAudience,
    q: searchQuery,
  });

  const canonical = buildCatalogCanonical({
    category: selectedCategory,
    audience: selectedAudience,
    q: searchQuery,
    page,
    sort: sortBy,
  });

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
    },
  };
}

async function getCatalogProducts(params: {
  audience: string;
  category: string;
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
        hasError: true,
      };
    }

    const data: unknown = await response.json();

    if (typeof data !== "object" || data === null || !("content" in data)) {
      return {
        products: [],
        totalPages: 1,
        totalProducts: 0,
        hasError: true,
      };
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

export default async function CatalogPage({
  searchParams,
}: {
  searchParams?: Promise<CatalogSearchParams>;
}) {
  const params = (searchParams ? await searchParams : {}) ?? {};

  const {
    selectedCategory,
    selectedAudience,
    searchQuery,
    page,
    sortBy,
  } = normalizeCatalogParams(params);

  const { products, totalPages, totalProducts, hasError } = await getCatalogProducts({
    audience: selectedAudience,
    category: selectedCategory,
    q: searchQuery,
    sort: sortBy,
    page,
  });

  if (!hasError && totalProducts > 0 && page > totalPages) {
    redirect(
      buildCatalogCanonical({
        category: selectedCategory,
        audience: selectedAudience,
        q: searchQuery,
        page: totalPages,
        sort: sortBy,
      })
    );
  }

  return (
    <div className="pageContainer">
      <CatalogClient
        products={products}
        selectedCategory={selectedCategory}
        selectedAudience={selectedAudience}
        searchQuery={searchQuery}
        currentPage={page}
        totalPages={totalPages}
        initialSort={sortBy}
        hasError={hasError}
      />
    </div>
  );
}
