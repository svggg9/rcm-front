import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { API_URL } from "../lib/api";
import { CatalogClient } from "../components/Catalog/CatalogClient";
import { getStorefrontHome } from "../home/lib/getStorefrontHome";
import {
  expandCategorySelection,
  firstSearchParam,
  groupCatalogCategories,
  normalizeAudience,
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
  CatalogSearchParams,
  CatalogSize,
  CatalogView,
  SelectedAudience,
  SortValue,
} from "../components/Catalog/catalogTypes";

const SITE_NAME = "RCMarket";

type NormalizedCatalogParams = {
  selectedCategory: string;
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
    return `${params.category} российских марок | ${SITE_NAME}`;
  }

  if (params.audience === "men") return `Товары для мужчин | ${SITE_NAME}`;
  if (params.audience === "women") return `Товары для женщин | ${SITE_NAME}`;
  return `Каталог российских марок | ${SITE_NAME}`;
}

function buildCatalogSeoDescription(params: {
  category: string;
  audience: SelectedAudience;
  q: string;
  view: CatalogView;
  collectionTitle?: string;
}): string {
  if (params.q) {
    return `Результаты поиска «${params.q}» в каталоге RCMarket.`;
  }

  if (params.collectionTitle) {
    return `${params.collectionTitle}: редакционная подборка российских марок в RCMarket.`;
  }

  if (params.view === "new") {
    return "Новинки российских производителей и независимых локальных марок в RCMarket.";
  }

  if (params.category) {
    return `${params.category} в каталоге RCMarket: вещи российских производителей и независимых локальных марок.`;
  }

  if (params.audience === "men") {
    return "Мужская коллекция российских производителей и независимых локальных марок в RCMarket.";
  }

  if (params.audience === "women") {
    return "Женская коллекция российских производителей и независимых локальных марок в RCMarket.";
  }

  return "Каталог российских производителей и независимых локальных марок RCMarket.";
}

function buildCatalogCanonical(params: NormalizedCatalogParams & { page: number }): string {
  const search = new URLSearchParams();

  if (params.selectedAudience !== "all") search.set("audience", params.selectedAudience);
  if (params.selectedCategory) search.set("category", params.selectedCategory);
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
  const selectedCategory = firstSearchParam(params.category).trim();
  const selectedAudience = normalizeAudience(firstSearchParam(params.audience) || null);
  const searchQuery = firstSearchParam(params.q).trim();
  const selectedBrands = normalizeSearchList(params.brands ?? params.brand);
  const selectedSizes = normalizeSearchList(params.sizes);
  let minPrice = parsePrice(params.minPrice);
  let maxPrice = parsePrice(params.maxPrice);
  let selectedView = normalizeCatalogView(firstSearchParam(params.view));
  let selectedCollectionId = parsePositiveId(params.collection);

  if (selectedCategory) {
    selectedView = "";
    selectedCollectionId = undefined;
  } else if (selectedCollectionId !== undefined) {
    selectedView = "";
  }

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  return {
    selectedCategory,
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

async function getActiveCatalogCollections(): Promise<CatalogCollectionOption[]> {
  const home = await getStorefrontHome();
  return (home?.collections ?? []).map(({ id, title }) => ({ id, title }));
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<CatalogSearchParams>;
}): Promise<Metadata> {
  const normalized = normalizeCatalogParams((searchParams ? await searchParams : {}) ?? {});
  const collections = await getActiveCatalogCollections();
  const selectedCollection = collections.find(
    (collection) => collection.id === normalized.selectedCollectionId
  );
  const selectedCollectionId = selectedCollection?.id;
  const title = buildCatalogSeoTitle({
    category: normalized.selectedCategory,
    audience: normalized.selectedAudience,
    q: normalized.searchQuery,
    view: normalized.selectedView,
    collectionTitle: selectedCollection?.title,
  });
  const description = buildCatalogSeoDescription({
    category: normalized.selectedCategory,
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

async function getCatalogProducts(params: {
  audience: SelectedAudience;
  categories: string[];
  brands: string[];
  sizes: string[];
  minPrice?: number;
  maxPrice?: number;
  q: string;
  sort: SortValue;
  page: number;
  collectionId?: number;
}): Promise<{
  products: CatalogProduct[];
  totalPages: number;
  totalProducts: number;
  hasError: boolean;
}> {
  try {
    const search = new URLSearchParams();

    if (params.audience !== "all") search.set("audience", params.audience);
    params.categories.forEach((category) => search.append("categories", category));
    params.brands.forEach((brand) => search.append("brands", brand));
    params.sizes.forEach((size) => search.append("sizes", size));
    if (params.minPrice !== undefined) search.set("minPrice", String(params.minPrice));
    if (params.maxPrice !== undefined) search.set("maxPrice", String(params.maxPrice));
    if (params.q) search.set("q", params.q);
    if (params.sort) search.set("sort", params.sort);
    if (params.collectionId !== undefined) {
      search.set("collectionId", String(params.collectionId));
    }
    search.set("page", String(Math.max(0, params.page - 1)));
    search.set("size", "48");

    const response = await fetch(`${API_URL}/api/products/page?${search.toString()}`, {
      next: { revalidate: 60 },
    });

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

async function getCatalogArray(path: string): Promise<unknown[]> {
  try {
    const response = await fetch(`${API_URL}${path}`, { next: { revalidate: 300 } });
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
  const normalized = normalizeCatalogParams((searchParams ? await searchParams : {}) ?? {});
  const [options, collections] = await Promise.all([
    getCatalogOptions(),
    getActiveCatalogCollections(),
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
  const expandedCategories = expandCategorySelection(
    normalized.selectedCategory,
    categoryGroups
  );
  const effectiveSort: SortValue =
    normalized.sortBy || (normalized.selectedView === "new" ? "newest" : "");
  const { products, totalPages, totalProducts, hasError } = await getCatalogProducts({
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
  });

  if (!hasError && totalProducts > 0 && normalized.page > totalPages) {
    redirect(buildCatalogCanonical({ ...effectiveNormalized, page: totalPages }));
  }

  return (
    <div className="pageContainer">
      <CatalogClient
        products={products}
        categoryGroups={categoryGroups}
        brands={options.brands}
        sizes={options.sizes}
        collections={collections}
        selectedCategory={normalized.selectedCategory}
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
