"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "../components/ui/Button";
import { DesignSystemIcon as Icon } from "./DesignSystemIcon";
import { Price } from "../components/ui/Price";
import orderStyles from "../seller/components/SellerOrderCard.module.css";
import styles from "./OrderDetailsPreview.module.css";

const items = [
  {
    id: "cap", brand: "Zegna", title: "Бейсболка Motorin", variant: "Бежевый", quantity: 1, price: 5900,
    image: "https://storage.yandexcloud.net/rcm/products/rcm-demo-20260908/demo-cap-motorin/1-1-7e80a717c276a813.webp",
  },
  {
    id: "bracelet", brand: "Emanuele Bicocchi", title: "Цепочный браслет", variant: "Серебристый", quantity: 1, price: 6900,
    image: "https://storage.yandexcloud.net/rcm/products/rcm-demo-20260908/demo-bracelet/1-1-4058ac71e20268e7.webp",
  },
];
const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
const delivery = 350;

export function OrderDetailsPreview() {
  const [expanded, setExpanded] = useState(true);
  const [message, setMessage] = useState("");
  return (
    <article className={`${orderStyles.orderRow} ${expanded ? orderStyles.orderRowExpanded : ""} ${styles.preview}`}>
      <button type="button" className={orderStyles.orderToggle} aria-expanded={expanded}
        aria-controls="preview-order-details" onClick={() => setExpanded(value => !value)}>
        <span className={orderStyles.orderField}>
          <span className={orderStyles.orderLabel}>Дата заказа</span><strong>09.09.2026</strong>
        </span>
        <span className={orderStyles.orderField}>
          <span className={orderStyles.orderLabel}>Номер заказа</span><strong>DEMO-1042</strong>
        </span>
        <span className={orderStyles.orderField}>
          <span className={orderStyles.orderLabel}>Статус</span>
          <strong className={`${orderStyles.orderStatus} ${orderStyles.statusWarning}`}>К отправке</strong>
        </span>
        <span className={orderStyles.expandIcon} aria-hidden="true">
          <Icon name={expanded ? "minus" : "plus"} role="utility" />
        </span>
      </button>

      {expanded && <div id="preview-order-details" className={styles.details}>
        <section aria-label="Товары в заказе" className={styles.products}>
          <ul className={styles.productList}>
            {items.map(item => <li key={item.id}>
              <article className={styles.product}>
                <Image src={item.image} alt={item.title} width={80} height={106} className={styles.productImage} />
                <div className={styles.productCopy}>
                  <p className={styles.brand}>{item.brand}</p>
                  <h4>{item.title}</h4>
                  <p className={styles.variant}><span>{item.variant}</span>{item.quantity > 1 && <span>{item.quantity} шт.</span>}</p>
                  <Price amount={item.price * item.quantity} className={styles.productPrice} />
                </div>
              </article>
            </li>)}
          </ul>
        </section>

        <section className={styles.row} aria-labelledby="preview-payment-title">
          <div className={styles.rowHeading}>
            <h3 id="preview-payment-title">Оплата</h3>
            <p className={styles.paid}><Icon name="check-circle" role="utility" />Оплачено</p>
            <p>Банковской картой</p>
          </div>
          <dl className={styles.totals}>
            <div><dt>Товары</dt><dd><Price amount={subtotal} /></dd></div>
            <div><dt>Доставка</dt><dd><Price amount={delivery} /></dd></div>
            <div className={styles.total}><dt>Итого</dt><dd><Price amount={subtotal + delivery} /></dd></div>
          </dl>
        </section>

        <section className={styles.row} aria-labelledby="preview-delivery-title">
          <div className={styles.rowHeading}>
            <h3 id="preview-delivery-title">Доставка</h3>
            <p>СДЭК, пункт выдачи</p>
            <p>Передать до 12 сентября</p>
          </div>
          <div className={styles.delivery}>
            <address className={styles.address}>
              <div><span className={styles.caption}>Пункт выдачи</span><p>Москва, Тестовая улица, 10</p></div>
              <div><span className={styles.caption}>Получатель</span><p>Демонстрационный покупатель</p><p>+7 (900) 000-00-00</p></div>
            </address>
            <div className={styles.actions}>
              <Button type="button" variant="secondary" onClick={() => setMessage("В макете этикетка не создаётся")}>Этикетка</Button>
              <Button type="button" variant="primary" onClick={() => setMessage("Это пример действия — статус заказа не меняется")}>Передать в доставку</Button>
            </div>
            <p role="status" className={styles.actionMessage}>{message}</p>
          </div>
        </section>
      </div>}
    </article>
  );
}
