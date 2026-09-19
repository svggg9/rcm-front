import { useId } from "react";
import { ConfirmActionButton } from "../../../../../components/ui/ConfirmActionButton";
import { Button } from "../../../../../components/ui/Button";
import { Icon } from "../../../../../components/ui/Icon";

import { SectionHeader } from "./SectionHeader";
import type { ProductVariant } from "../types";
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

type Props = {
  variants: ProductVariant[];
  validationErrors: VariantValidationErrors;
  variantStructureDisabled: boolean;
  operationalDisabled: boolean;
  onUpdateVariant: (index: number, patch: Partial<ProductVariant>) => void;
  onAddVariant: (base?: Partial<ProductVariant>) => void;
  onRemoveVariant: (index: number) => void;
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
  validationErrors,
  variantStructureDisabled,
  operationalDisabled,
  onUpdateVariant,
  onAddVariant,
  onRemoveVariant,
}: Props) {
  const fieldId = useId();
  const baseVariant = variants[0] ?? null;

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
          title="Параметры товара"
          hint="Размер, цена и остатки."
        />

        <div className={styles.variantSimpleBlock}>

          {baseVariant ? (
          <label className={`${styles.field} ${styles.fieldFull}`} data-ui="field">
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
                <label className={`${styles.field} ${styles.priceField}`} data-ui="field">
                  <span className={styles.required}>Цена</span>
                  <input
                    type="text"
                    aria-invalid={errors.price ? "true" : undefined}
                    aria-describedby={errors.price ? `${fieldId}-${index}-price-error` : undefined}
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
                      errors.price ? "inputError" : ""
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
                  {errors.price ? <span className="fieldError" id={`${fieldId}-${index}-price-error`}>
                    Укажите цену больше нуля
                  </span> : null}
                </label>

                <div className={styles.variantSizeField}>
                  <label className={styles.field} data-ui="field">
                    <span>Размер</span>
                    <input
                      value={variant.size}
                      aria-invalid={errors.sizeId ? "true" : undefined}
                      aria-describedby={errors.sizeId ? `${fieldId}-${index}-size-error` : undefined}
                      disabled={variantStructureDisabled}
                      onChange={(event) =>
                        onUpdateVariant(index, {
                          sizeId: "",
                          size: event.target.value,
                        })
                      }
                      className={`${styles.input} ${
                        errors.sizeId ? "inputError" : ""
                      }`}
                    />
                    {errors.sizeId ? <span className="fieldError" id={`${fieldId}-${index}-size-error`}>
                      Размер повторяется
                    </span> : null}
                  </label>
                </div>

                <div className={`${styles.field} ${styles.quantityField}`} data-ui="field">
                  <label className="label" htmlFor={`${fieldId}-${index}-quantity`}>Количество</label>
                  <ConfirmActionButton
                    type="button"
                    disabled={variantStructureDisabled}
                    confirmTitle="Удалить размер?"
                    confirmText="Размер будет убран из редактируемой карточки товара"
                    onConfirm={() => removeSizeRow(index)}
                    className={styles.variantSizeDeleteBtn}
                    aria-label="Удалить размер"
                  >
                    <Icon name="x" size={20} strokeWidth={1.5} />
                  </ConfirmActionButton>
                  <input
                    type="text"
                    id={`${fieldId}-${index}-quantity`}
                    aria-invalid={errors.availableQuantity ? "true" : undefined}
                    aria-describedby={errors.availableQuantity ? `${fieldId}-${index}-quantity-error` : undefined}
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
                      errors.availableQuantity ? "inputError" : ""
                    }`}
                  />
                  {errors.availableQuantity ? <span className="fieldError" id={`${fieldId}-${index}-quantity-error`}>
                    Количество не может быть отрицательным
                  </span> : null}
                </div>

              </div>
            );
          })}

          <Button
            type="button"
            variant="ghost"
            disabled={variantStructureDisabled}
            onClick={addSizeRow}
            className={styles.addSizeAction}
          >
            Добавить размер
          </Button>
        </div>
      </div>
      </section>
    </>
  );
}
