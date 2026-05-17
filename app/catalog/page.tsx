import { API_URL } from "../lib/api";
import { CatalogClient } from "../components/Catalog/CatalogClient";
import {
  buildCatalogTitle,
  filterProducts,
  getBrands,
  normalizeAudience,
  normalizeProducts,
  parsePage,
  paginateProducts,
  normalizeSort,
  sortProducts,
} from "../components/Catalog/catalogUtils";
import type {
  CatalogProduct,
  CatalogSearchParams,
} from "../components/Catalog/catalogTypes";

async function getCatalogProducts(): Promise<{
  products: CatalogProduct[];
  hasError: boolean;
}> {
  try {
    const response = await fetch(`${API_URL}/api/products`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return { products: [], hasError: true };
    }

    const data: unknown = await response.json();

    return {
      products: normalizeProducts(data),
      hasError: false,
    };
  } catch {
    return { products: [], hasError: true };
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

  const { products, hasError } = await getCatalogProducts();

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

  const sortedProducts = sortProducts(productsForListing, sortBy);
  const paginatedProducts = paginateProducts(sortedProducts, page, 48);

  const brands = getBrands(productsForBrandOptions);
  const pageTitle = buildCatalogTitle(selectedCategory, selectedAudience);

  return (
    <div className="pageContainer">
      <CatalogClient
        products={paginatedProducts.items}
        totalProducts={productsForListing.length}
        brands={brands}
        selectedCategory={selectedCategory}
        selectedAudience={selectedAudience}
        initialBrand={selectedBrand}
        searchQuery={searchQuery}
        pageTitle={pageTitle}
        currentPage={paginatedProducts.page}
        totalPages={paginatedProducts.totalPages}
        initialSort={sortBy}
        hasError={hasError}
      />
    </div>
  );
}