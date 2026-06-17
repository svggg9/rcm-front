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
          <span className={styles.accIcon}>{openDescription ? "−" : "+"}</span>
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
          <span className={styles.accIcon}>{openShipping ? "−" : "+"}</span>
        </button>

        {openShipping ? (
          <div className={styles.accBody}>
            <div className={styles.shippingText}>
              <p>
                Доставка рассчитывается при оформлении заказа и зависит от
                выбранного города, способа получения и тарифов службы доставки.
              </p>
              <p>
                Вы оплачиваете итоговую стоимость заказа на этапе оформления.
                Если в заказе несколько товаров, условия доставки будут
                рассчитаны для всей корзины.
              </p>
              <p>
                Возврат возможен в течение 30 дней после получения заказа, если
                товар сохранил товарный вид, бирки и упаковку.
              </p>
              <p>
                Точные правила возврата, сроки обработки и исключения мы
                вынесем в отдельные разделы после финальной настройки политики
                магазина.
              </p>

              <div className={styles.shippingLinks}>
                <span>Заказы и доставка</span>
                <span>Возврат</span>
                <span>Оплата и пошлины</span>
                <span>Данные продавца</span>
                <span>Информация о производителе</span>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
