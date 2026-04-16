"use client";

import styles from "../ProductPage.module.css";

import type { Product, Variant } from "../lib/types";

type Props = {
  product: Product;
  selectedVariant: Variant | null;
  sizesText: string;
  openFit: boolean;
  openShipping: boolean;
  onToggleFit: () => void;
  onToggleShipping: () => void;
};

export function ProductDetailsAccordion({
  product,
  selectedVariant,
  sizesText,
  openFit,
  openShipping,
  onToggleFit,
  onToggleShipping,
}: Props) {
  return (
    <div className={styles.accordion}>
      <section className={styles.accItem}>
        <button type="button" className={styles.accBtn} disabled>
          <span>Описание</span>
          <span className={styles.accIcon}>−</span>
        </button>

        <div className={styles.accBodyOpen}>
          <div className={styles.descriptionGrid}>
            <div>
              <h3 className={styles.subTitle}>Подробнее о товаре</h3>
              <p className={styles.text}>
                {product.description || "Описание пока не заполнено."}
              </p>
            </div>

            <div>
              <h3 className={styles.subTitle}>Информация</h3>
              <ul className={styles.list}>
                <li>Бренд: {product.brand}</li>
                <li>Категория: {product.category}</li>
                <li>Артикул: {product.id}</li>
                {selectedVariant?.sku ? <li>SKU: {selectedVariant.sku}</li> : null}
                {selectedVariant ? (
                  <li>
                    Наличие:{" "}
                    {selectedVariant.availableQuantity > 0
                      ? `${selectedVariant.availableQuantity} шт.`
                      : "нет в наличии"}
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.accItem}>
        <button type="button" className={styles.accBtn} onClick={onToggleFit}>
          <span>Размер и крой</span>
          <span className={styles.accIcon}>{openFit ? "−" : "+"}</span>
        </button>

        {openFit ? (
          <div className={styles.accBody}>
            <p className={styles.text}>
              {sizesText}. Точные параметры и посадка зависят от выбранного
              варианта.
            </p>
          </div>
        ) : null}
      </section>

      <section className={styles.accItem}>
        <button
          type="button"
          className={styles.accBtn}
          onClick={onToggleShipping}
        >
          <span>Доставка и возврат</span>
          <span className={styles.accIcon}>{openShipping ? "−" : "+"}</span>
        </button>

        {openShipping ? (
          <div className={styles.accBody}>
            <p className={styles.text}>
              Доставка рассчитывается при оформлении заказа. Возврат возможен
              в стандартные сроки магазина.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}