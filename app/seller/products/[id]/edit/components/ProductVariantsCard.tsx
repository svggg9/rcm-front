import { SectionHeader } from "./SectionHeader";
import type { Option, ProductVariant } from "../types";
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
  sizes: Option[];
  colors: Option[];
  validationErrors: VariantValidationErrors;
  onUpdateVariant: (index: number, patch: Partial<ProductVariant>) => void;
  onAddVariant: () => void;
  onRemoveVariant: (index: number) => void;
};

function normalizeSkuPart(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replaceAll(" ", "-")
    .replace(/[^A-ZА-Я0-9-]/g, "")
    .slice(0, 24);
}

function generateSku(
  index: number,
  variant: ProductVariant,
  sizes: Option[],
  colors: Option[]
) {
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();

  const sizeName =
    sizes.find((size) => size.id === variant.sizeId)?.name ||
    variant.size ||
    "SIZE";

  const colorName =
    colors.find((color) => color.id === variant.colorId)?.name ||
    variant.color ||
    "COLOR";

  return `RCM-${normalizeSkuPart(sizeName)}-${normalizeSkuPart(colorName)}-${index + 1}-${random}`;
}

export function ProductVariantsCard({
  variants,
  sizes,
  colors,
  validationErrors,
  onUpdateVariant,
  onAddVariant,
  onRemoveVariant,
}: Props) {
  return (
    <section className={styles.card}>
      <SectionHeader
        title="Варианты товара"
        hint="Размер, цвет, SKU, цена и остатки. SKU должен быть уникальным для каждого варианта."
      />

      <div className={styles.variantList}>
        {variants.map((variant, index) => {
          const errors = validationErrors[index] ?? {};

          return (
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
                  <select
                    value={variant.sizeId ?? ""}
                    onChange={(event) =>
                      onUpdateVariant(index, {
                        sizeId: event.target.value ? Number(event.target.value) : "",
                      })
                    }
                    className={`${styles.select} ${
                      errors.sizeId ? styles.fieldInvalid : ""
                    }`}
                  >
                    <option value="">Выбери размер</option>
                    {sizes.map((size) => (
                      <option key={size.id} value={size.id}>
                        {size.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.field}>
                  <span className={styles.required}>Цвет</span>
                  <select
                    value={variant.colorId ?? ""}
                    onChange={(event) =>
                      onUpdateVariant(index, {
                        colorId: event.target.value ? Number(event.target.value) : "",
                      })
                    }
                    className={`${styles.select} ${
                      errors.colorId ? styles.fieldInvalid : ""
                    }`}
                  >
                    <option value="">Выбери цвет</option>
                    {colors.map((color) => (
                      <option key={color.id} value={color.id}>
                        {color.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.field}>
                  <span className={styles.required}>Цена, ₽</span>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={variant.price || ""}
                    onChange={(event) =>
                      onUpdateVariant(index, {
                        price: event.target.value === "" ? 0 : Number(event.target.value),
                      })
                    }
                    className={`${styles.input} ${
                      errors.price ? styles.fieldInvalid : ""
                    }`}
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.required}>SKU</span>

                  <div className={styles.inlineControl}>
                    <input
                      value={variant.sku}
                      onChange={(event) =>
                        onUpdateVariant(index, { sku: event.target.value })
                      }
                      className={`${styles.input} ${
                        errors.sku ? styles.fieldInvalid : ""
                      }`}
                    />

                    <button
                      type="button"
                      className={styles.smallBtn}
                      onClick={() =>
                        onUpdateVariant(index, {
                          sku: generateSku(index, variant, sizes, colors),
                        })
                      }
                    >
                      Сгенерировать
                    </button>
                  </div>
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
                      step={1}
                      value={variant.availableQuantity ?? ""}
                      onChange={(event) =>
                        onUpdateVariant(index, {
                          availableQuantity:
                            event.target.value === "" ? null : Math.max(0, Number(event.target.value)),
                        })
                      }
                      className={`${styles.input} ${
                        errors.availableQuantity ? styles.fieldInvalid : ""
                      }`}
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
          );
        })}
      </div>

      <button type="button" onClick={onAddVariant} className={styles.secondaryBtn}>
        Добавить вариант
      </button>
    </section>
  );
}