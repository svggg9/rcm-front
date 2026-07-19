import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { API_URL } from "../../lib/api";
import { ProductTile } from "../../components/ProductTile/ProductTile";
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
  website: string | null;
  telegram: string | null;
  vk: string | null;
  country: string | null;
  foundationYear: number | null;
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
    items: normalizeProducts(data.content),
    page: data.number ?? 0,
    totalPages: data.totalPages ?? 0,
    totalProducts: data.totalElements ?? 0,
  };
}

function getBrandDescription(brand: BrandResponse): string {
  return (
    brand.description ||
    `Товары производителя ${brand.name} на RCMarket — маркетплейсе отечественных производителей.`
  );
}

function getExternalHref(value: string | null): string | null {
  if (!value) return null;

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("@")) {
    return `https://t.me/${value.slice(1)}`;
  }

  return `https://${value}`;
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

  const [brand, products] = await Promise.all([
    getBrand(slug),
    getBrandProducts(slug),
  ]);

  if (!brand) {
    notFound();
  }

  const websiteHref = getExternalHref(brand.website);
  const telegramHref = getExternalHref(brand.telegram);
  const vkHref = getExternalHref(brand.vk);

  const hasBrandInfo =
    Boolean(brand.description) ||
    Boolean(brand.logoUrl) ||
    Boolean(brand.country) ||
    Boolean(brand.foundationYear) ||
    Boolean(brand.website) ||
    Boolean(brand.telegram) ||
    Boolean(brand.vk);

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

          {hasBrandInfo ? (
            <section className={styles.brandHero}>
              <div className={styles.brandHeroMain}>
                {brand.description ? (
                  <p className={styles.brandDescription}>{brand.description}</p>
                ) : null}

                {brand.country || brand.foundationYear ? (
                  <div className={styles.brandMeta}>
                    {brand.country ? <span>{brand.country}</span> : null}
                    {brand.foundationYear ? (
                      <span>основан в {brand.foundationYear}</span>
                    ) : null}
                  </div>
                ) : null}

                {websiteHref || telegramHref || vkHref ? (
                  <div className={styles.brandLinks}>
                    {websiteHref ? (
                      <a
                        href={websiteHref}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.brandLink}
                      >
                        Сайт
                      </a>
                    ) : null}

                    {telegramHref ? (
                      <a
                        href={telegramHref}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.brandLink}
                      >
                        Telegram
                      </a>
                    ) : null}

                    {vkHref ? (
                      <a
                        href={vkHref}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.brandLink}
                      >
                        VK
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {brand.logoUrl ? (
                <div className={styles.brandLogoBox}>
                  <Image
                    src={brand.logoUrl}
                    alt={brand.name}
                    fill
                    sizes="120px"
                    className={styles.brandLogo}
                  />
                </div>
              ) : null}
            </section>
          ) : null}
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
                  publicId: product.publicId,
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
