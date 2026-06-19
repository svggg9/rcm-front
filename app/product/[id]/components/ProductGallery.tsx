"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";

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
  const mobileTrackRef = useRef<HTMLDivElement | null>(null);
  const mobileTouchStartXRef = useRef(0);
  const mobileTouchStartIndexRef = useRef(0);
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
    mobileTrackRef.current?.scrollTo({ left: 0 });
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

  function scrollMobileToIndex(index: number) {
    const node = mobileTrackRef.current;
    if (!node) return;

    const safeIndex = Math.min(Math.max(index, 0), images.length - 1);
    node.scrollTo({
      left: node.clientWidth * safeIndex,
      behavior: "smooth",
    });
    setActiveIndex(safeIndex);
  }

  function handleMobileScroll() {
    const node = mobileTrackRef.current;
    if (!node) return;

    const nextIndex = Math.round(node.scrollLeft / node.clientWidth);
    setActiveIndex(Math.min(Math.max(nextIndex, 0), images.length - 1));
  }

  function handleMobileTouchStart(event: TouchEvent<HTMLDivElement>) {
    mobileTouchStartXRef.current = event.touches[0]?.clientX ?? 0;
    mobileTouchStartIndexRef.current = activeIndex;
  }

  function handleMobileTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const endX = event.changedTouches[0]?.clientX ?? mobileTouchStartXRef.current;
    const deltaX = mobileTouchStartXRef.current - endX;
    const swipeThreshold = 36;
    let nextIndex = mobileTouchStartIndexRef.current;

    if (deltaX > swipeThreshold) {
      nextIndex += 1;
    } else if (deltaX < -swipeThreshold) {
      nextIndex -= 1;
    }

    window.requestAnimationFrame(() => scrollMobileToIndex(nextIndex));
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

        <span className={styles.zoomBadge} aria-hidden="true">
          <Image src="/icons/search.svg" alt="" width={16} height={16} />
        </span>
      </button>

      <div className={styles.galleryMobile}>
        <div
          ref={mobileTrackRef}
          className={styles.galleryMobileTrack}
          onScroll={handleMobileScroll}
          onTouchStart={handleMobileTouchStart}
          onTouchEnd={handleMobileTouchEnd}
        >
          {images.map((src, index) => (
            <button
              key={`${src}-mobile-${index}`}
              type="button"
              className={`${styles.galleryMobileSlide} ${styles.galleryButton}`}
              onClick={() => onOpenImage(index)}
              aria-label={`Открыть фото ${index + 1}`}
            >
              <Image
                src={src}
                alt={`${title} ${index + 1}`}
                fill
                sizes="100vw"
                className={styles.galleryImg}
                priority={index === 0}
              />
            </button>
          ))}
        </div>

        {images.length > 1 ? (
          <div className={styles.galleryMobileIndicator} aria-hidden="true">
            {images.map((src, index) => (
              <span
                key={`${src}-indicator-${index}`}
                className={`${styles.galleryMobileIndicatorPart} ${
                  activeIndex === index
                    ? styles.galleryMobileIndicatorPartActive
                    : ""
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
