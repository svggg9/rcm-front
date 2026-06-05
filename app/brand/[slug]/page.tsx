import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { API_URL } from "../../lib/api";
import { ProductTile } from "../../components/ProductTile/ProductTile";
import styles from "../../components/Catalog/Catalog.module.css";

import type { PaginatedProducts } from "../../components/Catalog/catalogTypes";

export const dynamic = "force-dynamic";

type BrandResponse = {
  id: number;
  name: string;
  slug: string;
};

async function getBrand(slug: string): Promise<BrandResponse | null> {
  const response = await fetch(
    `${API_URL}/api/brands/${encodeURIComponent(slug)}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) return null;

  return response.json();
}

async function getBrandProducts(slug: string): Promise<PaginatedProducts> {
  const response = await fetch(
    `${API_URL}/api/products/brand/${encodeURIComponent(slug)}?page=0&size=48`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return {
      items: [],
      page: 0,
      totalPages: 0,
      totalProducts: 0,
    };
  }

  const data = await response.json();

  return {
    items: Array.isArray(data.content) ? data.content : [],
    page: data.number ?? 0,
    totalPages: data.totalPages ?? 0,
    totalProducts: data.totalElements ?? 0,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrand(slug);

  if (!brand) {
    return {
      title: "Производитель не найден | RCM",
      description: "Производитель не найден.",
    };
  }

  return {
    title: `${brand.name} — товары производителя | RCM`,
    description: `Каталог товаров производителя ${brand.name}. Оригинальные товары российских брендов на RCM Marketplace.`,
    alternates: {
      canonical: `/brand/${brand.slug}`,
    },
    openGraph: {
      title: `${brand.name} — товары производителя | RCM`,
      description: `Каталог товаров производителя ${brand.name} на RCM Marketplace.`,
      type: "website",
      url: `/brand/${brand.slug}`,
    },
  };
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [brand, products] = await Promise.all([
    getBrand(slug),
    getBrandProducts(slug),
  ]);

  if (!brand) {
    notFound();
  }

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
            <h1 className={styles.heading}>{brand.name}</h1>
          </div>
        </div>

        <section className={styles.results}>
          <div className={styles.resultsBar}>
            <div className={styles.count}>
              {products.totalProducts.toLocaleString("ru-RU")} товаров
            </div>
          </div>

          <ul className={styles.grid} aria-busy="false">
            {products.items.map((product) => (
              <ProductTile
                key={product.id}
                product={{
                  id: product.id,
                  title: product.title,
                  brand: product.brand,
                  brandSlug: product.brandSlug,
                  images: product.images,
                  minPrice: product.minPrice,
                }}
              />
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}