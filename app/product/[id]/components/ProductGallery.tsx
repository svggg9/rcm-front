"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { ProductImageCarousel } from "../../../components/ProductImageCarousel/ProductImageCarousel";
import styles from "../ProductPage.module.css";

type Props = {
  title: string;
  images: string[];
  onOpenImage: (index: number) => void;
};

export function ProductGallery({ title, images, onOpenImage }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const thumbsRef = useRef<HTMLDivElement | null>(null);
  const activeImage = images[activeIndex] ?? images[0];
  const hasThumbScroll = images.length > 4;

  const updateScrollState = useCallback(() => {
    const node = thumbsRef.current;
    if (!node) return;

    const maxScrollTop = node.scrollHeight - node.clientHeight;

    setCanScrollUp(node.scrollTop > 4);
    setCanScrollDown(node.scrollTop < maxScrollTop - 4);
  }, []);

  useEffect(() => {
    thumbsRef.current?.scrollTo({ top: 0 });
  }, [images]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(updateScrollState);

    return () => window.cancelAnimationFrame(frame);
  }, [images.length, updateScrollState]);

  function scrollThumbs(direction: "up" | "down") {
    thumbsRef.current?.scrollBy({
      top: direction === "down" ? 170 : -170,
      behavior: "smooth",
    });
  }

  if (images.length === 0) {
    return (
      <div className={styles.gallery}>
        <div className={styles.galleryMain}>
          <div className={styles.galleryPlaceholder}>Фото отсутствует</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.gallery}>
      <div className={styles.galleryThumbsWrap}>
        {hasThumbScroll && canScrollUp ? (
          <button
            type="button"
            className={`${styles.galleryThumbScroll} ${styles.galleryThumbScrollTop}`}
            onClick={() => scrollThumbs("up")}
            aria-label="Показать предыдущие фото"
          >
            <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
              <path d="M4 10L8 6L12 10" />
            </svg>
          </button>
        ) : null}

        <div
          ref={thumbsRef}
          className={styles.galleryThumbs}
          aria-label="Фотографии товара"
          onScroll={updateScrollState}
        >
          {images.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              className={`${styles.galleryThumb} ${
                activeIndex === index ? styles.galleryThumbActive : ""
              }`.trim()}
              onClick={() => setActiveIndex(index)}
              aria-label={`Показать фото ${index + 1}`}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="120px"
                className={styles.galleryImg}
              />
            </button>
          ))}
        </div>

        {hasThumbScroll && canScrollDown ? (
          <button
            type="button"
            className={`${styles.galleryThumbScroll} ${styles.galleryThumbScrollBottom}`}
            onClick={() => scrollThumbs("down")}
            aria-label="Показать следующие фото"
          >
            <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
              <path d="M4 6L8 10L12 6" />
            </svg>
          </button>
        ) : null}
      </div>

      <button
        type="button"
        className={`${styles.galleryMain} ${styles.galleryButton}`}
        onClick={() => onOpenImage(activeIndex)}
      >
        <Image
          src={activeImage}
          alt={`${title} ${activeIndex + 1}`}
          fill
          sizes="(max-width: 1100px) 100vw, 56vw"
          className={styles.galleryImg}
          priority
        />
      </button>

      <div className={styles.galleryMobile}>
        <ProductImageCarousel
          title={title}
          images={images}
          onImageClick={onOpenImage}
        />
      </div>
    </div>
  );
}
