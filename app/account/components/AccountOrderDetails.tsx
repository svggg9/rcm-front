"use client";
import { paymentConfirmationUrl } from "../../lib/paymentRedirect";

import { useEffect, useRef, useState } from "react";

import { Button } from "../../components/ui/Button";
import Link from "next/link";
import { Price } from "../../components/ui/Price";
import { Loader } from "../../components/ui/Loader";
import { AccountProductRow } from "./AccountProductRow";
import { accountApiError, orderDate, orderNumber, orderTone, itemCount, shortDeliveryAddress } from "../lib/presentation";
import styles from "./AccountCommerce.module.css";
import { API_URL, apiFetch } from "../../lib/api";
import { formatCdekShipmentStatus } from "../../lib/delivery";
import { formatRussianPhone } from "../../lib/phone";
import {
  getOrderReturns,
  type ReturnRequest,
} from "../../lib/returns";

import type { Order } from "../types";
import { AccountReturnRequest } from "./AccountReturnRequest";
import { useOrderPaymentSync } from "../lib/useOrderPaymentSync";

type Props = {
  order: Order;
  onOrderUpdated: (order: Order, updatedOrderGroupId?: string) => void;
  formatOrderStatus: (status: Order["status"]) => string;
  formatPaymentStatus: (status: Order["paymentStatus"]) => string;
  formatDeliveryStatus: (status: Order["deliveryStatus"]) => string;
  buildOrderStatusLabel: (order: Order) => string;
};

export function AccountOrderDetails({
  order,
  onOrderUpdated,
  formatPaymentStatus,
  formatDeliveryStatus,
  buildOrderStatusLabel,
}: Props) {
  const [clock, setClock] = useState(() => Date.now());
  const [group, setGroup] = useState<Order[] | null>(null);
  const [groupError, setGroupError] = useState(false);
  const [groupRetry, setGroupRetry] = useState(0);
  useEffect(() => {
    let stopped = false;
    setGroupError(false);
    void apiFetch(`${API_URL}/api/orders/${order.id}/group`, {signal: AbortSignal.timeout(15000)}).then(async response => {
      if (!response.ok) throw new Error();
      const data = await response.json() as Order[];
      if (!Array.isArray(data) || !data.length || !data.some(item => item.id === order.id)) throw new Error();
      if (!stopped) setGroup(data);
    }).catch(() => { if (!stopped) setGroupError(true); });
    return () => { stopped = true; };
  }, [order.id, groupRetry]);
  useEffect(() => {
    if (order.paymentStatus !== "PENDING") return;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [order.paymentStatus]);
  const [paying, setPaying] = useState(false);
  const { checkingPayment, paymentPending, paymentSyncError } = useOrderPaymentSync(order, onOrderUpdated);
  const [payError, setPayError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancellation, setConfirmCancellation] = useState(false);
  const [cancellationError, setCancellationError] = useState<string | null>(null);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [returnsLoading,setReturnsLoading]=useState(true);
  const [returnsError,setReturnsError]=useState(false);
  const [returnsRetry,setReturnsRetry]=useState(0);
  const latestOrder = useRef({ order, onOrderUpdated });
  useEffect(() => { latestOrder.current = { order, onOrderUpdated }; }, [order, onOrderUpdated]);
  const [cancellationWindowOpen, setCancellationWindowOpen] = useState(() =>
    isCancellationWindowOpen(order.cancellationAvailableUntil)
  );

  const awaitingPayment = order.status === "NEW" && order.paymentStatus === "PENDING";
  const [paymentDeadlineOpen, setPaymentDeadlineOpen] = useState(() =>
    !order.paymentDueAt || new Date(order.paymentDueAt).getTime() > Date.now()
  );
  const canPay = Boolean(group) && awaitingPayment && !checkingPayment && order.paymentAllowed !== false && paymentDeadlineOpen
    && !order.unpaidCancellationPending && !order.paymentReviewRequired;
  const canCancel =
    order.cancellationAllowed &&
    (awaitingPayment || cancellationWindowOpen) &&
    !order.cancellationRequestedAt && !order.unpaidCancellationPending;
  const cancellationPending =
    Boolean(order.cancellationRequestedAt || order.unpaidCancellationPending) &&
    order.paymentStatus !== "REFUNDED" &&
    order.status !== "CANCELED";
  const returnsAvailable =
    order.paymentStatus === "PAID" &&
    (order.status === "COMPLETED" || order.deliveryStatus === "DELIVERED") &&
    (order.returnAvailableUntil === undefined || Boolean(order.returnAvailableUntil && new Date(order.returnAvailableUntil).getTime() > Date.now()));

  useEffect(() => {
    let cancelled = false;
    let pending = false;
    const load = () => {
      if (pending) return Promise.resolve();
      pending = true;
      return getOrderReturns(order.id)
      .then(async (items) => {
        if (cancelled) return;
        setReturns(items);
        setReturnsError(false);
        setReturnsLoading(false);
        if (items.some(item => ["REFUND_PENDING", "PARTIALLY_REFUNDED", "REFUNDED"].includes(item.status))) {
          const response = await apiFetch(`${API_URL}/api/orders/${order.id}`);
          if (!response.ok || cancelled) return;
          const updated = await response.json() as Order;
          if (!cancelled && updated.id === latestOrder.current.order.id && JSON.stringify(updated) !== JSON.stringify(latestOrder.current.order)) {
            latestOrder.current.onOrderUpdated(updated);
          }
        }
      })
      .catch(() => {
        if (!cancelled) { setReturnsError(true); setReturnsLoading(false); }
      }).finally(() => { pending = false; });
    };
    void load();
    const timer = setInterval(() => { if (!document.hidden) void load(); }, 15000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [order.id, returnsRetry]);

  useEffect(() => {
    const deadline = order.cancellationAvailableUntil
      ? new Date(order.cancellationAvailableUntil).getTime()
      : Number.NaN;
    const remaining = deadline - Date.now();

    setCancellationWindowOpen(Number.isFinite(deadline) && remaining > 0);
    if (!Number.isFinite(deadline) || remaining <= 0) return;

    const timeout = window.setTimeout(
      () => setCancellationWindowOpen(false),
      Math.min(remaining, 2_147_483_647)
    );
    return () => window.clearTimeout(timeout);
  }, [order.cancellationAvailableUntil]);

  useEffect(() => {
    const deadline = order.paymentDueAt ? new Date(order.paymentDueAt).getTime() : Number.NaN;
    const remaining = deadline - Date.now();
    setPaymentDeadlineOpen(!order.paymentDueAt || Number.isFinite(deadline) && remaining > 0);
    if (!Number.isFinite(deadline) || remaining <= 0) return;
    const timer = window.setTimeout(() => setPaymentDeadlineOpen(false), Math.min(remaining, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [order.paymentDueAt]);

  async function handlePay() {
    if (!canPay || paying) return;

    setPaying(true);
    setPayError(null);

    try {
      const response = await apiFetch(
        `${API_URL}/api/payments/group/${encodeURIComponent(order.orderGroupId)}`,
        { method: "POST" }
      );

      if (!response.ok) {
        throw new Error(await accountApiError(response, "Не удалось открыть оплату — попробуйте ещё раз"));
      }

      const data: { confirmationUrl?: string } = await response.json();

      const confirmationUrl = paymentConfirmationUrl(data.confirmationUrl);
      if (!confirmationUrl) {
        throw new Error("Не удалось открыть оплату — попробуйте ещё раз");
      }

      window.location.href = confirmationUrl;
    } catch (error) {
      setPayError(error instanceof Error && !(error instanceof TypeError) && !(error instanceof DOMException) ? error.message : "Не удалось открыть оплату — попробуйте ещё раз");
    } finally {
      setPaying(false);
    }
  }

  async function handleCancel() {
    if (!canCancel || cancelling) return;

    setCancelling(true);
    setCancellationError(null);

    try {
      const response = await apiFetch(`${API_URL}/api/orders/${order.id}/cancel`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(await accountApiError(response, "Не удалось отменить заказ"));
      }

      const updatedOrder = (await response.json()) as Order;
      onOrderUpdated(
        updatedOrder,
        awaitingPayment ? updatedOrder.orderGroupId : undefined
      );
      setConfirmCancellation(false);
    } catch (error) {
      setCancellationError(
        error instanceof Error ? error.message : "Не удалось отменить заказ"
      );
    } finally {
      setCancelling(false);
    }
  }

  const paymentTotal = group?.reduce((sum, item) => sum + item.totalAmount, 0);
  const remaining = order.paymentDueAt ? Math.max(0, Math.ceil((new Date(order.paymentDueAt).getTime() - clock) / 1000)) : null;
  const stageIndex = ["PENDING", "READY_FOR_SHIPMENT", "IN_TRANSIT", "READY_FOR_PICKUP", "DELIVERED"].indexOf(order.deliveryStatus);
  const progressVisible = order.status !== "CANCELED" && !["RETURNED", "CANCELLED"].includes(order.deliveryStatus);
  const stages = ["Создан", "Готовится к отправке", "В пути", "Можно получить", "Получен"];
  return <section className={styles.page}>
    <div className={styles.meta}><span className={styles.status} data-tone={orderTone(order)}>{buildOrderStatusLabel(order)}</span><time dateTime={order.createdAt}>{orderDate(order.createdAt)}</time></div>
    {awaitingPayment || cancellationPending || order.paymentReviewRequired || canCancel ? <div className={styles.actions}>
      {canPay && remaining !== null ? <div className={styles.deadline}>Оплатите в течение {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2,"0")}</div> : null}
      {checkingPayment ? <Loader inline label="Проверка оплаты"/> : null}
      {paymentSyncError ? <div className={styles.error} role="status">Не удалось проверить оплату — повторим автоматически</div> : null}
      {groupError && awaitingPayment ? <div className={styles.error}>Не удалось загрузить сумму покупки <button className="buttonGhost" onClick={() => setGroupRetry(value => value + 1)}>Повторить</button></div> : null}
      {!group && !groupError && awaitingPayment ? <Loader inline label="Проверка суммы покупки"/> : null}
      {canPay ? <Button variant="primary" loading={paying} onClick={() => void handlePay()}>{paymentPending ? "Продолжить оплату" : "Оплатить"}{paymentTotal !== undefined ? <> · <Price amount={paymentTotal}/></> : null}</Button> : null}
      {cancellationPending ? <div className={styles.notice} role="status"><strong>Отмена оформляется</strong>{order.unpaidCancellationPending ? "Проверяем результат оплаты. Товары остаются зарезервированы до завершения проверки" : "Деньги вернутся тем же способом оплаты"}</div> : null}
      {order.paymentReviewRequired && !cancellationPending ? <div className={styles.notice} role="status"><strong>Проверяем оплату</strong>Если деньги списаны, мы проверим платёж и сообщим результат</div> : null}
      {awaitingPayment && !paymentDeadlineOpen && !order.paymentReviewRequired && !cancellationPending ? <div className={styles.notice}>Срок оплаты истёк — проверяем завершение заказа</div> : null}
      {canCancel && !confirmCancellation ? <Button variant="ghost" onClick={() => setConfirmCancellation(true)}>Отменить заказ</Button> : null}
      {canCancel && confirmCancellation ? <div className={styles.confirm}><strong>{awaitingPayment ? "Отменить неоплаченную покупку?" : "Отменить заказ?"}</strong><p>{awaitingPayment ? "Отменим все отправления этой покупки. Если платёж уже начат, сначала проверим его результат" : "Деньги вернутся тем же способом оплаты"}</p><Button variant="secondary" loading={cancelling} onClick={() => void handleCancel()}>Да, отменить</Button><Button variant="ghost" disabled={cancelling} onClick={() => setConfirmCancellation(false)}>Не отменять</Button></div> : null}
      {payError || cancellationError ? <div className={styles.error} role="alert">{payError || cancellationError}</div> : null}
    </div> : null}
    {group && group.length > 1 ? <div className={styles.group}><span>Отправления этой покупки:</span>{group.map(item => <Link key={item.id} href={`/account?tab=orders&orderId=${item.id}`} aria-current={item.id === order.id ? "page" : undefined}>№ {orderNumber(item)}</Link>)}</div> : null}
    <section className={styles.section} aria-label="Доставка"><h2>Доставка</h2>
      <div className={styles.deliveryGrid}>
        <div className={styles.deliveryAddress}>
          <p>{formatDeliveryMethod(order.deliveryMethod)}</p>
          <p>{shortDeliveryAddress(order.deliveryAddress)}</p>
        </div>
        <div className={styles.deliveryInfo} role="group" aria-label="Получатель">
          <p>{order.recipientName}</p>
          <p className={styles.muted}>{formatRussianPhone(order.recipientPhone)}</p>
        </div>
        {order.delivery?.trackingUrl || order.delivery?.cdekNumber || order.trackingNumber || order.delivery?.shipmentStatus ?
          <div className={styles.deliveryInfo} role="group" aria-label="Отправление">
            {order.delivery?.trackingUrl ? <a className={styles.link} href={order.delivery.trackingUrl} target="_blank" rel="noreferrer">Отследить отправление{"\u00a0"}↗</a> : null}
            {order.delivery?.cdekNumber || order.trackingNumber ? <p className={styles.muted}>Трек-номер: {order.delivery?.cdekNumber || order.trackingNumber}</p> : null}
            {order.delivery?.shipmentStatus ? <p className={styles.muted}>{formatCdekShipmentStatus(order.delivery.shipmentStatus)}</p> : null}
          </div> : null}
      </div>
    </section>
    {progressVisible ? <div className={styles.progress} aria-label={`Доставка: ${formatDeliveryStatus(order.deliveryStatus)}`}>{stages.map((stage,index) => <span key={stage} className={styles.stage} data-done={index <= Math.max(stageIndex,0)}>{stage}</span>)}</div> : null}
    <section className={styles.section} aria-label="Товары в заказе"><div className={styles.products}>{order.items.map(item => <AccountProductRow key={item.variantId} item={item}/>)}</div></section>
    <section className={styles.section}><h2>Оплата</h2><div className={styles.address}>{paymentMethodLabel(order.paymentMethod)}<br/><span className={styles.muted}>{formatPaymentStatus(order.paymentStatus)}</span></div></section>
    <section className={styles.summary} aria-label="Стоимость заказа"><dl>
      <div><dt>Количество</dt><dd>{itemCount(order.items.reduce((sum,item)=>sum+item.quantity,0))}</dd></div>
      <div><dt>Стоимость товаров</dt><dd><Price amount={order.subtotalAmount}/></dd></div>
      <div><dt>Доставка</dt><dd>{order.deliveryAmount === 0 ? "Бесплатно" : <Price amount={order.deliveryAmount}/>}</dd></div>
      {order.discountAmount > 0 ? <div><dt>Скидка</dt><dd>−<Price amount={order.discountAmount}/></dd></div> : null}
      <div className={styles.total}><dt>{group && group.length > 1 ? "Итого за отправление" : "Итого"}</dt><dd><Price amount={order.totalAmount}/></dd></div>
      {group && group.length > 1 ? <div><dt>Вся покупка</dt><dd><Price amount={paymentTotal!}/></dd></div> : null}
    </dl></section>
    {returnsError && returnsAvailable ? <div className={styles.error}>Не удалось проверить доступные возвраты <button className="buttonGhost" onClick={()=>setReturnsRetry(value=>value+1)}>Повторить</button></div> : null}
    {returnsLoading && returnsAvailable ? <Loader inline label="Проверка возвратов"/> : null}
    {!returnsLoading && !returnsError && (returnsAvailable || returns.length > 0) ? <AccountReturnRequest order={order} existingReturns={returns} onCreated={request=>setReturns(current=>[request,...current.filter(item=>item.id!==request.id)])}/> : null}
  </section>;
}
function paymentMethodLabel(value?: string | null) {
  if (value === "CARD") return "Банковской картой";
  if (value === "SBP") return "СБП";
  return "Способ оплаты уточняется";
}
function isCancellationWindowOpen(value: string | null) { return Boolean(value && new Date(value).getTime() > Date.now()); }
function formatDeliveryMethod(value: string) { return value === "COURIER" ? "Курьером" : value === "PICKUP_POINT" || value === "PICKUP" ? "Пункт выдачи СДЭК" : "Доставка"; }
