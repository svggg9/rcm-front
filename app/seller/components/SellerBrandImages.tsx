"use client";
import { ConfirmActionButton } from "../../components/ui/ConfirmActionButton";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Button } from "../../components/ui/Button";
import { DesignSystemIcon } from "../../components/ui/DesignSystemIcon";
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
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    void getSellerBrandImages(brandId)
      .then((data) => {
        if (alive) setImages(data);
      })
      .catch((error) => {
        if (alive) setError(error instanceof Error ? error.message : "Не удалось загрузить фотографии");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [brandId, loadAttempt]);

  async function upload(file: File | null) {
    if (!file || uploading || busyId !== null || images.length >= 8) return;
    setError(null);
    setUploading(true);
    try {
      const image = await uploadSellerBrandImage(brandId, file);
      setImages((current) => [...current, image]);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось загрузить фото");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(image: SellerBrandImage) {
    if (busyId !== null || uploading) return;
    setError(null);
    setBusyId(image.id);
    try {
      await deleteSellerBrandImage(brandId, image.id);
      setImages((current) => current.filter((item) => item.id !== image.id));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось удалить фото");
    } finally {
      setBusyId(null);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    if (busyId !== null || uploading) return;
    setError(null);
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
      setError(error instanceof Error ? error.message : "Не удалось изменить порядок");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className={styles.gallerySection}>
      <div className={styles.sectionHeadingRow}>
        <div className={styles.sectionHeading}>
          <div>
            <h2>Фотографии бренда</h2>
            <p>До 8 фотографий — JPEG или WebP, до 8 МБ каждая</p>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          className={styles.galleryAction}
          disabled={loading || busyId !== null || images.length >= 8}
          loading={uploading}
          reserveLabelSpace
          title={images.length >= 8 ? "Можно добавить не более 8 фотографий" : undefined}
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

      {error ? <div className={styles.error} role="alert"><span>{error}</span>
        <Button type="button" variant="ghost" disabled={loading || uploading || busyId !== null}
          onClick={() => setLoadAttempt((value) => value + 1)}>Обновить список</Button>
      </div> : null}

      {loading ? (
        <div className={styles.loading} role="status" aria-label="Загружаем фотографии" aria-busy="true"><span className="buttonLoader" aria-hidden="true" /></div>
      ) : images.length ? (
        <div className={styles.brandImageGrid}>
          {images.map((image, index) => (
            <article className={styles.brandImageCard} key={image.id}>
              <div className={styles.brandImageMedia}>
                <Image
                  src={image.imageUrl}
                  alt={`Фотография бренда ${index + 1}`}
                  fill
                  sizes="(max-width: 700px) 45vw, 220px"
                />
              </div>
              <div className={styles.brandImageActions}>
                <button
                  type="button"
                  disabled={index === 0 || busyId !== null || uploading}
                  onClick={() => void move(index, -1)}
                  aria-label="Переместить фотографию влево"
                >
                  <DesignSystemIcon name="chevron-left" role="utility" />
                </button>
                <button
                  type="button"
                  disabled={index === images.length - 1 || busyId !== null || uploading}
                  onClick={() => void move(index, 1)}
                  aria-label="Переместить фотографию вправо"
                >
                  <DesignSystemIcon name="chevron-right" role="utility" />
                </button>
                <ConfirmActionButton
                  type="button"
                  disabled={busyId !== null || uploading}
                  confirmTitle="Удалить фотографию?"
                  confirmText="Фотография исчезнет со страницы бренда"
                  onConfirm={() => remove(image)}
                  aria-label="Удалить фотографию"
                >
                  {busyId === image.id ? <span className="buttonLoader" aria-hidden="true" /> : <DesignSystemIcon name="x" role="utility" />}
                </ConfirmActionButton>
              </div>
            </article>
          ))}
        </div>
      ) : !error ? (
        <div className={styles.galleryEmpty}>
          <DesignSystemIcon name="grid" role="empty" />
          <strong>Фотографий пока нет</strong>
        </div>
      ) : null}
    </section>
  );
}
