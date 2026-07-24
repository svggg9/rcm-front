"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";

import { ProductTile } from "../../components/ProductTile/ProductTile";
import type { CatalogProduct } from "../../components/Catalog/catalogTypes";

import styles from "./BrandPage.module.css";

type BrandCategory = {
  name: string;
  image: string | null;
};

export function BrandCatalog({ products }: { products: CatalogProduct[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const catalogRef = useRef<HTMLElement>(null);

  const categories = useMemo(() => {
    const result = new Map<string, BrandCategory>();

    products.forEach((product) => {
      const name = product.category.trim();
      if (!name) return;

      const current = result.get(name);
      const image = product.images[0] ?? null;
      if (!current || (!current.image && image)) {
        result.set(name, { name, image });
      }
    });

    return Array.from(result.values());
  }, [products]);

  const visibleProducts = selectedCategory
    ? products.filter((product) => product.category === selectedCategory)
    : products;

  function selectCategory(category: string) {
    setSelectedCategory((current) => (current === category ? null : category));
    window.requestAnimationFrame(() => {
      catalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <>
      {categories.length ? (
        <section className={styles.categoryShowcase} aria-label="Категории бренда">
          <div className={styles.categoryShowcaseHeader}>
            <h2>Категории</h2>
          </div>

          <div className={styles.categoryGallery}>
            {categories.map((category) => (
              <button
                type="button"
                key={category.name}
                className={styles.categoryCard}
                onClick={() => selectCategory(category.name)}
              >
                <span className={styles.categoryImage}>
                  {category.image ? (
                    <Image
                      src={category.image}
                      alt=""
                      fill
                      sizes="(max-width: 700px) 44vw, 260px"
                    />
                  ) : null}
                </span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.results} ref={catalogRef}>
        <div className={styles.catalogHeader}>
          <h2>Товары</h2>
          <span className={styles.count}>
            {visibleProducts.length.toLocaleString("ru-RU")}
          </span>
        </div>

        {categories.length ? (
          <div className={styles.categoryChips} aria-label="Фильтр по категории">
            <button
              type="button"
              className={`${styles.categoryChip} ${
                selectedCategory === null ? styles.categoryChipActive : ""
              }`}
              onClick={() => setSelectedCategory(null)}
            >
              Все
            </button>
            {categories.map((category) => (
              <button
                type="button"
                key={category.name}
                className={`${styles.categoryChip} ${
                  selectedCategory === category.name
                    ? styles.categoryChipActive
                    : ""
                }`}
                onClick={() => selectCategory(category.name)}
              >
                {category.name}
              </button>
            ))}
          </div>
        ) : null}

        <ul className={styles.grid} aria-live="polite">
          {visibleProducts.map((product) => (
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
    </>
  );
}
