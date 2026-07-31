"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type TouchEvent } from "react";

import styles from "./ProductImageCarousel.module.css";

type Props = {
  title: string;
  images: string[];
  onImageClick?: (index: number) => void;
  className?: string;
  fit?: "cover" | "contain";
};

export function ProductImageCarousel({
  title,
  images,
  onImageClick,
  className = "",
  fit = "cover",
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const touchStartXRef = useRef(0);
  const touchStartIndexRef = useRef(0);
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
      behavior: "smooth",
    });
    setActiveIndex(safeIndex);
  }

  function handleScroll() {
    const node = trackRef.current;
    if (!node) return;

    const nextIndex = Math.round(node.scrollLeft / node.clientWidth);
    setActiveIndex(Math.min(Math.max(nextIndex, 0), images.length - 1));
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartXRef.current = event.touches[0]?.clientX ?? 0;
    touchStartIndexRef.current = displayedActiveIndex;
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const endX = event.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const deltaX = touchStartXRef.current - endX;
    let nextIndex = touchStartIndexRef.current;

    if (deltaX > 36) nextIndex += 1;
    if (deltaX < -36) nextIndex -= 1;

    window.requestAnimationFrame(() => scrollToIndex(nextIndex));
  }

  if (!images.length) {
    return (
      <div className={`${styles.root} ${className}`.trim()}>
        <div className={`${styles.slide} ${styles.placeholder}`}>Фото отсутствует</div>
      </div>
    );
  }

  return (
    <div className={`${styles.root} ${className}`.trim()}>
      <div
        ref={trackRef}
        className={styles.track}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
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
              sizes="(max-width: 768px) 100vw, 240px"
              className={`${styles.image} ${
                fit === "contain" ? styles.imageContain : ""
              }`.trim()}
              priority={index === 0}
            />
          </button>
        ))}
      </div>

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
