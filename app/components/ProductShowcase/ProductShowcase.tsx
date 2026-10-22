"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState, type CSSProperties } from "react";

import { ProductCarousel } from "../ProductCarousel/ProductCarousel";
import { ProductTile } from "../ProductTile/ProductTile";
import type { CarouselProduct } from "../ProductCarousel/types";
import styles from "./ProductShowcase.module.css";

type ShowcaseVariant = "grid" | "carousel";
type ShowcaseDensity = "default" | "compact";

type Props = {
  title: string;
  products: CarouselProduct[];
  variant?: ShowcaseVariant;
  density?: ShowcaseDensity;
  href?: string;
  actionLabel?: string;
  emptyText?: string;
  className?: string;
  description?: string | null;
  presentation?: "default" | "storefront";
  mobileLayout?: "rail" | "grid";
  onFavoriteChange?: (product: CarouselProduct, isFavorite: boolean) => void;
};

export function ProductShowcase({
  title,
  products,
  variant = "carousel",
  density = "default",
  href,
  actionLabel,
  emptyText,
  className,
  description,
  presentation = "default",
  mobileLayout = "rail",
  onFavoriteChange,
}: Props) {
  const scrollerRef = useRef<HTMLUListElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const visibleProducts = useMemo(
    () =>
      variant === "grid"
        ? products.slice(0, density === "compact" ? 5 : 4)
        : products,
    [density, products, variant]
  );
  const label =
    actionLabel ?? (variant === "grid" ? "Каталог" : "Показать больше");

  const handleGridScroll = useCallback(() => {
    const node = scrollerRef.current;
    if (!node) return;

    const maxScroll = node.scrollWidth - node.clientWidth;
    const nextIndex = maxScroll > 0 ? Math.round(node.scrollLeft / maxScroll * (visibleProducts.length - 1)) : 0;
    setActiveIndex(Math.min(Math.max(nextIndex, 0), visibleProducts.length - 1));
  }, [visibleProducts.length]);

  if (!visibleProducts.length && !emptyText) return null;

  const variantClass = styles[variant] ?? "";
  const densityClass = density === "compact" ? styles.compact : "";

  return (
    <section
      className={[styles.section, variantClass, densityClass, presentation === "storefront" ? styles.storefront : "", mobileLayout === "grid" ? styles.mobileGrid : "", className]
        .filter(Boolean)
        .join(" ")}
      data-variant={variant}
      data-presentation={presentation}
      data-count={visibleProducts.length}
      data-mobile-layout={mobileLayout}
    >
      <div className={styles.header}>
        <div><h2 className={styles.title}>{title}</h2>
          {description ? <p className={styles.description}>{description}</p> : null}
        </div>

        {href ? (
          <Link href={href} className={styles.headerAction}>
            {label}
          </Link>
        ) : null}
      </div>

      {visibleProducts.length > 0 ? (
        variant === "grid" ? (
          <>
            <ul
              ref={scrollerRef}
              className={styles.gridList}
              onScroll={handleGridScroll}
              style={presentation === "storefront" ? { "--showcase-columns": Math.min(4, visibleProducts.length) } as CSSProperties : undefined}
            >
              {visibleProducts.map((product) => (
                <ProductTile
                  key={product.id}
                  product={product}
                  presentation={presentation}
                  onFavoriteChange={(_, isFavorite) =>
                    onFavoriteChange?.(product, isFavorite)
                  }
                />
              ))}
            </ul>

            {visibleProducts.length > 1 && mobileLayout !== "grid" ? (
              <div className={styles.mobileIndicator} aria-hidden="true">
                {visibleProducts.map((product, index) => (
                  <span
                    key={product.id}
                    className={`${styles.mobileIndicatorPart} ${
                      activeIndex === index ? styles.mobileIndicatorPartActive : ""
                    }`.trim()}
                  />
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <ProductCarousel products={visibleProducts} density={density} />
        )
      ) : (
        <div className={styles.empty}>{emptyText}</div>
      )}
    </section>
  );
}
