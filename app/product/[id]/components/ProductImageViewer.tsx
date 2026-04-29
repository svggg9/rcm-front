"use client";

import Image from "next/image";
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
  if (!open || !images.length) return null;

  return (
    <div
      className={styles.viewer}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button type="button" className={styles.viewerClose} onClick={onClose}>
        ×
      </button>

      <button
        type="button"
        className={`${styles.viewerArrow} ${styles.viewerArrowLeft}`}
        onClick={(event) => {
          event.stopPropagation();
          onPrev();
        }}
      >
        ‹
      </button>

      <div
        className={styles.viewerBody}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.viewerImageWrap}>
          <Image
            src={images[currentIndex]}
            alt={`${title} ${currentIndex + 1}`}
            fill
            sizes="100vw"
            className={styles.viewerImage}
          />
        </div>

        <div className={styles.viewerFooter}>
          <div className={styles.viewerCounter}>
            {currentIndex + 1} / {images.length}
          </div>

          <div className={styles.viewerTrack}>
            <div
              className={styles.viewerProgress}
              style={{ transform: `translateX(${progress}%)` }}
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        className={`${styles.viewerArrow} ${styles.viewerArrowRight}`}
        onClick={(event) => {
          event.stopPropagation();
          onNext();
        }}
      >
        ›
      </button>
    </div>
  );
}