"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type UIEvent,
} from "react";

import { ProductTile } from "../ProductTile/ProductTile";
import type { CarouselProduct } from "./types";
import styles from "./ProductCarousel.module.css";

type Props = {
  title?: string;
  products: CarouselProduct[];
};

const CARD_WIDTH = 248;
const CARD_GAP = 16;
const SCROLL_STEP = CARD_WIDTH * 4 + CARD_GAP * 4;

export function ProductCarousel({ title, products }: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const visibleProducts = useMemo(() => products.slice(0, 12), [products]);

  const updateScrollState = useCallback(() => {
    const node = scrollerRef.current;
    if (!node) return;

    const maxScrollLeft = node.scrollWidth - node.clientWidth;

    setCanScrollLeft(node.scrollLeft > 4);
    setCanScrollRight(node.scrollLeft < maxScrollLeft - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
  }, [visibleProducts, updateScrollState]);

  function handleScroll(_event: UIEvent<HTMLDivElement>) {
    updateScrollState();
  }

  function scrollByStep(direction: "left" | "right") {
    const node = scrollerRef.current;
    if (!node) return;

    node.scrollBy({
      left: direction === "left" ? -SCROLL_STEP : SCROLL_STEP,
      behavior: "smooth",
    });
  }

  if (!visibleProducts.length) return null;

  return (
    <section className={styles.section}>
      {title ? (
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
        </div>
      ) : null}

      <div className={styles.carousel}>
        <button
          type="button"
          className={`${styles.arrow} ${styles.arrowLeft}`}
          onClick={() => scrollByStep("left")}
          disabled={!canScrollLeft}
          aria-label="Прокрутить влево"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              d="M14.5 6L8.5 12L14.5 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div
          ref={scrollerRef}
          className={styles.scroller}
          onScroll={handleScroll}
        >
          {visibleProducts.map((product) => (
            <div key={product.id} className={styles.item}>
              <ProductTile product={product} />
            </div>
          ))}
        </div>

        <button
          type="button"
          className={`${styles.arrow} ${styles.arrowRight}`}
          onClick={() => scrollByStep("right")}
          disabled={!canScrollRight}
          aria-label="Прокрутить вправо"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              d="M9.5 6L15.5 12L9.5 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </section>
  );
}