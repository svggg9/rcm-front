"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { Icon } from "../../../components/ui/Icon";
import styles from "../ProductPage.module.css";

type Props = {
  open: boolean;
  title: string;
  images: string[];
  currentIndex: number;
  progress: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export function ProductImageViewer({
  open,
  title,
  images,
  currentIndex,
  progress,
  onClose,
  onPrev,
  onNext,
}: Props) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    return () => {
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open || !images.length) return null;

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];

    touchStartRef.current = null;

    if (!start || images.length <= 1) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (Math.abs(deltaX) < 42 || Math.abs(deltaX) < Math.abs(deltaY)) return;

    if (deltaX < 0) {
      onNext();
    } else {
      onPrev();
    }
  }

  return (
    <div
      className={styles.viewer}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — просмотр фотографий`}
    >
      <button
        ref={closeButtonRef}
        type="button"
        className={styles.viewerClose}
        onClick={onClose}
        aria-label="Закрыть просмотр"
      >
        <Icon name="x" size={24} strokeWidth={1.35} />
      </button>

      <div
        className={styles.viewerBody}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.viewerStage}>
          {images.length > 1 ? (
            <button
              type="button"
              className={`${styles.viewerArrow} ${styles.viewerArrowLeft}`}
              onClick={(event) => {
                event.stopPropagation();
                onPrev();
              }}
              aria-label="Предыдущее фото"
            >
              <Icon name="chevron-left" size={28} strokeWidth={1.25} />
            </button>
          ) : (
            <span className={styles.viewerArrowSpacer} aria-hidden="true" />
          )}

          <div
            className={styles.viewerImageWrap}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className={styles.viewerImageSlider}
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {images.map((image, index) => (
                <div className={styles.viewerImageSlide} key={`${image}-${index}`}>
                  <Image
                    src={image}
                    alt={`${title} ${index + 1}`}
                    fill
                    sizes="100vw"
                    className={styles.viewerImage}
                    priority={index === currentIndex}
                  />
                </div>
              ))}
            </div>
          </div>

          {images.length > 1 ? (
            <button
              type="button"
              className={`${styles.viewerArrow} ${styles.viewerArrowRight}`}
              onClick={(event) => {
                event.stopPropagation();
                onNext();
              }}
              aria-label="Следующее фото"
            >
              <Icon name="chevron-right" size={28} strokeWidth={1.25} />
            </button>
          ) : (
            <span className={styles.viewerArrowSpacer} aria-hidden="true" />
          )}
        </div>

        <div className={styles.viewerFooter}>
          <div className={styles.viewerTrack}>
            <div
              className={styles.viewerProgress}
              style={{
                width: `${100 / images.length}%`,
                maxWidth: `${100 / images.length}%`,
                transform: `translateX(${progress * (images.length - 1)}%)`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
