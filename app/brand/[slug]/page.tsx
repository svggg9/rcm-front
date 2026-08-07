import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { API_URL } from "../../lib/api";
import { BrandFavoriteButton } from "./BrandFavoriteButton";
import { BrandCatalog } from "./BrandCatalog";
import { BrandImageCarousel } from "./BrandImageCarousel";
import { BrandCollections } from "./BrandCollections";
import styles from "./BrandPage.module.css";

import type { PaginatedProducts } from "../../components/Catalog/catalogTypes";
import { normalizeProducts } from "../../components/Catalog/catalogUtils";

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
    `Товары производителя ${brand.name} на RCMarket — маркетплейсе отечественных производителей.`
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
      title: "Производитель не найден | RCMarket",
      description: "Производитель не найден.",
    };
  }

  const description = getBrandDescription(brand);

  return {
    title: `${brand.name} — товары производителя | RCMarket`,
    description,
    alternates: {
      canonical: `/brand/${brand.slug}`,
    },
    openGraph: {
      title: `${brand.name} — товары производителя | RCMarket`,
      description,
      type: "website",
      url: `/brand/${brand.slug}`,
      images: brand.logoUrl ? [{ url: brand.logoUrl }] : undefined,
    },
  };
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const data = await getBrandPage(slug);

  if (!data) {
    notFound();
  }

  const { brand, products } = data;

  return (
    <div className="pageContainer">
      <div className={styles.catalogPage}>
        <div className={styles.catalogTop}>
          <nav className={styles.breadcrumbs} aria-label="Навигационная цепочка">
            <ol className={styles.breadcrumbList}>
              <li className={styles.breadcrumbItem}>
                <Link href="/catalog" className={styles.breadcrumbLink}>
                  Каталог
                </Link>
              </li>

              <li className={styles.breadcrumbItem}>
                <span className={styles.breadcrumbCurrent}>{brand.name}</span>
              </li>
            </ol>
          </nav>

          <div className={styles.headingWrap}>
            {brand.wordmarkUrl ? (
              <>
                <h1 className="visuallyHidden">{brand.name}</h1>
                <div className={styles.wordmark}>
                  <Image
                    src={brand.wordmarkUrl}
                    alt={brand.name}
                    fill
                    sizes="(max-width: 560px) 72vw, 520px"
                    priority
                  />
                </div>
              </>
            ) : (
              <h1 className={styles.heading}>{brand.name}</h1>
            )}
            <BrandFavoriteButton
              brand={{
                id: brand.id,
                name: brand.name,
                slug: brand.slug,
                logoUrl: brand.logoUrl,
                country: brand.country,
              }}
            />
          </div>

          {brand.description ? (
            <section className={styles.brandHero}>
              <div className={styles.brandHeroMain}>
                <p className={styles.brandDescription}>{brand.description}</p>
              </div>

            </section>
          ) : null}
        </div>

        <BrandImageCarousel images={brand.images ?? []} />
        <BrandCollections
          collections={(brand.collections ?? []).map((collection) => ({
            ...collection,
            products: normalizeProducts(collection.products),
          }))}
        />
        <BrandCatalog
          key={brand.slug}
          products={products.items}
          brandSlug={brand.slug}
          initialPage={products.page}
          totalPages={products.totalPages}
          totalProducts={products.totalProducts}
        />
      </div>
    </div>
  );
}
