"use client";

import { useState } from "react";
import Image from "next/image";

import { SectionHeader } from "./SectionHeader";
import type { ProductImageItem } from "../types";
import styles from "../ProductEditPage.module.css";

type UploadProgress = {
  done: number;
  total: number;
};

type Props = {
  images: ProductImageItem[];
  invalid?: boolean;
  uploading: boolean;
  reordering: boolean;
  dragImageId: number | null;
  uploadProgress: UploadProgress;
  onFilesChange: (files: File[]) => void;
  onUploadImages: (files: File[]) => void;
  onDragImageStart: (imageId: number) => void;
  onDragImageEnd: () => void;
  onMoveImage: (imageId: number) => void;
  onDeleteImage: (imageId: number) => void;
  onMoveImageByIndex: (fromIndex: number, toIndex: number) => void;
};

export function ProductImagesCard({
  images,
  invalid = false,
  uploading,
  reordering,
  dragImageId,
  uploadProgress,
  onFilesChange,
  onUploadImages,
  onDragImageStart,
  onDragImageEnd,
  onMoveImage,
  onDeleteImage,
  onMoveImageByIndex,
}: Props) {
  const [dragActive, setDragActive] = useState(false);

  function uploadFiles(files: File[]) {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length === 0 || uploading) {
      return;
    }

    onFilesChange(imageFiles);
    onUploadImages(imageFiles);
  }

  return (
    <section className={styles.card}>
      <SectionHeader
        title="Изображения"
        hint="Первое фото будет главным. Можно выбрать несколько файлов или перетащить их в область загрузки."
      />

      <div
        className={`${styles.dropZone} ${
          dragActive ? styles.dropZoneActive : ""
        } ${invalid ? styles.dropZoneInvalid : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          uploadFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <div>
          <strong>{uploading ? "Загружаем фото…" : "Перетащи фото сюда"}</strong>
          <span>
            {uploading
              ? `${uploadProgress.done} из ${uploadProgress.total}`
              : "JPG, PNG, WEBP. Можно выбрать сразу несколько файлов."}
          </span>
        </div>

        <label className={styles.filePicker}>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={uploading}
            onChange={(event) => {
              uploadFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
          <span>{uploading ? "Загрузка…" : "Выбрать фото"}</span>
        </label>
      </div>

      {uploading && uploadProgress.total > 0 ? (
        <div className={styles.progressTrack}>
          <div
            style={{
              width: `${Math.round(
                (uploadProgress.done / uploadProgress.total) * 100
              )}%`,
            }}
          />
        </div>
      ) : null}

      {invalid && images.length === 0 ? (
        <div className={styles.fieldErrorText}>
          Добавьте хотя бы одно фото товара.
        </div>
      ) : null}

      {images.length === 0 ? (
        <div className={styles.emptyBox}>Фото пока нет.</div>
      ) : (
        <div className={styles.imageGrid}>
          {images.map((image, index) => (
            <div
              key={image.id}
              draggable={!reordering}
              onDragStart={() => onDragImageStart(image.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => onMoveImage(image.id)}
              onDragEnd={onDragImageEnd}
              className={`${styles.imageCard} ${
                dragImageId === image.id ? styles.imageCardDragging : ""
              }`}
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="160px"
                className={styles.image}
              />

              {index === 0 ? (
                <div className={styles.mainImageBadge}>Главное</div>
              ) : null}

              <button
                type="button"
                onClick={() => onDeleteImage(image.id)}
                className={styles.imageDeleteBtn}
                aria-label="Удалить фото"
              >
                ×
              </button>

              <div className={styles.imageControls}>
                <button
                  type="button"
                  onClick={() => onMoveImageByIndex(index, index - 1)}
                  disabled={index === 0 || reordering}
                  className={styles.imageMoveBtn}
                  aria-label="Переместить фото левее"
                >
                  ←
                </button>

                <button
                  type="button"
                  onClick={() => onMoveImageByIndex(index, index + 1)}
                  disabled={index === images.length - 1 || reordering}
                  className={styles.imageMoveBtn}
                  aria-label="Переместить фото правее"
                >
                  →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
