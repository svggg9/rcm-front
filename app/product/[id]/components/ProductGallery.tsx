"use client";

import styles from "../ProductPage.module.css";

type Props = {
  title: string;
  images: string[];
  onOpenImage: (index: number) => void;
};

export function ProductGallery({ title, images, onOpenImage }: Props) {
  const topImages = images.slice(0, 2);
  const bottomImages = images.slice(2, 6);
  const bottomCount = bottomImages.length;

  return (
    <div className={styles.gallery}>
      <div className={styles.galleryTop}>
        {topImages.map((src, index) => (
          <button
            key={`${src}-${index}`}
            type="button"
            className={`${styles.galleryLarge} ${styles.galleryButton}`}
            onClick={() => onOpenImage(index)}
          >
            <img
              src={src}
              alt={`${title} ${index + 1}`}
              className={styles.galleryImg}
            />
            <span className={styles.zoomBadge} aria-hidden="true">
              <img src="/icons/search.svg" alt="" />
            </span>
          </button>
        ))}
      </div>

      {bottomImages.length > 0 ? (
        <div
          className={`${styles.galleryBottom} ${
            bottomCount === 1
              ? styles.bottom1
              : bottomCount === 2
              ? styles.bottom2
              : bottomCount === 3
              ? styles.bottom3
              : styles.bottom4
          }`}
        >
          {bottomImages.map((src, index) => (
            <button
              key={`${src}-${index + 2}`}
              type="button"
              className={`${styles.gallerySmall} ${styles.galleryButton}`}
              onClick={() => onOpenImage(index + 2)}
            >
              <img
                src={src}
                alt={`${title} ${index + 3}`}
                className={styles.galleryImg}
              />
              <span className={styles.zoomBadge} aria-hidden="true">
                <img src="/icons/search.svg" alt="" />
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}