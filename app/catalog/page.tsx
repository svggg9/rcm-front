import { API_URL } from "../lib/api";
import { CatalogClient } from "../components/Catalog/CatalogClient";
import {
  buildCatalogTitle,
  filterProducts,
  getBrands,
  normalizeAudience,
  normalizeProducts,
} from "../components/Catalog/catalogUtils";
import type {
  CatalogProduct,
  CatalogSearchParams,
} from "../components/Catalog/catalogTypes";

async function getCatalogProducts(): Promise<CatalogProduct[]> {
  const response = await fetch(`${API_URL}/api/products`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    return [];
  }

  const data: unknown = await response.json();
  return normalizeProducts(data);
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

  const products = await getCatalogProducts();

  const productsForBrandOptions = filterProducts(products, {
    selectedAudience,
    selectedCategory,
    selectedBrand: "",
    searchQuery,
  });

  const productsForListing = filterProducts(products, {
    selectedAudience,
    selectedCategory,
    selectedBrand,
    searchQuery,
  });

  const brands = getBrands(productsForBrandOptions);
  const pageTitle = buildCatalogTitle(selectedCategory, selectedAudience);

  return (
    <div className="pageContainer">
      <CatalogClient
        products={productsForListing}
        brands={brands}
        selectedCategory={selectedCategory}
        selectedAudience={selectedAudience}
        initialBrand={selectedBrand}
        searchQuery={searchQuery}
        pageTitle={pageTitle}
      />
    </div>
  );
}