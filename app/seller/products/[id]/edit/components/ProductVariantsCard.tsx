import { SectionHeader } from "./SectionHeader";
import type { ProductVariant } from "../types";
import styles from "../ProductEditPage.module.css";

type Props = {
  variants: ProductVariant[];
  onUpdateVariant: (index: number, patch: Partial<ProductVariant>) => void;
  onAddVariant: () => void;
  onRemoveVariant: (index: number) => void;
};

export function ProductVariantsCard({
  variants,
  onUpdateVariant,
  onAddVariant,
  onRemoveVariant,
}: Props) {
  return (
    <section className={styles.card}>
      <SectionHeader title="Варианты товара" hint="Размер, цвет, SKU, цена и остатки." />

      <div className={styles.variantList}>
        {variants.map((variant, index) => (
          <div key={variant.id ?? `new-${index}`} className={styles.variantCard}>
            <div className={styles.variantHeader}>
              <strong>Вариант {index + 1}</strong>

              {variants.length > 1 ? (
                <button
                  type="button"
                  onClick={() => onRemoveVariant(index)}
                  className={styles.dangerTextBtn}
                >
                  Удалить
                </button>
              ) : null}
            </div>

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span className={styles.required}>Размер</span>
                <input
                  value={variant.size}
                  onChange={(event) =>
                    onUpdateVariant(index, { size: event.target.value })
                  }
                  className={styles.input}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.required}>Цвет</span>
                <input
                  value={variant.color}
                  onChange={(event) =>
                    onUpdateVariant(index, { color: event.target.value })
                  }
                  className={styles.input}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.required}>Цена, ₽</span>
                <input
                  type="number"
                  min={0}
                  value={variant.price}
                  onChange={(event) =>
                    onUpdateVariant(index, { price: Number(event.target.value) })
                  }
                  className={styles.input}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.required}>SKU</span>
                <input
                  value={variant.sku}
                  onChange={(event) =>
                    onUpdateVariant(index, { sku: event.target.value })
                  }
                  className={styles.input}
                />
              </label>

              <label className={styles.fieldFull}>
                <span>Учет остатков</span>

                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={variant.stockTrackingEnabled}
                    onChange={(event) =>
                      onUpdateVariant(index, {
                        stockTrackingEnabled: event.target.checked,
                        availableQuantity: event.target.checked
                          ? variant.availableQuantity ?? 0
                          : null,
                      })
                    }
                  />
                  <span>Учитывать количество товара</span>
                </label>
              </label>

              {variant.stockTrackingEnabled ? (
                <label className={styles.field}>
                  <span>Количество</span>
                  <input
                    type="number"
                    min={0}
                    value={variant.availableQuantity ?? 0}
                    onChange={(event) =>
                      onUpdateVariant(index, {
                        availableQuantity: Number(event.target.value),
                      })
                    }
                    className={styles.input}
                  />
                </label>
              ) : (
                <div className={styles.field}>
                  <span>Количество</span>
                  <div className={styles.readonlyBox}>∞ Без учета остатков</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={onAddVariant} className={styles.secondaryBtn}>
        Добавить вариант
      </button>
    </section>
  );
}