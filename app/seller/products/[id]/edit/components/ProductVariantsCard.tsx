import { useId } from "react";
import { VariantNumberInput } from "./VariantNumberInput";
import { Button } from "../../../../../components/ui/Button";
import { DesignSystemIcon as Icon } from "../../../../../components/ui/DesignSystemIcon";
import { variantColorGroupKey, inconsistentProductPriceIndexes } from "../utils";
import type { ProductVariant } from "../types";
import styles from "../ProductEditPage.module.css";

type VariantErrors = Record<number, { sku?: boolean; sizeId?: boolean; colorId?: boolean; price?: boolean; availableQuantity?: boolean }>;
type Props = {
  countInvalid?: boolean;
  variants: ProductVariant[];
  validationErrors: VariantErrors;
  variantStructureDisabled: boolean;
  operationalDisabled: boolean;
  onUpdateVariant: (index: number, patch: Partial<ProductVariant>) => void;
  onAddVariant: (base?: Partial<ProductVariant>) => void;
  onRemoveVariant: (index: number) => void;
  onOpenPhotos?: (groupKey: string) => void;
};
export function ProductVariantsCard({ countInvalid, variants, validationErrors, variantStructureDisabled, operationalDisabled, onUpdateVariant, onAddVariant, onRemoveVariant, onOpenPhotos }: Props) {
  const id = useId();
  const base = variants[0];
  const groups = Array.from(new Set(variants.map(variantColorGroupKey))).map(key => ({ key, rows: variants.map((variant, index) => ({ variant, index })).filter(row => variantColorGroupKey(row.variant) === key) }));
  const mixedPrices = inconsistentProductPriceIndexes(variants).size > 0;
  const priceError = mixedPrices || variants.some((_, index) => validationErrors[index]?.price);
  return <section id="product-variants" className={styles.card} aria-label="Варианты товара">
    <p className={styles.sectionIntro}>Одна цена для всех оттенков и размеров товара</p>
    {base && <label className={styles.field}><span>Цена товара, ₽</span>
      <VariantNumberInput className={styles.input} value={mixedPrices ? null : base.price || null} disabled={operationalDisabled} placeholder="0" aria-label="Цена товара"
        aria-invalid={priceError || undefined} aria-describedby={`${id}-price-hint${priceError ? ` ${id}-price-error` : ""}`} onValue={price => variants.forEach((_, index) => onUpdateVariant(index, { price: price ?? 0 }))} />
      <small id={`${id}-price-hint`} className={styles.fieldHint}>Изменение цены применяется ко всем вариантам и размерам</small>
      {priceError && <span id={`${id}-price-error`} className="fieldError">{mixedPrices ? "У товара разные цены — укажите общую цену для всех вариантов и размеров" : "Укажите одну цену больше нуля для всего товара"}</span>}
    </label>}
    {countInvalid && <p className="fieldError" data-validation-error="true">Добавьте хотя бы один вариант товара</p>}
    <div className={styles.variantSizeList}>
      {groups.map((group, groupIndex) => {
        const first = group.rows[0];
        const tracking = group.rows.every(row => row.variant.stockTrackingEnabled);
        const mixedTracking = !tracking && group.rows.some(row => row.variant.stockTrackingEnabled);
        const changeGroup = (patch: Partial<ProductVariant>) => group.rows.forEach(row => onUpdateVariant(row.index, patch));
        const colorError = group.rows.some(row => validationErrors[row.index]?.colorId);
        return <section key={group.key} className={styles.variantColorGroup} aria-label={`Вариант ${groupIndex + 1}`}>
          <div className={styles.variantGroupHeader}><h3>{first.variant.color.trim() || `Вариант ${groupIndex + 1}`}</h3>
            {onOpenPhotos && <Button type="button" variant="ghost" disabled={variantStructureDisabled} onClick={() => onOpenPhotos(group.key)}>Фото оттенка</Button>}
          </div>
          <div className={styles.formGrid}>
            <label className={styles.field}><span>Название оттенка <small className={styles.fieldHint}>необязательно</small></span>
              <input className={styles.input} disabled={variantStructureDisabled} value={first.variant.color} maxLength={64} placeholder="Например, молочный" aria-invalid={colorError || undefined}
                aria-describedby={colorError ? `${id}-${groupIndex}-color-error` : undefined} onChange={event => changeGroup({ color: event.target.value, colorId: "" })} />
              {colorError && <span id={`${id}-${groupIndex}-color-error`} className="fieldError">Этот оттенок уже есть — добавьте размеры в его группу</span>}
            </label>
          </div>
          <label className={styles.stockToggle}><input type="checkbox" checked={tracking} ref={element => { if (element) element.indeterminate = mixedTracking; }} disabled={operationalDisabled}
            onChange={event => { const enabled = event.target.checked; group.rows.forEach(({ variant, index }) => onUpdateVariant(index, { stockTrackingEnabled: enabled, availableQuantity: enabled ? variant.availableQuantity ?? 0 : null })); }} />
            <span>Учитывать остатки{mixedTracking ? <small>Включено для части размеров</small> : null}</span>
          </label>
          {!tracking && !mixedTracking && <p className={styles.fieldHint}>Товар можно заказать без ограничения по складскому остатку</p>}
          <div className={styles.sizeTable}>
            {group.rows.map(({ variant, index }) => {
              const errors = validationErrors[index] ?? {};
              return <div key={variant.id ?? variant.clientKey ?? index} className={styles.sizeTableRow}>
                <label className={styles.field}><span>Размер <small className={styles.fieldHint}>необязательно</small></span>
                  <input className={styles.input} value={variant.size} maxLength={64} disabled={variantStructureDisabled} placeholder="Без размера" aria-invalid={errors.sizeId || undefined}
                    aria-describedby={errors.sizeId ? `${id}-${index}-size-error` : undefined} onChange={event => onUpdateVariant(index, { sizeId: "", size: event.target.value })} />
                  {errors.sizeId && <span id={`${id}-${index}-size-error`} className="fieldError">Размер повторяется</span>}
                </label>
                <label className={styles.field}><span>На складе, шт.</span>
                  {variant.stockTrackingEnabled ? <VariantNumberInput integer className={styles.input} value={variant.availableQuantity} disabled={operationalDisabled} placeholder="0" aria-label={`На складе: ${variant.color || `вариант ${groupIndex + 1}`}, ${variant.size || "без размера"}`}
                    aria-invalid={errors.availableQuantity || undefined} aria-describedby={errors.availableQuantity ? `${id}-${index}-quantity-error` : undefined} onValue={availableQuantity => onUpdateVariant(index, { availableQuantity })} /> : <span className={styles.untrackedStock}>Без учёта</span>}
                  {errors.availableQuantity && <span id={`${id}-${index}-quantity-error`} className="fieldError">Введите целое количество от 0</span>}
                  {(variant.reservedQuantity ?? 0) > 0 && <small className={styles.fieldHint}>В резерве {variant.reservedQuantity} | Доступно {variant.stockTrackingEnabled ? Math.max(0, (variant.availableQuantity ?? 0) - (variant.reservedQuantity ?? 0)) : "без учёта"}</small>}
                </label>
                <Button type="button" variant="ghost" className={styles.removeSizeButton} disabled={variantStructureDisabled || (variants.length === 1)} aria-label={`Удалить размер: ${variant.size || "без размера"}, ${variant.color || `вариант ${groupIndex + 1}`}`} onClick={() => onRemoveVariant(index)}><Icon name="trash" role="utility" /></Button>
              </div>;
            })}
          </div>
          <Button type="button" variant="ghost" reserveLabelSpace={false} className={styles.addVariantAction} disabled={variantStructureDisabled}
            onClick={() => onAddVariant({ ...first.variant, id: null, clientKey: crypto.randomUUID(), groupKey: group.key, sku: "", size: "", sizeId: "", availableQuantity: first.variant.stockTrackingEnabled ? 0 : null, initialQuantity: undefined, initialStockTrackingEnabled: undefined })}>
            <Icon name="plus" role="utility" />Добавить размер
          </Button>
        </section>;
      })}
      <Button type="button" variant="secondary" reserveLabelSpace={false} className={styles.addVariantAction} disabled={variantStructureDisabled}
        onClick={() => onAddVariant({ groupKey: crypto.randomUUID(), colorwayId: null, colorId: "", color: "", price: base?.price ?? 0, availableQuantity: 0 })}><Icon name="plus" role="utility" />Добавить оттенок</Button>
    </div>
    {base && <details className={styles.optionalSection}><summary>Артикул продавца <span className={styles.fieldHint}>необязательно</span></summary>
      <label className={styles.field}><span>Внутренний артикул</span><input className={styles.input} value={base.sellerArticle ?? ""} maxLength={64} disabled={operationalDisabled} onChange={event => variants.forEach((_, index) => onUpdateVariant(index, { sellerArticle: event.target.value }))} /></label>
    </details>}
  </section>;
}
