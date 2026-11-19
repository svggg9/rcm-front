"use client";

import { useState } from "react";
import { AccountOrdersTab } from "../account/components/AccountOrdersTab";
import { ProductActionsMenu } from "../seller/components/SellerProductActions";
import type { OrderListItem } from "../lib/order-contract";
import styles from "./ProjectCoverage.module.css";

const areas = [
  {
    name: "Покупатель",
    description: "Поиск и выбор товаров, корзина, покупка и история заказа",
    links: [
      ["Карточка товара", "#ds-product-tile"],
      ["Покупка и фильтры", "#buyer-commerce"],
      ["Избранное", "#ds-favorite-card"],
      ["Оформление заказа", "#checkout-example"],
      ["Доставка и история заказа", "#lists"],
      ["Поддержка", "#ds-support-chat"],
      ["Профиль", "#buyer-profile"],
      ["Заявка на возврат", "#buyer-returns"],
    ],
  },
  {
    name: "Продавец",
    description: "Магазин, товары, заказы и показатели",
    links: [
      ["Магазин", "#seller-store-example"],
      ["Редактор товара", "#product-editor"],
      ["Финансы продавца", "#seller-finance"],
      ["Раскрывающиеся разделы", "#lists"],
      ["Заказы продавца", "#seller-orders"],
      ["Возвраты продавца", "#seller-returns"],
      ["Реквизиты продавца", "#seller-legal"],
      ["Показатели", "#analytics"],
    ],
  },
  {
    name: "Администратор",
    description: "Навигация, операционные очереди, таблицы и поддержка",
    links: [
      ["Навигация и таблицы", "#lists"],
      ["Операции на проверке", "#operation-alerts"],
      ["Модерация", "#ds-admin-moderation"],
      ["Финансы", "#ds-admin-finance"],
      ["Показатели", "#analytics"],
      ["Диалог поддержки", "#ds-support-chat"],
      ["Ошибки и состояния", "#api-errors"],
    ],
  },
] as const;

const exampleOrder: OrderListItem = {
  id: 1042,
  orderGroupId: "DEMO-1042",
  createdAt: "2026-11-07T12:00:00+03:00",
  currency: "RUB",
  status: "SHIPPED",
  paymentStatus: "PAID",
  deliveryStatus: "IN_TRANSIT",
  deliveryAddress: "Санкт-Петербург, Примерная улица, 10",
  firstImageUrl: "/examples/demo-shirt-front.svg",
  firstProductTitle: "Рубашка из хлопка",
  imageUrls: ["/examples/demo-shirt-front.svg"],
  productTitles: ["Рубашка из хлопка"],
  itemsCount: 1,
  totalAmount: 5900,
  returnAvailableUntil: null,
};

export function ProjectCoverage() {
  const [opened, setOpened] = useState(false);
  const [productAction, setProductAction] = useState("");
  return <div className={styles.coverage}>
    <div className={styles.areas}>
      {areas.map(area => <article key={area.name} className={styles.area}>
        <h3>{area.name}</h3>
        <p>{area.description}</p>
        <ul>{area.links.map(([label, href]) => <li key={label}><a href={href}>{label}</a></li>)}</ul>
      </article>)}
    </div>
    <p className={styles.note}>Ссылки ведут к уже показанным рабочим компонентам и примерам. Они не означают, что каждый экран и состояние проекта уже представлены</p>
    <section className={styles.example} aria-labelledby="ds-buyer-order-list">
      <div className={styles.exampleHeading}>
        <h3 id="ds-buyer-order-list">Заказ в кабинете покупателя</h3>
        <p>Рабочий список заказов на условных данных. Открытие не меняет настоящий заказ</p>
      </div>
      <div onClickCapture={event => event.preventDefault()} onAuxClickCapture={event => event.preventDefault()}>
        <AccountOrdersTab orders={[exampleOrder]} buildOrderStatusLabel={() => "В пути"} onOpenOrder={() => setOpened(true)} />
      </div>
      <p className={styles.note} role="status">{opened ? "В примере выбран заказ № 1042" : "Нажмите на заказ, чтобы проверить выбор"}</p>
    </section>
    <section className={styles.example} aria-labelledby="ds-seller-product-actions">
      <div className={styles.exampleHeading}>
        <h3 id="ds-seller-product-actions">Действия с товаром продавца</h3>
        <p>Рабочее меню товара с условными действиями и причиной недоступности</p>
      </div>
      <div className={styles.actionDemo}>
        <span>Рубашка из хлопка</span>
        <ProductActionsMenu label="Действия с товаром в примере"
          items={[{ action: "archive" }, { action: "delete", reason: "В примере удаление недоступно" }]}
          onCreateCollection={() => setProductAction("Создать подборку")}
          onAction={() => setProductAction("В архив")} />
      </div>
      <p className={styles.note} role="status">{productAction ? `Выбрано: ${productAction}. Данные не менялись` : "Откройте меню и выберите действие"}</p>
    </section>
  </div>;
}
