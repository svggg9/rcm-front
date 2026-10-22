"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Button } from "../../components/ui/Button";
import { ConfirmActionButton } from "../../components/ui/ConfirmActionButton";
import { DesignSystemIcon } from "../../components/ui/DesignSystemIcon";
import { Loader } from "../../components/ui/Loader";
import { RequestError } from "../../components/ui/RequestError";
import { SectionLoader } from "../../components/ui/SectionLoader";
import { toApiError } from "../../lib/apiErrors";
import { getImageUploadMetadataError, PHOTO_FILE_ACCEPT } from "../../lib/imageUploadPolicy";
import {
  deleteSellerBrandImage,
  getSellerBrandImages,
  reorderSellerBrandImages,
  SellerBrandFileError,
  uploadSellerBrandImage,
} from "../lib/sellerBrandApi";
import type { SellerBrandImage } from "../types";

import styles from "./SellerBrandImages.module.css";

type Props = {
  brandId: number;
  embedded?: boolean;
  onBusyChange?: (busy: boolean) => void;
};

type Operation =
  | { kind: "upload" }
  | { kind: "delete"; imageId: number }
  | { kind: "move"; imageId: number; direction: -1 | 1 };

const MAX_IMAGES = 8;

/** A new brand gets its own state; late requests cannot replace another brand's photographs. */
export function SellerBrandImages(props: Props) {
  return <BrandImages key={props.brandId} {...props} />;
}

function BrandImages({ brandId, embedded = false, onBusyChange }: Props) {
  const [images, setImages] = useState<SellerBrandImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mounted = useRef(false);
  const inFlight = useRef(false);
  const onBusyChangeRef = useRef(onBusyChange);

  useEffect(() => { onBusyChangeRef.current = onBusyChange; }, [onBusyChange]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      onBusyChangeRef.current?.(false);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void getSellerBrandImages(brandId)
      .then((data) => {
        if (!alive) return;
        setImages(data);
        setHasLoaded(true);
        setLoadError(null);
      })
      .catch((reason) => {
        if (alive) setLoadError(toApiError(reason, "Не удалось загрузить фотографии бренда").message);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [brandId, loadAttempt]);

  function beginOperation(next: Operation) {
    if (inFlight.current || loading || !hasLoaded) return false;
    inFlight.current = true;
    setOperation(next);
    setOperationError(null);
    onBusyChangeRef.current?.(true);
    return true;
  }

  function finishOperation() {
    inFlight.current = false;
    if (!mounted.current) return;
    setOperation(null);
    onBusyChangeRef.current?.(false);
  }

  async function upload(file: File | null) {
    if (!file || images.length >= MAX_IMAGES || inFlight.current || loading || !hasLoaded) return;
    const validationMessage = getImageUploadMetadataError(file);
    if (validationMessage) {
      setOperationError(validationMessage);
      return;
    }
    if (!beginOperation({ kind: "upload" })) return;
    try {
      const image = await uploadSellerBrandImage(brandId, file);
      if (mounted.current) setImages((current) => [...current, image]);
    } catch (reason) {
      if (mounted.current) setOperationError(reason instanceof SellerBrandFileError
        ? reason.message : toApiError(reason, "Не удалось загрузить фотографию — попробуйте ещё раз").message);
    } finally {
      finishOperation();
    }
  }

  async function remove(image: SellerBrandImage) {
    if (!beginOperation({ kind: "delete", imageId: image.id })) {
      throw toApiError(null, "Дождитесь завершения текущего действия");
    }
    try {
      await deleteSellerBrandImage(brandId, image.id);
      if (mounted.current) setImages((current) => current.filter((item) => item.id !== image.id));
    } catch (reason) {
      // ConfirmActionButton keeps the dialog open and displays this safe error.
      throw toApiError(reason, "Не удалось удалить фотографию — попробуйте ещё раз");
    } finally {
      finishOperation();
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= images.length) return;
    const image = images[index];
    if (!beginOperation({ kind: "move", imageId: image.id, direction })) return;
    const previous = images;
    const next = [...images];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setImages(next);
    try {
      await reorderSellerBrandImages(brandId, next.map((item) => item.id));
    } catch (reason) {
      if (mounted.current) {
        setImages(previous);
        setOperationError(toApiError(reason, "Не удалось изменить порядок фотографий — попробуйте ещё раз").message);
      }
    } finally {
      finishOperation();
    }
  }

  const disabled = loading || operation !== null;
  const uploading = operation?.kind === "upload";
  const uploadControl = (
    <button type="button"
      className={`${styles.upload} ${images.length ? styles.uploadTile : styles.uploadEmpty}`}
      disabled={disabled}
      aria-label="Добавить фотографию бренда"
      aria-busy={uploading || undefined}
      onClick={() => inputRef.current?.click()}>
      {uploading ? <Loader inline label="Загрузка фотографии" /> : <DesignSystemIcon name="plus" role="interface" />}
      <span className={uploading ? "visuallyHidden" : undefined}>Добавить фото</span>
    </button>
  );

  return <section className={`${styles.section} ${embedded ? styles.embedded : ""}`} aria-label="Фотографии бренда">
    <header className={styles.heading}>
      <div className={styles.titleRow}>
        <h2>Фотографии бренда</h2>
        {hasLoaded ? <span className={styles.count} aria-label={`${images.length} из ${MAX_IMAGES} фотографий`}>{images.length} / {MAX_IMAGES}</span> : null}
        {loading && hasLoaded ? <Loader inline label="Обновление фотографий" /> : null}
      </div>
      <div className={styles.metaRow}>
        <p className={styles.meta}>До 8 фото · JPEG, PNG или WebP · до 10 МБ</p>
        <p className={styles.savedHint}>Изменения сохраняются сразу</p>
      </div>
      <p className={styles.meta}>Исходник сохраняется, версия для показа оптимизируется автоматически</p>
    </header>

    <input ref={inputRef} type="file" accept={PHOTO_FILE_ACCEPT}
      className="visuallyHidden" tabIndex={-1} aria-label="Файл фотографии бренда"
      disabled={disabled || images.length >= MAX_IMAGES}
      onChange={(event) => {
        const file = event.currentTarget.files?.[0] ?? null;
        event.currentTarget.value = "";
        void upload(file);
      }} />

    {loadError ? <RequestError variant="inline" message={loadError}
      loading={loading} disabled={operation !== null}
      onRetry={() => setLoadAttempt((value) => value + 1)} /> : null}
    {operationError ? <RequestError variant="inline" message={operationError} /> : null}

    {!hasLoaded && loading && !loadError ? <SectionLoader compact label="Загрузка фотографий бренда" /> : null}
    {hasLoaded ? images.length ? <div className={styles.grid}>
      {images.map((image, index) => <article className={styles.card} key={image.id}>
        <div className={styles.media}>
          <Image src={image.imageUrl} alt={`Фотография бренда ${index + 1}`} fill
            sizes="(max-width: 640px) calc((100vw - 48px) / 2), (max-width: 1000px) 42vw, 360px" />
        </div>
        <div className={styles.toolbar}>
          <span className={styles.number} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <div className={styles.actions}>
            <Button variant="utility" className={styles.iconButton} reserveLabelSpace={false}
              disabled={index === 0 || disabled}
              loading={operation?.kind === "move" && operation.imageId === image.id && operation.direction === -1}
              onClick={() => void move(index, -1)} aria-label={`Переместить фотографию ${index + 1} влево`}>
              <DesignSystemIcon name="chevron-left" role="utility" />
            </Button>
            <Button variant="utility" className={styles.iconButton} reserveLabelSpace={false}
              disabled={index === images.length - 1 || disabled}
              loading={operation?.kind === "move" && operation.imageId === image.id && operation.direction === 1}
              onClick={() => void move(index, 1)} aria-label={`Переместить фотографию ${index + 1} вправо`}>
              <DesignSystemIcon name="chevron-right" role="utility" />
            </Button>
            <ConfirmActionButton variant="utility" className={`${styles.iconButton} ${styles.deleteButton}`} reserveLabelSpace={false}
              disabled={disabled} confirmTitle="Удалить фотографию?"
              confirmText="Фотография исчезнет со страницы бренда"
              onConfirm={() => remove(image)} aria-label={`Удалить фотографию ${index + 1}`}>
              <DesignSystemIcon name="trash" role="utility" />
            </ConfirmActionButton>
          </div>
        </div>
      </article>)}
      {images.length < MAX_IMAGES ? uploadControl : null}
    </div> : uploadControl : null}

    <details className={styles.requirements}>
      <summary>Требования к фото<DesignSystemIcon name="chevron-down" role="utility" /></summary>
      <p>На компьютере кадр обрезается до 16:7, на телефоне — до 4:5. Размещайте важные детали ближе к центру</p>
      <p>Размер файла уменьшается автоматически. Стрелки меняют порядок фотографий на странице бренда</p>
    </details>
  </section>;
}
