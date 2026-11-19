"use client";

import { useState } from "react";
import { OrderWorkflowSummary } from "../components/order-detail/OrderWorkflowSummary";
import { ReturnWorkflowSummary } from "../components/order-detail/ReturnWorkflowSummary";
import { DeliveryProgress } from "../components/order-detail/DeliveryProgress";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { SellerOrderCard, type OrderCardDetails, type SellerOrderCardListItem } from "../seller/components/SellerOrderCard";
import styles from "./OrderDetailsPreview.module.css";

const demoOrder: SellerOrderCardListItem = {
  id: 1042, orderGroupId: "DEMO-1042", createdAt: "2026-11-07T12:00:00Z",
  currency: "RUB", status: "PAID", paymentStatus: "PAID", deliveryStatus: "READY_FOR_SHIPMENT",
  deliveryStatusChangedAt: null, recipientName: "Демонстрационный покупатель",
  firstProductTitle: "Бейсболка Motorin", firstImageUrl: null, productTitles: ["Бейсболка Motorin", "Цепочный браслет"],
  itemsCount: 2, totalAmount: 13150,
};

const demoDetails: OrderCardDetails = {
  workflow: {
    version: 1, audience: "SELLER", evaluatedAt: "2026-11-07T12:00:00Z",
    events: [{ code: "PAID", occurredAt: "2026-11-07T11:00:00Z" }],
    actions: [
      { code: "SHIP", allowed: false, reasonCode: "CANCELLATION_WINDOW_OPEN", reason: "Ещё действует срок отмены покупателем", scope: "ORDER", availableUntil: null },
      { code: "DOWNLOAD_LABEL", allowed: true, reasonCode: null, reason: null, scope: "ORDER", availableUntil: null },
    ],
  },
  paidAt: null, subtotalAmount: 12800, deliveryAmount: 350, discountAmount: 0, totalAmount: 13150, currency: "RUB",
  recipientName: "Демонстрационный покупатель", recipientPhone: "79000000000",
  deliveryAddress: "Москва, Тестовая улица, 10", deliveryMethod: "PICKUP_POINT", trackingNumber: null, delivery: null,
  items: [
    { productId: 1, variantId: 1, sellerId: 1, productPublicId: null, sku: "", productTitle: "Бейсболка Motorin", brandName: "Zegna",
      color: "Бежевый", size: null, quantity: 1, price: 5900, lineTotal: 5900,
      imageUrl: "https://storage.yandexcloud.net/rcm/products/rcm-demo-20260908/demo-cap-motorin/1-1-7e80a717c276a813.webp" },
    { productId: 2, variantId: 2, sellerId: 1, productPublicId: null, sku: "", productTitle: "Цепочный браслет", brandName: "Emanuele Bicocchi",
      color: "Серебристый", size: null, quantity: 1, price: 6900, lineTotal: 6900,
      imageUrl: "https://storage.yandexcloud.net/rcm/products/rcm-demo-20260908/demo-bracelet/1-1-4058ac71e20268e7.webp" },
  ],
};

const deliveryStates = [
  { value: "PENDING", label: "Создан" },
  { value: "READY_FOR_SHIPMENT", label: "Готовится" },
  { value: "IN_TRANSIT", label: "В пути" },
  { value: "READY_FOR_PICKUP", label: "Можно получить" },
  { value: "DELIVERED", label: "Получен" },
] as const;

export function OrderDetailsPreview() {
  const [message, setMessage] = useState("");
  const [deliveryState, setDeliveryState] = useState<(typeof deliveryStates)[number]["value"]>("IN_TRANSIT");
  const localRefresh = () => setMessage("Данные примера обновлены");
  return <div id="preview-order-details" className={styles.preview}>
    <h3>Заказ продавца</h3>
    <p className="textHint">Рабочая карточка и панель заказа с условными данными. Откройте заказ, чтобы увидеть состав, оплату и доставку</p>
    <SellerOrderCard order={demoOrder} statusLabel="К отправке" showStageElapsed={false} showDeliveryLabel={false}
      onLoadDetails={async () => demoDetails} onWorkflowRefresh={localRefresh}
      onOpenOrder={() => setMessage("Это пример заказа — рабочие данные не меняются")} />
    <p role="status" className="textHint">{message}</p>

    <section aria-label="Пример истории заказа покупателя">
      <h3>История заказа покупателя</h3>
      <OrderWorkflowSummary workflow={{ version: 1, audience: "BUYER", evaluatedAt: "2026-11-08T12:00:00Z",
        events: [{ code: "CREATED", occurredAt: "2026-11-08T11:00:00Z" }, { code: "PAID", occurredAt: "2026-11-08T11:01:00Z" }],
        actions: [
          { code: "PAY", allowed: false, reasonCode: "INVALID_STATE", reason: "Действие недоступно на текущем этапе заказа", scope: "ORDER_GROUP", availableUntil: null },
          { code: "CANCEL", allowed: true, reasonCode: null, reason: null, scope: "ORDER", availableUntil: null },
          { code: "REQUEST_RETURN", allowed: false, reasonCode: "NOT_DELIVERED", reason: "Возврат доступен после получения заказа", scope: "ORDER", availableUntil: null },
        ],
      }} onRefresh={localRefresh} />
    </section>
    <section aria-label="Пример действий возврата">
      <h3>Возврат</h3>
      <ReturnWorkflowSummary workflow={{ version: 1, audience: "SELLER", evaluatedAt: "2026-11-07T12:00:00Z",
        events: [{ code: "CREATED", occurredAt: "2026-11-06T11:00:00Z" }],
        actions: [
          { code: "RECEIVE", allowed: true, reasonCode: null, reason: null },
          { code: "INSPECT", allowed: false, reasonCode: "INVALID_STATE", reason: "Сначала подтвердите получение товара" },
        ],
      }} onRefresh={localRefresh} />
    </section>
    <section aria-label="Пример этапов доставки">
      <h3>Этапы доставки покупателя</h3>
      <SegmentedControl items={deliveryStates} value={deliveryState} onChange={setDeliveryState} ariaLabel="Этап доставки в примере" />
      <DeliveryProgress status={deliveryState} />
    </section>
  </div>;
}
