# RCM Prelaunch Testing Plan

Ручной чеклист перед запуском. Цель - пройти реальные пользовательские сценарии end-to-end и убедиться, что заказ, доставка, оплата, ledger, уведомления и админка сходятся.

## 0. Подготовка окружения

- Запустить backend, frontend, Redis, Postgres, notification-gateway при необходимости.
- Проверить активный Spring profile и env: CDEK test, TBank test/mock, Redis, DB, Telegram.
- Проверить, что CDEK `oauth/token` получает токен, а ошибки не содержат секретов.
- Проверить, что TBank webhook URL и return URL соответствуют текущему окружению.
- Создать тестовых пользователей: покупатель, seller 1, seller 2, seller 3, admin.
- Для каждого seller создать бренд, legal info, активные товары, варианты, остатки и цены.
- Подготовить товары с разными продавцами: один продавец, два продавца, три продавца, четыре продавца.

## 1. Базовый UI И Каталог

- Открыть главную, каталог, страницу товара на desktop и mobile.
- Проверить карточку товара: цена, фото, описание, артикулы, состав, размер, кнопка покупки.
- Проверить товар с одним вариантом: dropdown размера не должен показываться.
- Проверить товар с несколькими вариантами: выбор размера меняет выбранный variant.
- Проверить пустые/неактивные товары не видны покупателю.
- Проверить seller preview и admin preview, если товар не опубликован.

## 2. Корзина

- Добавить товар одного продавца.
- Добавить товары двух и трех продавцов.
- Изменить количество, удалить позицию, обновить страницу.
- Проверить, что cart item содержит `sellerId`.
- Проверить, что нельзя добавить количество больше остатка.
- Проверить merge guest cart -> user cart после входа.

## 3. Checkout: Один Seller

- Заполнить контактные данные.
- Выбрать город, ПВЗ, рассчитать доставку.
- Проверить, что UI показывает одну стоимость доставки и срок.
- Оформить заказ с online payment через mock/TBank test.
- Проверить, что создан один order и один order group.
- Проверить `OrderResponse`: subtotal, deliveryAmount, total.
- Проверить ledger в админке: `COMMISSION_ACCRUED`, `BUYER_DELIVERY_FEE`, при наличии per-seller cost - `DELIVERY_COST_FORWARD`.

## 4. Checkout: Несколько Seller

- Оформить заказ с двумя продавцами.
- Оформить заказ с тремя продавцами.
- Проверить, что покупатель видит один checkout и одну доставку.
- Проверить, что backend создает отдельные seller suborders с одним `orderGroupId`.
- Проверить лимит: корзина с четырьмя продавцами должна получить ошибку и не оформить заказ.
- После подключения per-seller delivery quotes проверить формулу:

```text
buyerDeliveryFee = maxDeliveryQuote + 50% * sum(otherDeliveryQuotes)
maxDeliverySubsidy = commissionTotal / 2
```

- Проверить, что delivery subsidy не превышает cap.
- Проверить, что ledger показывает комиссию, delivery fee, delivery cost и subsidy по каждому seller-order.

## 5. CDEK

- Проверить расчет доставки для ПВЗ.
- Проверить поиск ПВЗ по городу.
- Проверить создание shipment после успешной оплаты.
- Проверить сохранение CDEK number / tracking data, если CDEK возвращает их в test API.
- Проверить sync shipment status вручную и через scheduled job.
- Проверить выключенный CDEK: backend не должен пытаться sync/create shipment.
- Проверить mock-mode: checkout работает без реального обращения в CDEK.
- Проверить ошибки CDEK: неверный токен, недоступный endpoint, невалидный ПВЗ, истекший offer.
- Проверить, что пользователь видит нормальную ошибку, а admin/backend лог содержит диагностичную, но безопасную информацию.

## 6. TBank / Payment

- Создать payment для order group.
- Проверить повторный create payment: pending payment переиспользуется или синхронизируется.
- Пройти успешную оплату.
- Проверить webhook `CONFIRMED`: orders переходят в paid/confirmed, остатки подтверждаются, shipment создается.
- Проверить повторный webhook: ledger и статусы не дублируются.
- Проверить failed/canceled payment: order canceled/failed, reserved stock released.
- Проверить неверный token/signature webhook: запрос отклоняется.
- Проверить неверную сумму webhook: запрос отклоняется.
- Проверить return URL после оплаты.
- Проверить mock gateway как fallback/dev сценарий.

## 7. Ledger И Админка Финансов

- Открыть `/admin?tab=finance`.
- Проверить список движений: дата, тип, сумма, order, order group, seller, buyer, payment.
- Проверить фильтр по entry type.
- Проверить фильтр по order group.
- Проверить summary по текущей выборке: credit, debit, net.
- Для успешного заказа проверить ledger entries:
  - `COMMISSION_ACCRUED` credit;
  - `BUYER_DELIVERY_FEE` credit;
  - `DELIVERY_COST_FORWARD` debit, когда известна фактическая доставка;
  - `DELIVERY_SUBSIDY` debit, когда есть субсидия.
- Проверить idempotency: повтор payment webhook не создает вторые записи.
- Проверить, что суммы order snapshot совпадают с ledger.

## 8. Seller Кабинет

- Seller видит только свои заказы.
- Seller order details показывают товары, количество, адрес/ПВЗ, статус оплаты и доставки.
- Seller получает Telegram-уведомление о новом заказе, если Telegram привязан.
- Seller может скачать/открыть delivery label, когда shipment создан.
- Seller не видит финансовые движения других продавцов.

## 9. Admin Кабинет

- Модерация товаров: approve, revision, block, unblock.
- Заявки seller: approve, reject, комментарий.
- Справочники: create/update/disable category/size.
- Finance tab: найти движение по конкретному order group.
- Telegram test message из admin API/UI, когда UI будет добавлен.
- Проверить, что admin-only endpoints недоступны buyer/seller.

## 10. Telegram

- Привязать Telegram seller через `/start seller_<token>`.
- Проверить повторное использование истекшего token.
- Проверить отвязку Telegram.
- Проверить admin notification: new seller application, product moderation, new order.
- Проверить seller notification: application approved, new order.
- Отключить Telegram env и убедиться, что бизнес-операции не падают.
- При gateway mode проверить auth secret и webhook proxy.

## 11. Возвраты И Отказы

- Полная отмена до оплаты: остатки не должны списаться.
- Отмена/failed payment после резерва: остатки освобождаются.
- Полный refund после успешной оплаты: order/refund/payment статусы обновляются.
- Partial refund: сумма не превышает доступную к возврату.
- Частичный возврат одного seller-order в multi-seller order group.
- Обычный отказ покупателя после передачи в доставку: delivery fee не возвращается.
- Возврат по браку seller: delivery/refund/seller debit должны быть отражены в ledger.
- Проверить, что RCM net после возврата виден через ledger.

## 12. Risk И Антифрод

- Покупатель с нормальной историей получает стандартную delivery subsidy.
- Покупатель с `refusalRate > 50%` при минимум двух заказах должен потерять subsidy после реализации risk logic.
- Проверить ручной admin override risk/subsidy, когда будет добавлен.
- Проверить крупный заказ с последующим отказом: все расходы видны в ledger.

## 13. Security И Доступы

- Buyer не может открыть seller/admin endpoints.
- Seller не может открыть admin endpoints.
- Seller не может открыть чужой order.
- Webhook endpoints проверяют подписи/secrets.
- Логи не печатают CDEK/TBank/Telegram secrets.
- `.env` и локальные секреты не попадают в git.

## 14. Mobile Regression

- Главная, товар, корзина, checkout, account orders.
- Seller cabinet: orders/products/brand/legal.
- Admin cabinet: products/sellers/dictionaries/finance.
- Проверить, что таблица finance скроллится горизонтально и не ломает layout.

## 15. Финальная Сверка Перед Запуском

- Один успешный заказ через полный production-like flow.
- Один failed/canceled payment.
- Один multi-seller order.
- Один refund.
- Один CDEK error сценарий.
- Один Telegram notification сценарий.
- Сверить Postgres: orders, payments, refunds, delivery_shipments, financial_ledger_entries.
- Сверить UI: buyer account, seller order, admin finance.
