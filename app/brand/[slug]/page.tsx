import { BrandPresentation } from "./BrandPresentation";
import { BrandAboutLink } from "./BrandAboutLink";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { API_URL } from "../../lib/api";
import { BrandFavoriteButton } from "./BrandFavoriteButton";
import { BrandCatalog, type BrandFilters } from "./BrandCatalog";
import { BrandImageCarousel } from "./BrandImageCarousel";

import styles from "./BrandPage.module.css";

import type { PaginatedProducts } from "../../components/Catalog/catalogTypes";
import { normalizeProducts, normalizeSort } from "../../components/Catalog/catalogUtils";

export const dynamic = "force-dynamic";

type BrandResponse = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  wordmarkUrl: string | null;
  website: string | null;
  telegram: string | null;
  vk: string | null;
  country: string | null;
  foundationYear: number | null;
  images: {
    id: number;
    imageUrl: string;
    sortOrder: number;
  }[];
  collections?: {
    id: number;
    title: string;
    description: string | null;
    products: unknown[];
  }[];
};

type BrandPageData = {
  brand: BrandResponse;
  products: PaginatedProducts;
};

const getBrandPage = cache(async (slug: string): Promise<BrandPageData | null> => {
  const response = await fetch(
    `${API_URL}/api/brands/${encodeURIComponent(slug)}/page?page=0&size=48`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) return null;

  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || !("brand" in data)) {
    return null;
  }

  const payload = data as {
    brand?: unknown;
    products?: {
      content?: unknown;
      number?: unknown;
      totalPages?: unknown;
      totalElements?: unknown;
    };
  };
  if (!payload.brand || typeof payload.brand !== "object") return null;

  const products = payload.products;

  return {
    brand: payload.brand as BrandResponse,
    products: {
      items: normalizeProducts(products?.content),
      page: typeof products?.number === "number" ? products.number : 0,
      totalPages:
        typeof products?.totalPages === "number" ? products.totalPages : 0,
      totalProducts:
        typeof products?.totalElements === "number" ? products.totalElements : 0,
    },
  };
});

function getBrandDescription(brand: BrandResponse): string {
  return (
    brand.description ||
    `Товары производителя ${brand.name} на рцмаркет — магазине независимых брендов.`
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getBrandPage(slug);
  const brand = data?.brand ?? null;

  if (!brand) {
    return {
      title: "Производитель не найден | рцмаркет",
      description: "Производитель не найден.",
    };
  }

  const description = getBrandDescription(brand);

  return {
    title: `${brand.name} — товары производителя | рцмаркет`,
    description,
    alternates: {
      canonical: `/brand/${brand.slug}`,
    },
    openGraph: {
      title: `${brand.name} — товары производителя | рцмаркет`,
      description,
      type: "website",
      url: `/brand/${brand.slug}`,
      images: brand.logoUrl ? [{ url: brand.logoUrl }] : undefined,
    },
  };
}

export default async function BrandPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;

  const data = await getBrandPage(slug);

  if (!data) {
    notFound();
  }

  const { brand } = data;
  const search = await searchParams;
  const first = (key: string) => typeof search[key] === "string" ? search[key] as string : "";
  const price = (key: string) => first(key) && Number.isFinite(Number(first(key))) && Number(first(key)) >= 0 ? String(Number(first(key))) : "";
  const collections = (brand.collections ?? []).map(c => ({ ...c, products: normalizeProducts(c.products) }));
  const selected = collections.find(c => String(c.id) === first("collection"));
  const filters: BrandFilters = { category: first("category"), collection: selected ? String(selected.id) : "",
    sort: normalizeSort(first("sort")), minPrice: price("minPrice"), maxPrice: price("maxPrice"),
    page: Math.max(1, Math.min(100000, Math.floor(Number(first("page")) || 1))) };
  if (filters.minPrice && filters.maxPrice && Number(filters.minPrice) > Number(filters.maxPrice)) {
    [filters.minPrice, filters.maxPrice] = [filters.maxPrice, filters.minPrice];
  }
  let products = data.products;
  let hasError = false;
  const categoriesPromise = fetch(`${API_URL}/api/brands/${encodeURIComponent(slug)}/categories`, { cache: "no-store" })
    .then(async response => response.ok ? await response.json() as string[] : []).catch(() => [] as string[]);
  if (selected) {
    let items = selected.products.filter(p => (!filters.category || p.category === filters.category)
      && (!filters.minPrice || p.minPrice >= Number(filters.minPrice))
      && (!filters.maxPrice || p.minPrice <= Number(filters.maxPrice)));
    if (filters.sort === "price-asc") items = [...items].sort((a,b) => a.minPrice-b.minPrice || a.id-b.id);
    if (filters.sort === "price-desc") items = [...items].sort((a,b) => b.minPrice-a.minPrice || a.id-b.id);
    if (filters.sort === "newest") filters.sort = "";
    filters.page = 1;
    products = { items, page: 0, totalPages: items.length ? 1 : 0, totalProducts: items.length };
  } else if (filters.category || filters.sort || filters.minPrice || filters.maxPrice || filters.page > 1) {
    const query = new URLSearchParams({ brand: brand.name, size: "48", page: String(filters.page - 1) });
    for (const key of ["category", "sort", "minPrice", "maxPrice"] as const) if (filters[key]) query.set(key, filters[key]);
    try {
      const response = await fetch(`${API_URL}/api/products/page?${query}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Catalog unavailable");
      const page = await response.json();
      products = { items: normalizeProducts(page.content), page: page.number, totalPages: page.totalPages, totalProducts: page.totalElements };
    } catch { hasError = true; products = { items: [], page: 0, totalPages: 0, totalProducts: 0 }; }
  }
  const categories = await categoriesPromise;
  return (
    <div className="pageContainer">
      <div className={styles.catalogPage}>
        <BrandPresentation name={brand.name} wordmarkUrl={brand.wordmarkUrl} description={brand.description} compact
          action={<BrandFavoriteButton brand={{ id: brand.id, name: brand.name, slug: brand.slug,
            logoUrl: brand.logoUrl, country: brand.country }} />} />
        <BrandAboutLink />
        <BrandCatalog key={JSON.stringify(filters)} products={products.items} brandSlug={brand.slug}
          totalPages={products.totalPages} totalProducts={products.totalProducts} categories={categories}
          collections={collections} filters={filters} error={hasError} />
        <details className={styles.about} id="brand-about">
          <summary>О бренде {brand.name}</summary>
          {brand.description && <p className={styles.aboutDescription}>{brand.description}</p>}
          {(brand.country || brand.foundationYear) && <p className={styles.brandFacts}>
            {brand.country}{brand.country && brand.foundationYear ? ". " : ""}{brand.foundationYear ? `Основан в ${brand.foundationYear} году` : ""}
          </p>}
          <BrandImageCarousel images={brand.images ?? []} contained />
          {!brand.description && !brand.country && !brand.foundationYear && !brand.images?.length && <p>Бренд пока не добавил информацию о себе.</p>}
        </details>
      </div>
    </div>
  );
}
