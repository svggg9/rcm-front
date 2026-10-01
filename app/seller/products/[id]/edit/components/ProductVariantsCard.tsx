import { VariantNumberInput } from "./VariantNumberInput";
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
  const groups = Array.from(new Set(variants.map(v=>v.groupKey || String(v.colorwayId ?? v.colorId ?? v.color)))).map(key=>({
    key, rows:variants.map((variant,index)=>({variant,index})).filter(({variant:v})=>(v.groupKey || String(v.colorwayId ?? v.colorId ?? v.color)) === key)
  }));

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
      <section id="product-variants" className={styles.card}>
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
          {groups.map(group=><section key={group.key} className={styles.variantColorGroup}>
            <label className={styles.field}><span>Цвет</span><input className={styles.input} disabled={variantStructureDisabled}
              aria-invalid={group.rows.some(({index})=>validationErrors[index]?.colorId) || undefined}
              value={group.rows[0].variant.color} placeholder="Без цвета"
              onChange={event=>group.rows.forEach(({index})=>onUpdateVariant(index,{color:event.target.value,colorId:""}))} />
              {group.rows.some(({index})=>validationErrors[index]?.colorId) && <span className="fieldError">Проверьте цвет: одинаковые цвета должны быть в одной группе</span>}
            </label>
            {group.rows.map(({variant, index}) => {
            const errors = validationErrors[index] ?? {};

            return (
              <div key={variant.id ?? variant.clientKey ?? `new-${index}`} className={styles.variantSizeRow}>
                <label className={`${styles.field} ${styles.priceField}`} data-ui="field">
                  <span className={styles.required}>Цена</span>
                  <VariantNumberInput value={variant.price} disabled={operationalDisabled}
                    aria-label={`Цена варианта ${index + 1}`} aria-describedby={`${fieldId}-${index}-price-error`}
                    className={styles.input} onValue={price=>onUpdateVariant(index,{price:price ?? 0})} />
                  <span>₽</span>
                  {Number.isNaN(variant.price) && <span className="fieldError" id={`${fieldId}-${index}-price-error`}>Введите неотрицательную цену, до двух знаков после запятой</span>}
                  {errors.price && !Number.isNaN(variant.price) ? <span className="fieldError" id={`${fieldId}-${index}-price-error`}>
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
                  <VariantNumberInput integer value={variant.availableQuantity} disabled={operationalDisabled}
                    id={`${fieldId}-${index}-quantity`} className={styles.input}
                    aria-describedby={`${fieldId}-${index}-quantity-error`}
                    onValue={availableQuantity=>onUpdateVariant(index,{availableQuantity,stockTrackingEnabled:availableQuantity !== null})} />
                  {Number.isNaN(variant.availableQuantity) && <span className="fieldError" id={`${fieldId}-${index}-quantity-error`}>Введите целое неотрицательное количество</span>}
                  <span className={styles.fieldHint}>Пусто — без учёта остатков; 0 — нет в наличии</span>
                  {errors.availableQuantity && !Number.isNaN(variant.availableQuantity) ? <span className="fieldError" id={`${fieldId}-${index}-quantity-error`}>
                    Количество не может быть отрицательным
                  </span> : null}
                </div>

              </div>
            );
          })}
          <Button variant="ghost" disabled={variantStructureDisabled} onClick={()=>onAddVariant({...group.rows[0].variant,id:null,clientKey:crypto.randomUUID(),sku:"",size:"",sizeId:""})}>Добавить размер этого цвета</Button>
          </section>)}

          <Button
            type="button"
            variant="ghost"
            disabled={variantStructureDisabled}
            onClick={()=>onAddVariant({groupKey:crypto.randomUUID(),colorwayId:null,colorId:"",color:"",price:baseVariant?.price ?? 0})}
            className={styles.addSizeAction}
          >
            Добавить цвет / вариант
          </Button>
        </div>
      </div>
      </section>
    </>
  );
}
