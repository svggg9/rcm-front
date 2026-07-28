"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import styles from "./BrandPage.module.css";

type BrandImage = {
  id: number;
  imageUrl: string;
  sortOrder: number;
};

export function BrandImageCarousel({ images }: { images: BrandImage[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % images.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [images.length]);

  if (!images.length) return null;

  return (
    <section className={styles.brandCarousel} aria-label="Фотографии бренда">
      <div
        className={styles.brandCarouselTrack}
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {images.map((image, imageIndex) => (
          <div className={styles.brandCarouselSlide} key={image.id}>
            <Image
              src={image.imageUrl}
              alt=""
              fill
              priority={imageIndex === 0}
              sizes="(max-width: 768px) 100vw, 1440px"
            />
          </div>
        ))}
      </div>
      {images.length > 1 ? (
        <div className={styles.brandCarouselDots}>
          {images.map((image, dotIndex) => (
            <button
              type="button"
              key={image.id}
              className={
                dotIndex === index ? styles.brandCarouselDotActive : ""
              }
              onClick={() => setIndex(dotIndex)}
              aria-label={`Показать фотографию ${dotIndex + 1}`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
