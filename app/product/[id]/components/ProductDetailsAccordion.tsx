"use client";

import styles from "../ProductPage.module.css";

import type { Product, Variant } from "../lib/types";

type Props = {
  product: Product;
  selectedVariant: Variant | null;
  openDescription: boolean;
  openShipping: boolean;
  onToggleDescription: () => void;
  onToggleShipping: () => void;
};

export function ProductDetailsAccordion({
  product,
  selectedVariant,
  openDescription,
  openShipping,
  onToggleDescription,
  onToggleShipping,
}: Props) {
  const composition = product.composition?.trim();

  return (
    <div className={styles.accordion}>
      <section className={styles.accItem}>
        <button
          type="button"
          className={styles.accBtn}
          onClick={onToggleDescription}
          aria-expanded={openDescription}
        >
          <span>Описание</span>
          <span className={styles.accIcon}>{openDescription ? "-" : "+"}</span>
        </button>

        {openDescription ? (
          <div className={styles.accBodyOpen}>
            <div
              className={`${styles.descriptionGrid} ${
                composition ? "" : styles.descriptionGridSingle
              }`.trim()}
            >
              <div className={styles.descriptionMain}>
                <p className={styles.text}>
                  {product.description || "Описание пока не заполнено."}
                </p>

                <div className={styles.articleRows}>
                  <div>
                    <span>Артикул сайта</span>
                    <strong>{selectedVariant?.sku || `RCM-${product.id}`}</strong>
                  </div>

                  {selectedVariant?.sellerArticle ? (
                    <div>
                      <span>Артикул продавца</span>
                      <strong>{selectedVariant.sellerArticle}</strong>
                    </div>
                  ) : null}
                </div>
              </div>

              {composition ? (
                <div className={styles.compositionBlock}>
                  <h3 className={styles.subTitle}>Состав</h3>
                  <p className={styles.text}>{composition}</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <section className={styles.accItem}>
        <button
          type="button"
          className={styles.accBtn}
          onClick={onToggleShipping}
          aria-expanded={openShipping}
        >
          <span>Доставка и возврат</span>
          <span className={styles.accIcon}>{openShipping ? "-" : "+"}</span>
        </button>

        {openShipping ? (
          <div className={styles.accBody}>
            <div className={styles.shippingText}>
              <p>
                Возврат возможен в течение 14 дней после получения заказа, если
                товар сохранил товарный вид, бирки и упаковку.
              </p>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
