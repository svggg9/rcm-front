import { useState } from "react";
import Image from "next/image";

import { FormCombobox } from "../../../../../components/ui/FormCombobox";
import { SectionHeader } from "./SectionHeader";
import type { Option, ProductImageItem, ProductVariant } from "../types";
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
  sizes: Option[];
  colors: Option[];
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

type VariantGroup = {
  key: string;
  colorwayId: number | null;
  colorId: number | "";
  color: string;
  variants: Array<{ variant: ProductVariant; index: number }>;
  images: ProductImageItem[];
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function formatPrice(value: number) {
  if (!value) return "";

  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function buildVariantGroups(
  variants: ProductVariant[],
  images: ProductImageItem[]
): VariantGroup[] {
  const groups = new Map<string, VariantGroup>();

  variants.forEach((variant, index) => {
    const key = variant.groupKey || (variant.colorwayId
      ? `colorway-${variant.colorwayId}`
      : variant.colorId
        ? `color-${variant.colorId}`
        : variant.color.trim()
          ? `color-name-${variant.color.trim().toLowerCase()}`
          : `variant-${index}`);

    const existing = groups.get(key);

    if (existing) {
      existing.variants.push({ variant, index });
      return;
    }

    const colorwayId = variant.colorwayId ?? null;

    groups.set(key, {
      key,
      colorwayId,
      colorId: variant.colorId,
      color: variant.color,
      variants: [{ variant, index }],
      images: colorwayId
        ? images.filter((image) => image.colorwayId === colorwayId)
        : images.filter((image) => image.colorwayId == null),
    });
  });

  return Array.from(groups.values());
}

export function ProductVariantsCard({
  variants,
  images,
  sizes,
  colors,
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
  const [dragActiveKey, setDragActiveKey] = useState<string | null>(null);
  const [multipleVariants, setMultipleVariants] = useState(() => variants.length > 1);
  const [colorlessGroupKeys, setColorlessGroupKeys] = useState<Set<string>>(new Set());
  const groups = buildVariantGroups(variants, images);
  const visibleGroups = multipleVariants ? groups : groups.slice(0, 1);

  function switchToSingleVariant() {
    setMultipleVariants(false);

    for (let index = variants.length - 1; index > 0; index -= 1) {
      onRemoveVariant(index);
    }
  }

  function uploadFiles(files: File[], colorwayId: number | null, allowWithoutColorway = false) {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length === 0 || uploading || (!colorwayId && !allowWithoutColorway)) {
      return;
    }

    setDragActiveKey(null);
    onFilesChange(imageFiles);
    onUploadImages(imageFiles, colorwayId);
  }

  function updateGroupColor(group: VariantGroup, value: number | "", customValue = "") {
    const color = colors.find((item) => item.id === value);

    setColorlessGroupKeys((current) => {
      const next = new Set(current);
      next.delete(group.key);
      return next;
    });

    group.variants.forEach(({ index }) => {
      onUpdateVariant(index, {
        colorId: value,
        color: color?.name ?? customValue,
      });
    });
  }

  function removeVariantRow(index: number) {
    if (variants.length > 1) {
      onRemoveVariant(index);
      return;
    }

    onUpdateVariant(index, {
      sizeId: "",
      size: "",
      price: 0,
      availableQuantity: null,
      sellerArticle: "",
      stockTrackingEnabled: false,
    });
  }

  function removeGroup(group: VariantGroup) {
    [...group.variants]
      .sort((left, right) => right.index - left.index)
      .forEach(({ index }) => onRemoveVariant(index));
  }

  function setGroupWithoutColor(group: VariantGroup, checked: boolean) {
    setColorlessGroupKeys((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(group.key);
      } else {
        next.delete(group.key);
      }

      return next;
    });

    if (checked) {
      group.variants.forEach(({ index }) => {
        onUpdateVariant(index, {
          colorId: "",
          color: "",
        });
      });
    }
  }


  return (
    <section className={styles.card}>
      <SectionHeader
        title="Варианты товара"
        hint="Фото относятся к цвету, а каждый размер имеет свою цену, артикул и остаток."
      />

      <div className={styles.variantModeSwitcher}>
        <button
          type="button"
          className={`${styles.variantModeOption} ${!multipleVariants ? styles.variantModeOptionActive : ""}`}
          onClick={switchToSingleVariant}
        >
          <strong>Один вариант</strong>
          <span>Один товар на карточке, без опций</span>
        </button>

        <button
          type="button"
          className={`${styles.variantModeOption} ${multipleVariants ? styles.variantModeOptionActive : ""}`}
          onClick={() => setMultipleVariants(true)}
        >
          <strong>Несколько вариантов</strong>
          <span>Например, если товар есть в разных цветах</span>
        </button>
      </div>

      <div className={styles.variantList}>
        {visibleGroups.map((group, groupIndex) => {
          const isNoColorGroup = !group.colorId && !group.color.trim();
          const noColorChecked = colorlessGroupKeys.has(group.key);
          const canUploadToGroup = group.colorwayId !== null || isNoColorGroup;

          return (
            <div key={group.key} className={styles.variantCard}>
              <div className={styles.variantHeader}>
                <strong>
                  {groupIndex === 0 ? "Основной вариант" : `Вариант ${groupIndex + 1}`}
                </strong>
              </div>

              {multipleVariants ? (
                <div className={styles.variantColorField}>
                  <FormCombobox
                    label="Вариант"
                    value={group.colorId}
                    customValue={group.colorId ? "" : group.color}
                    placeholder="Выберите или введите вариант"
                    options={colors.map((color) => ({
                      value: color.id,
                      label: color.name,
                    }))}
                    onChange={(value, customValue) => updateGroupColor(group, value, customValue)}
                  />

                  <div className={styles.variantNoColorToggle}>
                    <input
                      type="checkbox"
                      checked={noColorChecked}
                      onChange={(event) => setGroupWithoutColor(group, event.target.checked)}
                    />
                    <span>Без цвета</span>
                  </div>
                </div>
              ) : null}

              <div className={styles.variantImagesBlock}>
                <div
                  className={`${styles.variantImageDropZone} ${
                  dragActiveKey === group.key ? styles.dropZoneActive : ""
                } ${invalidImages && images.length === 0 ? styles.dropZoneInvalid : ""} ${
                  canUploadToGroup ? "" : styles.variantImageDropZoneDisabled
                }`}
                onDragEnter={(event) => {
                  event.preventDefault();
                  if (canUploadToGroup) setDragActiveKey(group.key);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (canUploadToGroup) setDragActiveKey(group.key);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setDragActiveKey(null);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  uploadFiles(Array.from(event.dataTransfer.files), group.colorwayId, canUploadToGroup);
                }}
              >
                <div>
                  <strong>{uploading ? "Загружаем фото..." : "Фото этого варианта"}</strong>
                  <span>
                    {canUploadToGroup
                      ? uploading && uploadProgress.total > 0
                        ? `${uploadProgress.done} из ${uploadProgress.total}`
                        : "Перетащи фото сюда или выбери файл."
                      : "Сохрани вариант, чтобы загрузить фото этого варианта."}
                  </span>
                </div>

                <label className={styles.filePicker}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={uploading || !canUploadToGroup}
                    onChange={(event) => {
                      uploadFiles(
                        Array.from(event.target.files ?? []),
                        group.colorwayId,
                        canUploadToGroup,
                      );
                      event.target.value = "";
                    }}
                  />
                  <span>{uploading ? "Загрузка..." : "Выбрать фото"}</span>
                </label>
              </div>

              {group.images.length > 0 ? (
                <div className={styles.variantImageGrid}>
                  {group.images.map((image, index) => (
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
                        onClick={() => onDeleteImage(image.id)}
                        className={styles.imageDeleteBtn}
                        aria-label="Удалить фото"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              </div>

              <div className={styles.variantSizeList}>
                {group.variants.map(({ variant, index }) => {
                  const errors = validationErrors[index] ?? {};

                  return (
                    <div key={variant.id ?? `new-${index}`} className={styles.variantSizeRow}>
                      <div className={styles.variantSizeField}>
                        <FormCombobox
                          label="Размер"
                          value={variant.sizeId}
                          customValue={variant.sizeId ? "" : variant.size}
                          placeholder="Без размера"
                          emptyOptionLabel="Без размера"
                          options={sizes.map((size) => ({
                            value: size.id,
                            label: size.name,
                          }))}
                          onChange={(value, customValue) => {
                            const size = sizes.find((item) => item.id === value);
                            onUpdateVariant(index, {
                              sizeId: value,
                              size: size?.name ?? customValue,
                            });
                          }}
                        />

                        <div className={styles.variantSizeActions}>
                          <button
                              type="button"
                              onClick={() =>
                                onAddVariant({
                                  groupKey: group.key,
                                  colorwayId: group.colorwayId,
                                  colorId: group.colorId,
                                  color: group.color,
                                })
                              }
                              className={styles.variantAddSizeBtn}
                            >
                              Добавить
                            </button>

                          {group.variants.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => removeVariantRow(index)}
                              className={styles.variantSizeDeleteBtn}
                            >
                              Удалить
                            </button>
                          ) : null}
                        </div>
                      </div>

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
                      <label className={styles.field}>
                        <span>Артикул продавца</span>
                        <input
                          value={variant.sellerArticle ?? ""}
                          onChange={(event) =>
                            onUpdateVariant(index, { sellerArticle: event.target.value })
                          }
                          className={styles.input}
                        />
                      </label>

                      <div className={`${styles.field} ${styles.quantityField}`}>
                        <span>Количество</span>
                        {variant.stockTrackingEnabled ? (
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
                              })
                            }
                            className={`${styles.input} ${errors.availableQuantity ? styles.fieldInvalid : ""} ${variant.availableQuantity === null ? styles.requiredEmpty : ""}`}
                          />
                        ) : (
                          <div className={styles.readonlyBox} aria-hidden="true" />
                        )}
                        <div className={styles.variantStockToggle}>
                          <input
                            type="checkbox"
                            checked={variant.stockTrackingEnabled}
                            onChange={(event) =>
                              onUpdateVariant(index, {
                                stockTrackingEnabled: event.target.checked,
                                availableQuantity: event.target.checked
                                  ? variant.availableQuantity
                                  : null,
                              })
                            }
                          />
                          <span>Учитывать кол-во</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {multipleVariants ? (
                <div className={styles.variantCardActions}>
                  <button
                    type="button"
                    onClick={() => onAddVariant()}
                    className={styles.variantAddVariantBtn}
                  >
                    Добавить вариант
                  </button>

                  {groupIndex > 0 ? (
                    <button
                      type="button"
                      onClick={() => removeGroup(group)}
                      className={styles.variantDeleteBtn}
                    >
                      Удалить
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}


