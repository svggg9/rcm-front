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
  mediaDisabled: boolean;
  variantStructureDisabled: boolean;
  operationalDisabled: boolean;
  mediaDisabledHint?: string;
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
  mediaDisabled,
  variantStructureDisabled,
  operationalDisabled,
  mediaDisabledHint,
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

    if (imageFiles.length === 0 || mediaDisabled) {
      setDragActive(false);
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
            aria-busy={uploading || undefined}
            className={`${styles.variantImageDropZone} ${
              dragActive ? styles.dropZoneActive : ""
            } ${invalidImages && images.length === 0 ? styles.dropZoneInvalid : ""} ${
              mediaDisabled ? styles.controlDisabled : ""
            }`}
            data-validation-error={
              invalidImages && images.length === 0 ? "true" : undefined
            }
            onDragEnter={(event) => {
              event.preventDefault();
              if (!mediaDisabled) setDragActive(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              if (!mediaDisabled) setDragActive(true);
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
              <strong>{uploading ? "Загружаем фото…" : "Фото товара"}</strong>
              <span>
                {uploading && uploadProgress.total > 0
                  ? `${uploadProgress.total} ${pluralizePhotos(uploadProgress.total)} — не закрывайте страницу`
                  : mediaDisabled && mediaDisabledHint
                    ? mediaDisabledHint
                    : "Перетащи фото сюда или выбери файл"}
              </span>
            </div>

            <label
              className={`${styles.filePicker} buttonPrimary ${
                uploading ? styles.filePickerLoading : ""
              } ${mediaDisabled ? styles.controlDisabled : ""}`}
              aria-disabled={mediaDisabled || undefined}
              aria-label={uploading ? "Фото загружаются" : "Выбрать фото"}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={mediaDisabled}
                onChange={(event) => {
                  uploadFiles(Array.from(event.target.files ?? []));
                  event.target.value = "";
                }}
              />
              <span className={`buttonContent ${styles.uploadButtonContent}`}>
                {uploading ? (
                  <>
                    <span className="buttonLoader" aria-hidden="true" />
                    Загрузка…
                  </>
                ) : (
                  "Выбрать фото"
                )}
              </span>
            </label>
          </div>

          {uploading ? (
            <div className={styles.uploadProgress} role="status">
              <span />
            </div>
          ) : null}

          {images.length > 0 ? (
            <div className={styles.variantImageGrid}>
              {images.map((image, index) => (
                <div
                  key={image.id}
                  draggable={!mediaDisabled && !reordering}
                  onDragStart={() => {
                    if (!mediaDisabled) onDragImageStart(image.id);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (!mediaDisabled) onMoveImage(image.id);
                  }}
                  onDragEnd={onDragImageEnd}
                  className={`${styles.imageCard} ${
                    dragImageId === image.id ? styles.imageCardDragging : ""
                  } ${mediaDisabled ? styles.controlDisabled : ""}`}
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
                    disabled={mediaDisabled}
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
              disabled={operationalDisabled}
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
                    aria-invalid={errors.price ? "true" : undefined}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    disabled={operationalDisabled}
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
                      aria-invalid={errors.sizeId ? "true" : undefined}
                      disabled={variantStructureDisabled}
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
                    disabled={variantStructureDisabled}
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
                    aria-invalid={errors.availableQuantity ? "true" : undefined}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    disabled={operationalDisabled}
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
            disabled={variantStructureDisabled}
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

function pluralizePhotos(value: number) {
  const mod10 = value % 10;
  const mod100 = value % 100;

  if (mod10 === 1 && mod100 !== 11) return "фото загружается";
  return "фото загружаются";
}
