import { Checkbox } from "../../../../../components/ui/Checkbox";
import { Button } from "../../../../../components/ui/Button";
import { InsideLabelInput } from "../../../../../components/ui/InsideLabelInput";
import { NumericField } from "../../../../../components/ui/NumericField";
import { INTEGER_RULES, MONEY_RULES } from "../../../../../lib/numericInput";
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
  const base = variants[0];
  const groups = Array.from(new Set(variants.map(variantColorGroupKey))).map(key => ({ key, rows: variants.map((variant, index) => ({ variant, index })).filter(row => variantColorGroupKey(row.variant) === key) }));
  const mixedPrices = inconsistentProductPriceIndexes(variants).size > 0;
  const priceError = mixedPrices || variants.some((_, index) => validationErrors[index]?.price);
  return <section id="product-variants" className={styles.card} aria-label="Варианты товара">
    {base && <NumericField appearance="warm" label="Цена" aria-label="Цена товара, ₽" suffix="₽" {...MONEY_RULES} emptyZero
      value={mixedPrices ? null : base.price || null} disabled={operationalDisabled} placeholder="0"
      hint="Изменение цены применяется ко всем вариантам и размерам"
      error={priceError ? (mixedPrices ? "У товара разные цены — укажите общую цену для всех вариантов и размеров" : "Укажите одну цену больше нуля для всего товара") : undefined}
      onValueChange={price => variants.forEach((_, index) => onUpdateVariant(index, { price: price ?? 0 }))} />}
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
            <InsideLabelInput mode="fixed" appearance="warm" label="Название оттенка" hint="Необязательно" disabled={variantStructureDisabled} value={first.variant.color} maxLength={64} placeholder="Например, молочный"
              error={colorError ? "Этот оттенок уже есть — добавьте размеры в его группу" : undefined}
              onChange={event => changeGroup({ color: event.target.value, colorId: "" })} />
          </div>
          <label className={styles.stockToggle}><Checkbox  checked={tracking} ref={element => { if (element) element.indeterminate = mixedTracking; }} disabled={operationalDisabled}
            onChange={event => { const enabled = event.target.checked; group.rows.forEach(({ variant, index }) => onUpdateVariant(index, { stockTrackingEnabled: enabled, availableQuantity: enabled ? variant.availableQuantity ?? 0 : null })); }} />
            <span>Учитывать остатки{mixedTracking ? <small>Включено для части размеров</small> : null}</span>
          </label>
          {!tracking && !mixedTracking && <p className={styles.fieldHint}>Товар можно заказать без ограничения по складскому остатку</p>}
          <div className={styles.sizeTable}>
            {group.rows.map(({ variant, index }) => {
              const errors = validationErrors[index] ?? {};
              return <div key={variant.id ?? variant.clientKey ?? index} className={styles.sizeTableRow}>
                <InsideLabelInput mode="fixed" appearance="warm" label="Размер" hint="Необязательно" value={variant.size} maxLength={64} disabled={variantStructureDisabled} placeholder="Без размера"
                  error={errors.sizeId ? "Размер повторяется" : undefined}
                  onChange={event => onUpdateVariant(index, { sizeId: "", size: event.target.value })} />
                {variant.stockTrackingEnabled ? <NumericField appearance="warm" label="Остаток, шт." {...INTEGER_RULES}
                  value={variant.availableQuantity} disabled={operationalDisabled} placeholder="0" aria-label={`Остаток, шт.: ${variant.color || `вариант ${groupIndex + 1}`}, ${variant.size || "без размера"}`}
                  error={errors.availableQuantity ? "Введите целое количество от 0" : undefined}
                  hint={(variant.reservedQuantity ?? 0) > 0 ? `В резерве ${variant.reservedQuantity} | Доступно ${Math.max(0, (variant.availableQuantity ?? 0) - (variant.reservedQuantity ?? 0))}` : undefined}
                  onValueChange={availableQuantity => onUpdateVariant(index, { availableQuantity })} /> : <div className={styles.field}><span>Остаток, шт.</span>
                    <span className={styles.untrackedStock}>Без учёта</span>
                    {(variant.reservedQuantity ?? 0) > 0 && <small className={styles.fieldHint}>В резерве {variant.reservedQuantity} | Доступно без учёта</small>}
                  </div>}
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
      <InsideLabelInput mode="fixed" appearance="warm" label="Внутренний артикул" value={base.sellerArticle ?? ""} maxLength={64} disabled={operationalDisabled} onChange={event => variants.forEach((_, index) => onUpdateVariant(index, { sellerArticle: event.target.value }))} />
    </details>}
  </section>;
}
