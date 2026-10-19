import { VariantNumberInput } from "./VariantNumberInput";
import { useFieldValidation } from "../../../../../lib/useFieldValidation";
import { useId } from "react";
import { Button } from "../../../../../components/ui/Button";
import { Icon } from "../../../../../components/ui/Icon";

import { variantColorGroupKey, inconsistentColorPriceIndexes } from "../utils";
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
  countInvalid?: boolean;
  variants: ProductVariant[];
  validationErrors: VariantValidationErrors;
  variantStructureDisabled: boolean;
  operationalDisabled: boolean;
  onUpdateVariant: (index: number, patch: Partial<ProductVariant>) => void;
  onAddVariant: (base?: Partial<ProductVariant>) => void;
  onRemoveVariant: (index: number) => void;
};

export function ProductVariantsCard({
  countInvalid = false,
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
  const groups = Array.from(new Set(variants.map(variantColorGroupKey))).map(key=>({
    key, rows:variants.map((variant,index)=>({variant,index})).filter(({variant:v})=>variantColorGroupKey(v) === key)
  }));

  const mixedPriceIndexes = inconsistentColorPriceIndexes(variants);
  const numericValues: Record<string, number | null> = Object.fromEntries(variants.flatMap((variant, index) => [
    ["price-" + index, variant.price], ["quantity-" + index, variant.availableQuantity],
  ]));
  const numericValidation = useFieldValidation(numericValues, values => {
    const errors: Record<string, string> = {};
    for (const [key, value] of Object.entries(values)) {
      if (key.startsWith("price-") && (value === null || !Number.isFinite(value) || value <= 0)) errors[key] = "Укажите цену больше нуля, до двух знаков после запятой";
      else if (key.startsWith("quantity-") && value !== null && (!Number.isSafeInteger(value) || value < 0)) errors[key] = "Введите целое неотрицательное количество";
    }
    return errors;
  });

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
      <section id="product-variants" className={styles.card} aria-label="Варианты товара">
        {countInvalid && <p className="fieldError" data-validation-error="true">Добавьте хотя бы один вариант товара</p>}
        <div className={styles.variantSimpleBlock}>

          {baseVariant ? (
          <label className={`${styles.field} ${styles.fieldFull}`} data-ui="field">
            <span>Артикул продавца (необязательно)</span>
            <input
              value={baseVariant.sellerArticle ?? ""}
              disabled={operationalDisabled}
              onChange={(event) => updateSellerArticle(event.target.value)}
              className={styles.input}
            />
          </label>
        ) : null}

        <div className={styles.variantSizeList}>
          {groups.map(group=><section key={group.key} className={styles.variantColorGroup}>
            <label className={styles.field}><span>Цвет (необязательно)</span><input className={styles.input} disabled={variantStructureDisabled}
              aria-invalid={group.rows.some(({index})=>validationErrors[index]?.colorId) || undefined}
              value={group.rows[0].variant.color} placeholder="Без цвета"
              onChange={event=>group.rows.forEach(({index})=>onUpdateVariant(index,{color:event.target.value,colorId:""}))} />
              {group.rows.some(({index})=>validationErrors[index]?.colorId) && <span className="fieldError">Проверьте цвет: одинаковые цвета должны быть в одной группе</span>}
            </label>
            <label className={styles.field} data-ui="field">
              <span className={styles.required}>Цена цвета, ₽</span>
              <VariantNumberInput
                value={mixedPriceIndexes.has(group.rows[0].index) ? null : group.rows[0].variant.price}
                disabled={operationalDisabled}
                placeholder={mixedPriceIndexes.has(group.rows[0].index) ? "Укажите общую цену" : undefined}
                aria-label={`Цена цвета: ${group.rows[0].variant.color || "без цвета"}`}
                aria-invalid={mixedPriceIndexes.has(group.rows[0].index) || group.rows.some(({index}) => validationErrors[index]?.price) || !!numericValidation.errors["price-" + group.rows[0].index] || undefined}
                aria-describedby={`${fieldId}-${group.rows[0].index}-price-hint`}
                className={styles.input}
                onBlur={() => numericValidation.touch("price-" + group.rows[0].index)}
                onValue={price => { if (group.rows.some(({index}) => validationErrors[index]?.price)) numericValidation.touch("price-" + group.rows[0].index); group.rows.forEach(({index}) => onUpdateVariant(index, {price: price ?? 0})); }}
              />
              <span id={`${fieldId}-${group.rows[0].index}-price-hint`} className={mixedPriceIndexes.has(group.rows[0].index) || group.rows.some(({index}) => validationErrors[index]?.price) || numericValidation.errors["price-" + group.rows[0].index] ? "fieldError" : styles.fieldHint}>
                {mixedPriceIndexes.has(group.rows[0].index)
                  ? "У размеров разные цены — укажите общую цену для этого цвета"
                  : numericValidation.errors["price-" + group.rows[0].index]
                    ? numericValidation.errors["price-" + group.rows[0].index]
                    : group.rows.some(({index}) => validationErrors[index]?.price)
                      ? "Проверьте общую цену цвета"
                      : "Одна цена для всех размеров этого цвета"}
              </span>
            </label>
            {group.rows.map(({variant, index}) => {
            const errors = validationErrors[index] ?? {};

            return (
              <div key={variant.id ?? variant.clientKey ?? `new-${index}`} className={styles.variantSizeRow}>
                <div className={styles.variantSizeField}>
                  <label className={styles.field} data-ui="field">
                    <span>Размер (необязательно)</span>
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
                  <label className="label" htmlFor={`${fieldId}-${index}-quantity`}>На складе (необязательно)</label>
                  <Button
                    type="button"
                    disabled={variantStructureDisabled}
                    onClick={() => removeSizeRow(index)}
                    className={styles.variantSizeDeleteBtn}
                    aria-label="Удалить размер"
                  >
                    <Icon name="x" size={14} strokeWidth={1.5} />
                  </Button>
                  <VariantNumberInput integer value={variant.availableQuantity} disabled={operationalDisabled}
                    aria-invalid={errors.availableQuantity || !!numericValidation.errors["quantity-" + index] || undefined}
                    id={`${fieldId}-${index}-quantity`} className={styles.input}
                    aria-describedby={errors.availableQuantity || numericValidation.errors["quantity-" + index] ? `${fieldId}-${index}-quantity-error` : undefined}
                    onBlur={() => numericValidation.touch("quantity-" + index)}
                    onValue={availableQuantity=>{ if (errors.availableQuantity) numericValidation.touch("quantity-" + index); onUpdateVariant(index,{availableQuantity,stockTrackingEnabled:availableQuantity !== null}); }} />
                  {numericValidation.errors["quantity-" + index] && <span className="fieldError" id={`${fieldId}-${index}-quantity-error`}>{numericValidation.errors["quantity-" + index]}</span>}
                  {index === 0 && <span className={styles.fieldHint}>Пусто — без учёта остатков; 0 — нет в наличии</span>}
                  {(variant.reservedQuantity ?? 0) > 0 && <span className={styles.fieldHint}>В резерве: {variant.reservedQuantity} · Доступно: {variant.availableQuantity === null ? "без учёта" : Math.max(0, variant.availableQuantity - (variant.reservedQuantity ?? 0))}</span>}
                  {errors.availableQuantity && !numericValidation.errors["quantity-" + index] ? <span className="fieldError" id={`${fieldId}-${index}-quantity-error`}>
                    Количество не может быть отрицательным
                  </span> : null}
                </div>

              </div>
            );
          })}
          <Button type="button" variant="ghost" reserveLabelSpace={false} className={styles.addVariantAction}
            aria-label={`Добавить размер: ${group.rows[0].variant.color || "без цвета"}`}
            disabled={variantStructureDisabled} onClick={()=>onAddVariant({...group.rows[0].variant,groupKey:group.key,id:null,clientKey:crypto.randomUUID(),sku:"",size:"",sizeId:""})}>
            <Icon name="plus" size={16} strokeWidth={2.5} /><span>Добавить размер</span>
          </Button>
          </section>)}

          <Button
            type="button"
            variant="secondary"
            reserveLabelSpace={false}
            disabled={variantStructureDisabled}
            onClick={()=>onAddVariant({groupKey:crypto.randomUUID(),colorwayId:null,colorId:"",color:"",price:baseVariant?.price ?? 0})}
            className={`${styles.addVariantAction} ${styles.addColorAction}`}
          >
            <Icon name="plus" size={16} strokeWidth={2.5} /><span>Добавить цвет</span>
          </Button>
        </div>
      </div>
      </section>
    </>
  );
}
