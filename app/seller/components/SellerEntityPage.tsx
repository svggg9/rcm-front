"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { EditorSurface } from "../../components/ui/EditorSurface";
import { Button } from "../../components/ui/Button";
import { CabinetSkeleton } from "../../components/ui/CabinetSkeleton";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { apiFetch, API_URL } from "../../lib/api";
import { getSellerReturn, inspectSellerReturn, markSellerReturnReceived, returnReasonLabels, returnStatusLabels, type ReturnRequest } from "../../lib/returns";
import { OrderDetailsPanel } from "./OrderDetailsPanel";
import { ReturnInspectionForm } from "./ReturnInspectionForm";
import type { SellerOrder } from "../types";
import styles from "./SellerEntityPage.module.css";

export function SellerEntityPage({ id, kind, intercepted = false, onClose }: {
  id: number; kind: "orders" | "returns"; intercepted?: boolean; onClose?: () => void;
}) {
  const router = useRouter();
  const [order, setOrder] = useState<SellerOrder | null>(null);
  const [request, setRequest] = useState<ReturnRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const inFlight = useRef(false);
  const title = `${kind === "orders" ? "Заказ" : "Возврат"} №${id}`;
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      if (kind === "returns") return setRequest(await getSellerReturn(id, controller.signal));
      const response = await apiFetch(`${API_URL}/api/seller/orders/${id}`, { signal: controller.signal });
      if (!response.ok) throw new Error(response.status === 403 || response.status === 404
        ? "Заказ не найден или недоступен" : "Не удалось загрузить заказ");
      setOrder(await response.json());
    }
    void load().catch(e => {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Не удалось загрузить данные");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, kind, attempt]);
  useEffect(() => {
    if (!dirty && !busy) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty, busy]);
  function close() {
    if (intercepted) {
      if (dirty) { try { sessionStorage.removeItem(`seller-return-inspection-${id}`); } catch { /* Storage is optional. */ } }
      if (onClose) onClose();
      else router.back();
    }
    else router.push(`/seller/${kind}`, { scroll: false });
  }
  async function update(action: () => Promise<ReturnRequest>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setError(null); setFeedback(null);
    try {
      const updated = await action();
      setRequest(updated); setDirty(false);
      try { sessionStorage.removeItem(`seller-return-inspection-${id}`); } catch { /* Storage is optional. */ }
      window.dispatchEvent(new CustomEvent("seller-return-updated", { detail: updated }));
      setFeedback("Изменения сохранены");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить изменения");
    } finally { inFlight.current = false; setBusy(false); }
  }
  const content = <div className={styles.content}>
    {loading ? <CabinetSkeleton variant="list" rows={3} compact /> : null}
    {error ? <div className="alertDanger" role="alert"><p>{error}</p>
      {!order && !request && <Button onClick={() => { setError(null); setLoading(true); setAttempt(n => n + 1); }}>Повторить</Button>}
    </div> : null}
    {!loading && order ? <OrderDetailsPanel order={{ ...order,
      firstProductTitle: order.items[0]?.productTitle ?? null, firstImageUrl: order.items[0]?.imageUrl ?? null,
      productTitles: order.items.map(item => item.productTitle), itemsCount: order.items.length }}
      details={order} loading={false} error={false} onRetry={() => setAttempt(n => n + 1)}
      audience="seller" showDeliveryLabel openButtonLabel="Открыть заказ" /> : null}
    {!loading && request ? <>
      <StatusBadge tone={request.status === "REJECTED" ? "danger" : ["REFUNDED", "CLOSED"].includes(request.status) ? "success" : "warning"}>
        {returnStatusLabels[request.status]}
      </StatusBadge>
      <h2>{request.productTitle}</h2>
      <p>Заказ №{request.orderId} · {request.quantity} шт.{request.sku ? ` · Артикул ${request.sku}` : ""}</p>
      <dl className={styles.facts}>
        <div><dt>Причина</dt><dd>{returnReasonLabels[request.reason]}</dd></div>
        <div><dt>Запрошено</dt><dd>{money(request.requestedAmount)}</dd></div>
        <div><dt>Согласовано</dt><dd>{money(request.approvedRefundAmount)}</dd></div>
        <div><dt>Создан</dt><dd>{new Date(request.createdAt).toLocaleString("ru-RU")}</dd></div>
        {request.cdekNumber && <div><dt>Накладная СДЭК</dt><dd>{request.cdekNumber}</dd></div>}
      </dl>
      {request.comment && <section><h3>Комментарий покупателя</h3><p className={styles.comment}>{request.comment}</p></section>}
      {request.photoUrls?.length > 0 && <div className={styles.photos}>{request.photoUrls.map((url, index) =>
        <a key={url} href={url} target="_blank" rel="noreferrer" aria-label={`Фото возврата ${index + 1}, открыть оригинал`}>
          <Image src={url} alt={`Фото возврата ${index + 1}`} width={160} height={160} />
        </a>)}</div>}
      {request.adminComment && <section><h3>Комментарий администратора</h3><p className={styles.comment}>{request.adminComment}</p></section>}
      {request.sellerComment && <section><h3>Результат проверки</h3><p className={styles.comment}>{request.sellerComment}</p></section>}
      {request.resellable != null && request.status !== "RECEIVED" && <p>{request.resellable ? "Товар пригоден к продаже" : "Товар нельзя вернуть в продажу"}</p>}
      {request.trackingUrl && <a href={request.trackingUrl} target="_blank" rel="noreferrer" className="buttonSecondary">Отследить отправление</a>}
      {["AWAITING_SHIPMENT", "WAITING_FOR_ITEM", "IN_TRANSIT"].includes(request.status) &&
        <Button disabled={busy} loading={busy} onClick={() => void update(() => markSellerReturnReceived(id))}>Подтвердить получение товара</Button>}
      {request.status === "RECEIVED" && <section><h3>Проверка товара</h3>
        <ReturnInspectionForm key={request.id} request={request} loading={busy} disabled={busy}
          onDirtyChange={setDirty} persistDraft onInspect={values => update(() => inspectSellerReturn(id, values))} />
      </section>}
    </> : null}
    {feedback && <div className="alertSuccess" role="status">{feedback}</div>}
  </div>;
  if (intercepted) return <EditorSurface title={title} dirty={dirty} busy={busy} closeLabel="Закрыть детали" onClose={close}>{content}</EditorSurface>;
  return <main className={styles.page}><header className={styles.header}>
    <Button variant="ghost" disabled={busy} onClick={() => {
      if (!dirty || window.confirm("Выйти из проверки? Черновик сохранён в этом браузере.")) close();
    }}>← К списку {kind === "orders" ? "заказов" : "возвратов"}</Button><h1>{title}</h1>
  </header>{content}</main>;
}
function money(value: number | null) {
  return value == null ? "—" : new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(value);
}
