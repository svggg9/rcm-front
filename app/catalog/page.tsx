import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";

import { API_URL } from "../lib/api";
import { CatalogClient } from "../components/Catalog/CatalogClient";
import {
  buildCatalogProductsQuery,
  canonicalCategoryName,
  expandCategorySelections,
  firstSearchParam,
  groupCatalogCategories,
  normalizeAudience,
  normalizeCategorySelection,
  normalizeCatalogView,
  normalizeProducts,
  normalizeSearchList,
  normalizeSort,
  parsePage,
  parsePositiveId,
  parsePrice,
} from "../components/Catalog/catalogUtils";
import type {
  CatalogCategory,
  CatalogCollectionOption,
  CatalogProduct,
  CatalogProductsQuery,
  CatalogSearchParams,
  CatalogSize,
  CatalogView,
  SelectedAudience,
  SortValue,
} from "../components/Catalog/catalogTypes";

const SITE_NAME = "рцмаркет";

type NormalizedCatalogParams = {
  selectedCategories: string[];
  selectedAudience: SelectedAudience;
  searchQuery: string;
  selectedBrands: string[];
  selectedSizes: string[];
  minPrice?: number;
  maxPrice?: number;
  page: number;
  sortBy: SortValue;
  selectedView: CatalogView;
  selectedCollectionId?: number;
};

function buildCatalogSeoTitle(params: {
  category: string;
  audience: SelectedAudience;
  q: string;
  view: CatalogView;
  collectionTitle?: string;
}): string {
  if (params.q) return `Поиск: ${params.q} | ${SITE_NAME}`;
  if (params.collectionTitle) return `${params.collectionTitle} | ${SITE_NAME}`;
  if (params.view === "new") return `Новинки | ${SITE_NAME}`;

  if (params.category) {
    if (params.audience === "men") return `${params.category} для мужчин | ${SITE_NAME}`;
    if (params.audience === "women") return `${params.category} для женщин | ${SITE_NAME}`;
    return `${params.category} независимых брендов | ${SITE_NAME}`;
  }

  if (params.audience === "men") return `Товары для мужчин | ${SITE_NAME}`;
  if (params.audience === "women") return `Товары для женщин | ${SITE_NAME}`;
  return `Каталог независимых брендов | ${SITE_NAME}`;
}

function buildCatalogSeoDescription(params: {
  category: string;
  audience: SelectedAudience;
  q: string;
  view: CatalogView;
  collectionTitle?: string;
}): string {
  if (params.q) {
    return `Результаты поиска «${params.q}» в каталоге рцмаркет.`;
  }

  if (params.collectionTitle) {
    return `${params.collectionTitle}: редакционная подборка независимых брендов в рцмаркет.`;
  }

  if (params.view === "new") {
    return "Новинки независимых брендов в рцмаркет.";
  }

  if (params.category) {
    return `${params.category} в каталоге рцмаркет: вещи независимых брендов.`;
  }

  if (params.audience === "men") {
    return "Мужская коллекция независимых брендов в рцмаркет.";
  }

  if (params.audience === "women") {
    return "Женская коллекция независимых брендов в рцмаркет.";
  }

  return "Каталог независимых брендов рцмаркет.";
}

function buildCatalogCanonical(params: NormalizedCatalogParams & { page: number }): string {
  const search = new URLSearchParams();

  if (params.selectedAudience !== "all") search.set("audience", params.selectedAudience);
  params.selectedCategories.forEach((category) => search.append("category", category));
  params.selectedBrands.forEach((brand) => search.append("brands", brand));
  params.selectedSizes.forEach((size) => search.append("sizes", size));
  if (params.minPrice !== undefined) search.set("minPrice", String(params.minPrice));
  if (params.maxPrice !== undefined) search.set("maxPrice", String(params.maxPrice));
  if (params.searchQuery) search.set("q", params.searchQuery);
  if (params.page > 1) search.set("page", String(params.page));
  if (params.sortBy) search.set("sort", params.sortBy);
  if (params.selectedView) search.set("view", params.selectedView);
  if (params.selectedCollectionId !== undefined) {
    search.set("collection", String(params.selectedCollectionId));
  }

  const query = search.toString();
  return query ? `/catalog?${query}` : "/catalog";
}

function normalizeCatalogParams(params: CatalogSearchParams): NormalizedCatalogParams {
  const selectedCategories = Array.from(new Set(
    (Array.isArray(params.category) ? params.category : [params.category ?? ""])
      .map(canonicalCategoryName).filter(Boolean)
  ));
  const selectedAudience = normalizeAudience(firstSearchParam(params.audience) || null);
  const searchQuery = firstSearchParam(params.q).trim().slice(0, 120);
  const selectedBrands = normalizeSearchList(params.brands ?? params.brand);
  const selectedSizes = normalizeSearchList(params.sizes);
  let minPrice = parsePrice(params.minPrice);
  let maxPrice = parsePrice(params.maxPrice);
  let selectedView = normalizeCatalogView(firstSearchParam(params.view));
  let selectedCollectionId = parsePositiveId(params.collection);

  if (selectedCategories.length > 0) {
    selectedView = "";
    selectedCollectionId = undefined;
  } else if (selectedCollectionId !== undefined) {
    selectedView = "";
  }

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  return {
    selectedCategories,
    selectedAudience,
    searchQuery,
    selectedBrands,
    selectedSizes,
    minPrice,
    maxPrice,
    page: parsePage(params.page),
    sortBy: normalizeSort(firstSearchParam(params.sort)),
    selectedView,
    selectedCollectionId,
  };
}

const getActiveCatalogCollections = cache(async (): Promise<CatalogCollectionOption[]> => {
  try {
    const response = await fetch(`${API_URL}/api/storefront/home/collections`, {
      next: { revalidate: 30 },
    });
    if (!response.ok) return [];

    const data: unknown = await response.json();
    if (!Array.isArray(data)) return [];

    return data.filter(
      (item): item is CatalogCollectionOption =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as CatalogCollectionOption).id === "number" &&
        typeof (item as CatalogCollectionOption).title === "string"
    );
  } catch {
    return [];
  }
});

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<CatalogSearchParams>;
}): Promise<Metadata> {
  const normalized = normalizeCatalogParams((searchParams ? await searchParams : {}) ?? {});
  const collections =
    normalized.selectedCollectionId === undefined
      ? []
      : await getActiveCatalogCollections();
  const selectedCollection = collections.find(
    (collection) => collection.id === normalized.selectedCollectionId
  );
  const selectedCollectionId = selectedCollection?.id;
  const title = buildCatalogSeoTitle({
    category: normalized.selectedCategories.join(", "),
    audience: normalized.selectedAudience,
    q: normalized.searchQuery,
    view: normalized.selectedView,
    collectionTitle: selectedCollection?.title,
  });
  const description = buildCatalogSeoDescription({
    category: normalized.selectedCategories.join(", "),
    audience: normalized.selectedAudience,
    q: normalized.searchQuery,
    view: normalized.selectedView,
    collectionTitle: selectedCollection?.title,
  });
  const canonical = buildCatalogCanonical({ ...normalized, selectedCollectionId });

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, type: "website", url: canonical },
  };
}

async function getCatalogProducts(params: CatalogProductsQuery): Promise<{
  products: CatalogProduct[];
  totalPages: number;
  totalProducts: number;
  hasError: boolean;
}> {
  try {
    const response = await fetch(
      `${API_URL}/api/products/page?${buildCatalogProductsQuery(params)}`,
      params.q ? { cache: "no-store" } : { next: { revalidate: 60 } }
    );

    if (!response.ok) throw new Error("Catalog response failed");

    const data: unknown = await response.json();
    if (typeof data !== "object" || data === null || !("content" in data)) {
      throw new Error("Invalid catalog response");
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
    return { products: [], totalPages: 1, totalProducts: 0, hasError: true };
  }
}

/**
 * The dictionary has no availability counts. A complete small-catalog snapshot
 * lets mobile omit empty choices without guessing from one filtered page.
 * Larger catalogs and unavailable responses retain the full dictionary.
 */
const getMobileAvailableCategories = cache(async (): Promise<string[] | null> => {
  try {
    const response = await fetch(`${API_URL}/api/products/page?page=0&size=96`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (!data || typeof data !== "object") return null;
    const page = data as { content?: unknown; totalElements?: unknown };
    if (!Array.isArray(page.content) || typeof page.totalElements !== "number") return null;
    const products = normalizeProducts(page.content);
    if (products.length !== page.totalElements) return null;
    return Array.from(new Set(products.map((product) => product.category).filter(Boolean)));
  } catch {
    return null;
  }
});

async function getCatalogArray(path: string): Promise<unknown[]> {
  try {
    const response = await fetch(`${API_URL}${path}`, process.env.NODE_ENV === "development"
      ? { cache: "no-store" }
      : { next: { revalidate: 300 } });
    if (!response.ok) return [];
    const data: unknown = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function getCatalogOptions(): Promise<{
  categories: CatalogCategory[];
  brands: string[];
  sizes: CatalogSize[];
}> {
  const [rawCategories, rawBrands, rawSizes] = await Promise.all([
    getCatalogArray("/api/catalog/categories"),
    getCatalogArray("/api/products/brands"),
    getCatalogArray("/api/sizes"),
  ]);

  const categories = rawCategories.filter(
    (item): item is CatalogCategory =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as CatalogCategory).id === "number" &&
      typeof (item as CatalogCategory).name === "string"
  );
  const brands = rawBrands.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  const sizes = rawSizes.filter(
    (item): item is CatalogSize =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as CatalogSize).id === "number" &&
      typeof (item as CatalogSize).name === "string"
  );

  return { categories, brands, sizes };
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams?: Promise<CatalogSearchParams>;
}) {
  const params = (searchParams ? await searchParams : {}) ?? {};
  const normalized = normalizeCatalogParams(params);
  const requestedCategories = Array.isArray(params.category) ? params.category : [params.category ?? ""];
  if (requestedCategories.some((category) => canonicalCategoryName(category) !== category.trim())) {
    redirect(buildCatalogCanonical(normalized));
  }
  const effectiveSort: SortValue =
    normalized.sortBy || (normalized.selectedView === "new" ? "newest" : "");
  const canStartProductsImmediately =
    normalized.selectedCategories.length === 0 && normalized.selectedCollectionId === undefined;
  const earlyProducts = canStartProductsImmediately
    ? getCatalogProducts({
        audience: normalized.selectedAudience,
        categories: [],
        brands: normalized.selectedBrands,
        sizes: normalized.selectedSizes,
        minPrice: normalized.minPrice,
        maxPrice: normalized.maxPrice,
        q: normalized.searchQuery,
        sort: effectiveSort,
        page: normalized.page,
      })
    : Promise.resolve(null);

  const [options, collections, prefetchedProducts, mobileAvailableCategories] = await Promise.all([
    getCatalogOptions(),
    getActiveCatalogCollections(),
    earlyProducts,
    getMobileAvailableCategories(),
  ]);
  const selectedCollection = collections.find(
    (collection) => collection.id === normalized.selectedCollectionId
  );
  const selectedCollectionId = selectedCollection?.id;
  const effectiveNormalized = { ...normalized, selectedCollectionId };

  if (
    normalized.selectedCollectionId !== undefined &&
    selectedCollectionId === undefined
  ) {
    redirect(buildCatalogCanonical(effectiveNormalized));
  }

  const categoryGroups = groupCatalogCategories(options.categories);
  const selectedCategories = normalizeCategorySelection(normalized.selectedCategories, categoryGroups);
  if (categoryGroups.length > 0 && selectedCategories.join("\n") !== normalized.selectedCategories.join("\n")) {
    redirect(buildCatalogCanonical({ ...effectiveNormalized, selectedCategories }));
  }
  const expandedCategories = expandCategorySelections(
    normalized.selectedCategories,
    categoryGroups
  );
  const { products, totalPages, totalProducts, hasError } =
    prefetchedProducts ??
    (await getCatalogProducts({
      audience: normalized.selectedAudience,
      categories: expandedCategories,
      brands: normalized.selectedBrands,
      sizes: normalized.selectedSizes,
      minPrice: normalized.minPrice,
      maxPrice: normalized.maxPrice,
      q: normalized.searchQuery,
      sort: effectiveSort,
      page: normalized.page,
      collectionId: selectedCollectionId,
    }));

  if (!hasError && totalProducts > 0 && normalized.page > totalPages) {
    redirect(buildCatalogCanonical({ ...effectiveNormalized, page: totalPages }));
  }

  return (
    <div className="pageContainer">
      <CatalogClient
        products={products}
        categoryGroups={categoryGroups}
        mobileAvailableCategories={mobileAvailableCategories}
        brands={options.brands}
        sizes={options.sizes}
        collections={collections}
        selectedCategories={normalized.selectedCategories}
        selectedAudience={normalized.selectedAudience}
        selectedBrands={normalized.selectedBrands}
        selectedSizes={normalized.selectedSizes}
        minPrice={normalized.minPrice}
        maxPrice={normalized.maxPrice}
        searchQuery={normalized.searchQuery}
        currentPage={normalized.page}
        totalPages={totalPages}
        totalProducts={totalProducts}
        initialSort={normalized.sortBy}
        selectedView={normalized.selectedView}
        selectedCollectionId={selectedCollectionId}
        hasError={hasError}
      />
    </div>
  );
}
