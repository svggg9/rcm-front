import styles from "./Catalog.module.css";
import { categoryFacetTotals, categoryValue, findCategory, normalizeCategories, normalizeCategoryFacets } from "../../lib/categories";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cache, type ReactNode } from "react";

import { API_URL } from "../../lib/api";
import { CatalogClient } from "./CatalogClient";
import { RecommendationsShowcase } from "../Recommendations/RecommendationsShowcase";
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
} from "./catalogUtils";
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
} from "./catalogTypes";

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
  const categoryDictionary = await getCatalogCategories();
  const selectedContext = await getSelectedCategoryContext(JSON.stringify(normalized.selectedCategories));
  const seoCategories = normalized.selectedCategories.map(value => {
    const item = findCategory([...categoryDictionary.categories, ...selectedContext.categories], value);
    return item?.name ?? value;
  }).join(", ");
  const title = buildCatalogSeoTitle({
    category: seoCategories,
    audience: normalized.selectedAudience,
    q: normalized.searchQuery,
    view: normalized.selectedView,
    collectionTitle: selectedCollection?.title,
  });
  const description = buildCatalogSeoDescription({
    category: seoCategories,
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

const getCatalogCategories = cache(async (): Promise<{categories: CatalogCategory[]; hasError: boolean}> => {
  try {
    const response = await fetch(`${API_URL}/api/catalog/categories`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error("Categories unavailable");
    return { categories: normalizeCategories(await response.json()), hasError: false };
  } catch {
    return { categories: [], hasError: true };
  }
});

const getSelectedCategoryContext = cache(async (valuesJson: string): Promise<{categories: CatalogCategory[]; hasError: boolean}> => {
  const values = JSON.parse(valuesJson) as string[];
  if (!values.length) return {categories: [], hasError: false};
  const dictionary = await getCatalogCategories();
  if (values.every(value => findCategory(dictionary.categories, value))) return {categories: [], hasError: false};
  try {
    const query = new URLSearchParams();
    values.forEach(value => query.append("values", value));
    const response = await fetch(`${API_URL}/api/catalog/categories/selection?${query}`, {cache: "no-store", signal: AbortSignal.timeout(5000)});
    if (!response.ok) throw new Error("Selected category unavailable");
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" || !("categories" in result)) throw new Error("Invalid selected categories");
    return {categories: normalizeCategories(result.categories), hasError: false};
  } catch {
    return {categories: [], hasError: true};
  }
});

async function getAvailableCategories(params: NormalizedCatalogParams, categories: CatalogCategory[]): Promise<string[] | null> {
  try {
    const query = new URLSearchParams(buildCatalogProductsQuery({ audience: params.selectedAudience, categories: [],
      brands: params.selectedBrands, sizes: params.selectedSizes, minPrice: params.minPrice, maxPrice: params.maxPrice,
      q: params.searchQuery, sort: "", page: 1, collectionId: params.selectedCollectionId }));
    query.delete("page"); query.delete("size"); query.delete("sort");
    const response = await fetch(`${API_URL}/api/catalog/category-facets?${query}`, {cache: "no-store", signal: AbortSignal.timeout(5000)});
    if (!response.ok) throw new Error("Category facets unavailable");
    const totals = categoryFacetTotals(categories, normalizeCategoryFacets(await response.json()));
    return categories.filter(category => (totals.get(category.id) ?? 0) > 0).map(categoryValue);
  } catch {
    return null;
  }
}

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
  categoryError: boolean;
}> {
  const [categoryResult, rawBrands, rawSizes] = await Promise.all([
    getCatalogCategories(),
    getCatalogArray("/api/products/brands"),
    getCatalogArray("/api/sizes"),
  ]);

  const categories = categoryResult.categories;
  const brands = rawBrands.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  const sizes = rawSizes.filter(
    (item): item is CatalogSize =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as CatalogSize).id === "number" &&
      typeof (item as CatalogSize).name === "string"
  );

  return { categories, brands, sizes, categoryError: categoryResult.hasError };
}

export async function CatalogPageContent({
  searchParams, brandName, basePath = "/catalog", header, footer,
}: {
  searchParams?: Promise<CatalogSearchParams>;
  brandName?: string; basePath?: string; header?: ReactNode; footer?: ReactNode;
}) {
  const params = (searchParams ? await searchParams : {}) ?? {};
  const normalized = normalizeCatalogParams(brandName ? { ...params, brands: [brandName], brand: undefined } : params);
  const canonical = (values: NormalizedCatalogParams) => {
    const url = new URL(buildCatalogCanonical(values), "http://localhost");
    if (brandName) url.searchParams.delete("brands");
    return basePath + url.search;
  };
  const requestedCategories = Array.isArray(params.category) ? params.category : [params.category ?? ""];
  if (requestedCategories.some((category) => canonicalCategoryName(category) !== category.trim())) {
    redirect(canonical(normalized));
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

  const [options, collections, prefetchedProducts] = await Promise.all([
    getCatalogOptions(),
    getActiveCatalogCollections(),
    earlyProducts,
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
    redirect(canonical(effectiveNormalized));
  }

  const categoryGroups = groupCatalogCategories(options.categories);
  const selectedContext = await getSelectedCategoryContext(JSON.stringify(normalized.selectedCategories));
  const contextDictionary = [...new Map([...options.categories, ...selectedContext.categories].map(category => [category.id, category])).values()];
  const mobileAvailableCategories = options.categoryError ? null : await getAvailableCategories(effectiveNormalized, options.categories);
  const selectedCategories = normalizeCategorySelection(normalized.selectedCategories, groupCatalogCategories(contextDictionary));
  const categoryLabels = Object.fromEntries(contextDictionary.map(category => [categoryValue(category), category.label]));
  if (categoryGroups.length > 0 && selectedCategories.join("\n") !== normalized.selectedCategories.join("\n")) {
    redirect(canonical({ ...effectiveNormalized, selectedCategories }));
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
    redirect(canonical({ ...effectiveNormalized, page: totalPages }));
  }

  return (
    <div className={`pageContainer ${styles.catalogContainer}`}>
      {header}
      <CatalogClient
        basePath={basePath}
        lockedBrand={brandName}
        products={products}
        categoryGroups={categoryGroups}
        categoryError={options.categoryError || selectedContext.hasError}
        categoryLabels={categoryLabels}
        facetsError={!options.categoryError && mobileAvailableCategories === null}
        mobileAvailableCategories={mobileAvailableCategories}
        brands={options.brands}
        sizes={options.sizes}
        collections={collections}
        selectedCategories={selectedCategories}
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
      {footer}
      {!brandName && <RecommendationsShowcase audience={normalized.selectedAudience} />}
    </div>
  );
}
