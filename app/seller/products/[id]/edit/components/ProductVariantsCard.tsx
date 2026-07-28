import { useState } from "react";
import Image from "next/image";

import { SectionHeader } from "./SectionHeader";
import type { ProductImageItem, ProductVariant } from "../types";
import styles from "../ProductEditPage.module.css";

type VariantValidationErrors = Record<
  number,
  {
    sku?: boolean;
    sizeId?: boolean;
    colorId?: boolean;
    price?: boolean;
    availableQuantity?: boolean;
  }
>;

type UploadProgress = {
  done: number;
  total: number;
};

type Props = {
  variants: ProductVariant[];
  images: ProductImageItem[];
  validationErrors: VariantValidationErrors;
  invalidImages?: boolean;
  uploading: boolean;
  reordering: boolean;
  dragImageId: number | null;
  uploadProgress: UploadProgress;
  onUpdateVariant: (index: number, patch: Partial<ProductVariant>) => void;
  onAddVariant: (base?: Partial<ProductVariant>) => void;
  onRemoveVariant: (index: number) => void;
  onFilesChange: (files: File[]) => void;
  onUploadImages: (files: File[], colorwayId?: number | null) => void;
  onDragImageStart: (imageId: number) => void;
  onDragImageEnd: () => void;
  onMoveImage: (imageId: number) => void;
  onDeleteImage: (imageId: number) => void;
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function formatPrice(value: number) {
  if (!value) return "";

  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function ProductVariantsCard({
  variants,
  images,
  validationErrors,
  invalidImages = false,
  uploading,
  reordering,
  dragImageId,
  uploadProgress,
  onUpdateVariant,
  onAddVariant,
  onRemoveVariant,
  onFilesChange,
  onUploadImages,
  onDragImageStart,
  onDragImageEnd,
  onMoveImage,
  onDeleteImage,
}: Props) {
  const [dragActive, setDragActive] = useState(false);
  const baseVariant = variants[0] ?? null;

  function uploadFiles(files: File[]) {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length === 0 || uploading) {
      return;
    }

    setDragActive(false);
    onFilesChange(imageFiles);
    onUploadImages(imageFiles);
  }

  function addSizeRow() {
    onAddVariant({
      groupKey: baseVariant?.groupKey ?? "simple-product",
      colorwayId: baseVariant?.colorwayId ?? null,
      colorId: "",
      color: "",
      price: baseVariant?.price ?? 0,
      availableQuantity: baseVariant?.availableQuantity ?? null,
      sellerArticle: baseVariant?.sellerArticle ?? "",
      stockTrackingEnabled: true,
    });
  }

  function removeSizeRow(index: number) {
    onRemoveVariant(index);
  }

  function updateSellerArticle(value: string) {
    variants.forEach((_, index) => {
      onUpdateVariant(index, { sellerArticle: value });
    });
  }

  return (
    <>
      <section className={styles.card}>
        <SectionHeader
          title="Фото товара"
          hint="Главное фото будет первым в карточке товара."
        />

        <div className={styles.variantSimpleBlock}>
          <div
          className={`${styles.variantImageDropZone} ${
            dragActive ? styles.dropZoneActive : ""
          } ${invalidImages && images.length === 0 ? styles.dropZoneInvalid : ""}`}
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
            uploadFiles(Array.from(event.dataTransfer.files));
          }}
        >
          <div>
            <strong>Фото товара</strong>
            <span>
              {uploading && uploadProgress.total > 0
                ? `${uploadProgress.done} из ${uploadProgress.total}`
                : "Перетащи фото сюда или выбери файл"}
            </span>
          </div>

          <label className={`${styles.filePicker} buttonPrimary`}>
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
            <span className="buttonContent">Выбрать фото</span>
          </label>
        </div>

        {images.length > 0 ? (
          <div className={styles.variantImageGrid}>
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
                  sizes="140px"
                  className={styles.image}
                />

                {index === 0 ? (
                  <div className={styles.mainImageBadge}>Главное</div>
                ) : null}

                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => onDeleteImage(image.id)}
                  className={styles.imageDeleteBtn}
                  aria-label="Удалить фото"
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true" className={styles.variantActionIcon}>
                    <path d="M4.5 4.5L11.5 11.5M11.5 4.5L4.5 11.5" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : null}
        </div>
      </section>

      <section className={styles.card}>
        <SectionHeader
          title="Параметры товара"
          hint="Размер, цена и остатки."
        />

        <div className={styles.variantSimpleBlock}>

          {baseVariant ? (
          <label className={`${styles.field} ${styles.fieldFull}`}>
            <span>Артикул продавца</span>
            <input
              value={baseVariant.sellerArticle ?? ""}
              onChange={(event) => updateSellerArticle(event.target.value)}
              className={styles.input}
            />
          </label>
        ) : null}

        <div className={styles.variantSizeList}>
          {variants.map((variant, index) => {
            const errors = validationErrors[index] ?? {};

            return (
              <div key={variant.id ?? variant.clientKey ?? `new-${index}`} className={styles.variantSizeRow}>
                <label className={`${styles.field} ${styles.priceField}`}>
                  <span className={styles.required}>Цена</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formatPrice(variant.price)}
                    onChange={(event) =>
                      onUpdateVariant(index, {
                        price:
                          digitsOnly(event.target.value) === ""
                            ? 0
                            : Number(digitsOnly(event.target.value)),
                      })
                    }
                    className={`${styles.input} ${
                      errors.price ? styles.fieldInvalid : ""
                    } ${variant.price > 0 ? "" : styles.requiredEmpty}`}
                  />
                  <span className={styles.priceInlineSuffix} aria-hidden="true">
                    <span className={styles.priceMirror}>
                      {formatPrice(variant.price)}
                    </span>
                    {variant.price > 0 ? (
                      <span className={styles.priceSuffix}>₽</span>
                    ) : null}
                  </span>
                </label>

                <div className={styles.variantSizeField}>
                  <label className={styles.field}>
                    <span>Размер</span>
                    <input
                      value={variant.size}
                      onChange={(event) =>
                        onUpdateVariant(index, {
                          sizeId: "",
                          size: event.target.value,
                        })
                      }
                      className={`${styles.input} ${
                        errors.sizeId ? styles.fieldInvalid : ""
                      }`}
                    />
                  </label>
                </div>

                <div className={`${styles.field} ${styles.quantityField}`}>
                  <span>Количество</span>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => removeSizeRow(index)}
                    className={styles.variantSizeDeleteBtn}
                    aria-label="Удалить размер"
                  >
                    <svg viewBox="0 0 16 16" aria-hidden="true" className={styles.variantActionIcon}>
                      <path d="M4.5 4.5L11.5 11.5M11.5 4.5L4.5 11.5" />
                    </svg>
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={variant.availableQuantity ?? ""}
                    onChange={(event) =>
                      onUpdateVariant(index, {
                        availableQuantity:
                          digitsOnly(event.target.value) === ""
                            ? null
                            : Number(digitsOnly(event.target.value)),
                        stockTrackingEnabled: digitsOnly(event.target.value) !== "",
                      })
                    }
                    className={`${styles.input} ${
                      errors.availableQuantity ? styles.fieldInvalid : ""
                    }`}
                  />
                </div>

              </div>
            );
          })}

          <button
            type="button"
            onClick={addSizeRow}
            className={styles.variantAddSizeBtn}
          >
            Добавить размер
          </button>
        </div>
      </div>
      </section>
    </>
  );
}
