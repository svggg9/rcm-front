"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";

import { ProductCarousel } from "../ProductCarousel/ProductCarousel";
import { ProductTile } from "../ProductTile/ProductTile";
import type { CarouselProduct } from "../ProductCarousel/types";
import styles from "./ProductShowcase.module.css";

type ShowcaseVariant = "grid" | "carousel";

type Props = {
  title: string;
  products: CarouselProduct[];
  variant?: ShowcaseVariant;
  href?: string;
  actionLabel?: string;
  emptyText?: string;
  className?: string;
};

export function ProductShowcase({
  title,
  products,
  variant = "carousel",
  href,
  actionLabel,
  emptyText,
  className,
}: Props) {
  const scrollerRef = useRef<HTMLUListElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const visibleProducts = useMemo(
    () => (variant === "grid" ? products.slice(0, 4) : products),
    [products, variant]
  );
  const label =
    actionLabel ?? (variant === "grid" ? "Начать шопинг" : "Показать больше");

  const handleGridScroll = useCallback(() => {
    const node = scrollerRef.current;
    if (!node) return;

    const firstItem = node.firstElementChild as HTMLElement | null;
    if (!firstItem) return;

    const step = firstItem.offsetWidth + 10;
    const nextIndex = Math.round(node.scrollLeft / step);
    setActiveIndex(Math.min(Math.max(nextIndex, 0), visibleProducts.length - 1));
  }, [visibleProducts.length]);

  if (!visibleProducts.length && !emptyText) return null;

  return (
    <section
      className={`${styles.section} ${styles[variant]} ${className ?? ""}`.trim()}
      data-variant={variant}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>

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
            >
              {visibleProducts.map((product) => (
                <ProductTile key={product.id} product={product} />
              ))}
            </ul>

            {visibleProducts.length > 1 ? (
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
          <ProductCarousel products={visibleProducts} />
        )
      ) : (
        <div className={styles.empty}>{emptyText}</div>
      )}
    </section>
  );
}
