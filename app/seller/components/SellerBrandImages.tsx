"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import {
  deleteSellerBrandImage,
  getSellerBrandImages,
  reorderSellerBrandImages,
  uploadSellerBrandImage,
} from "../lib/sellerBrandApi";
import type { SellerBrandImage } from "../types";

import styles from "./SellerBrandTab.module.css";

export function SellerBrandImages({ brandId }: { brandId: number }) {
  const [images, setImages] = useState<SellerBrandImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let alive = true;
    void getSellerBrandImages(brandId)
      .then((data) => {
        if (alive) setImages(data);
      })
      .catch((error) => {
        if (alive) toast.error(error instanceof Error ? error.message : "Ошибка");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [brandId]);

  async function upload(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const image = await uploadSellerBrandImage(brandId, file);
      setImages((current) => [...current, image]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось загрузить фото");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(image: SellerBrandImage) {
    setBusyId(image.id);
    try {
      await deleteSellerBrandImage(brandId, image.id);
      setImages((current) => current.filter((item) => item.id !== image.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось удалить фото");
    } finally {
      setBusyId(null);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= images.length) return;
    const previous = images;
    const next = [...images];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setImages(next);
    setBusyId(next[nextIndex].id);
    try {
      await reorderSellerBrandImages(brandId, next.map((image) => image.id));
    } catch (error) {
      setImages(previous);
      toast.error(error instanceof Error ? error.message : "Не удалось изменить порядок");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className={styles.gallerySection}>
      <div className={styles.sectionHeadingRow}>
        <div className={styles.sectionHeading}>
          <span className={styles.sectionNumber}>02</span>
          <div>
            <h2>Фотографии бренда</h2>
            <p>До 8 изображений для страницы бренда и подборок.</p>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          className={styles.galleryAction}
          disabled={uploading || loading || images.length >= 8}
          loading={uploading}
          onClick={() => inputRef.current?.click()}
        >
          Добавить фото
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.webp,image/jpeg,image/webp"
          className={styles.logoInput}
          onChange={(event) => void upload(event.target.files?.[0] ?? null)}
        />
      </div>

      {loading ? (
        <div className={styles.galleryEmpty}>Загружаем фотографии…</div>
      ) : images.length ? (
        <div className={styles.brandImageGrid}>
          {images.map((image, index) => (
            <article className={styles.brandImageCard} key={image.id}>
              <div className={styles.brandImageMedia}>
                <Image
                  src={image.imageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 700px) 45vw, 220px"
                />
              </div>
              <div className={styles.brandImageActions}>
                <button
                  type="button"
                  disabled={index === 0 || busyId !== null}
                  onClick={() => void move(index, -1)}
                  aria-label="Переместить фотографию влево"
                >
                  <Icon name="chevron-left" size={16} />
                </button>
                <button
                  type="button"
                  disabled={index === images.length - 1 || busyId !== null}
                  onClick={() => void move(index, 1)}
                  aria-label="Переместить фотографию вправо"
                >
                  <Icon name="chevron-right" size={16} />
                </button>
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => void remove(image)}
                  aria-label="Удалить фотографию"
                >
                  <Icon name="x" size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.galleryEmpty}>
          Добавьте первое изображение бренда. JPEG или WebP до 8 МБ.
        </div>
      )}
    </section>
  );
}
