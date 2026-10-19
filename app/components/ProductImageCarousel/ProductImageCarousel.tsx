"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import styles from "./ProductImageCarousel.module.css";

type Props = {
  title: string;
  images: string[];
  onImageClick?: (index: number) => void;
  className?: string;
  fit?: "cover" | "contain";
  sizes?: string;
  overlayIndicators?: boolean;
};

export function ProductImageCarousel({
  title,
  images,
  onImageClick,
  className = "",
  fit = "cover",
  overlayIndicators = false,
  sizes = "(max-width: 768px) 100vw, 240px",
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const displayedActiveIndex = Math.min(activeIndex, Math.max(images.length - 1, 0));
  const imagesKey = images.join("\u0000");

  useEffect(() => {
    trackRef.current?.scrollTo({ left: 0 });
  }, [imagesKey]);

  function scrollToIndex(index: number) {
    const node = trackRef.current;
    if (!node) return;

    const safeIndex = Math.min(Math.max(index, 0), images.length - 1);
    node.scrollTo({
      left: node.clientWidth * safeIndex,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
    setActiveIndex(safeIndex);
  }

  function handleScroll() {
    const node = trackRef.current;
    if (!node) return;

    const nextIndex = Math.round(node.scrollLeft / node.clientWidth);
    setActiveIndex(Math.min(Math.max(nextIndex, 0), images.length - 1));
  }

  if (!images.length) {
    return (
      <div className={`${styles.root} ${overlayIndicators ? styles.overlay : ""} ${className}`.trim()}>
        <div className={`${styles.slide} ${styles.placeholder}`}>Фото отсутствует</div>
      </div>
    );
  }

  return (
    <div className={`${styles.root} ${overlayIndicators ? styles.overlay : ""} ${className}`.trim()}>
      <div
        ref={trackRef}
        className={styles.track}
        onScroll={handleScroll}
        role="group"
        aria-label={`${title} — фотографии`}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          scrollToIndex(displayedActiveIndex + (event.key === "ArrowRight" ? 1 : -1));
        }}
      >
        {images.map((src, index) => (
          <button
            key={`${src}-${index}`}
            type="button"
            className={styles.slide}
            disabled={!onImageClick}
            onClick={() => onImageClick?.(index)}
            aria-label={onImageClick ? `Открыть фото ${index + 1}` : undefined}
          >
            <Image
              src={src}
              alt={`${title} ${index + 1}`}
              fill
              sizes={sizes}
              className={`${styles.image} ${
                fit === "contain" ? styles.imageContain : ""
              }`.trim()}
              priority={index === 0}
            />
          </button>
        ))}
      </div>

      {overlayIndicators ? <span className={styles.status} role="status">Фото {displayedActiveIndex + 1} из {images.length}</span> : null}
      {images.length > 1 ? (
        <div className={styles.indicator} aria-hidden="true">
          {images.map((src, index) => (
            <span
              key={`${src}-indicator-${index}`}
              className={`${styles.indicatorPart} ${
                displayedActiveIndex === index ? styles.indicatorPartActive : ""
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
