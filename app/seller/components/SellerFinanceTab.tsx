"use client";

import { useEffect, useRef, useState, type ReactNode, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CabinetSkeleton } from "../../components/ui/CabinetSkeleton";
import { Icon } from "../../components/ui/Icon";
import { lockModalScroll } from "../../components/ui/modalScrollLock";
import { getFinanceData, exportFinanceOperations } from "../lib/sellerFinanceApi";
import type { PageResponse, SellerFinanceOperation, SellerFinanceSummary, SellerPayout, SellerPayoutDetail, SellerPayoutStatus } from "../types";
import styles from "./SellerFinanceTab.module.css";

type Props = { finance: SellerFinanceSummary | null; loading?: boolean; error?: ReactNode; onRefresh?: () => void; onPrefetchOrder?: (orderId: number) => void };
const labels: Record<SellerPayoutStatus, string> = { READY: "Готова к отправке", SENT: "Отправлена", PAID: "Выплачена", FAILED: "Требует внимания", CANCELLED: "Отменена" };
const operationLabels = { SALE: "Продажа", SELLER_DEBIT: "Возврат / удержание", SELLER_PAYOUT: "Выплата" };

function useFinanceData<T>(path: string) {
  const [attempt, setAttempt] = useState(0);
  const key = `${path}:${attempt}`;
  const [result, setResult] = useState<{ key: string; data?: T; error?: string }>();
  useEffect(() => {
    const controller = new AbortController();
    getFinanceData<T>(path, controller.signal).then(
      data => { if (!controller.signal.aborted) setResult({ key, data }); },
      error => { if (!controller.signal.aborted) setResult({ key, error: error instanceof Error ? error.message : "Не удалось загрузить данные" }); }
    );
    return () => controller.abort();
  }, [path, key]);
  return { data: result?.key === key ? result.data : undefined, error: result?.key === key ? result.error : undefined,
    loading: result?.key !== key, retry: () => setAttempt(value => value + 1) };
}

export function SellerFinanceTab({ finance, loading, error, onRefresh, onPrefetchOrder }: Props) {
  const params = useSearchParams();
  const view = params.get("view");
  const payoutId = params.get("payout");
  return <section className={styles.root} aria-label="Финансы">
    {view === "operations" ? <Operations onPrefetchOrder={onPrefetchOrder} />
      : view === "payouts" ? <Payouts />
      : loading ? <CabinetSkeleton variant="dashboard" rows={3} compact />
      : error ? error : finance ? <><div className={styles.heading}><h2>Обзор финансов</h2><button className={styles.textButton} onClick={onRefresh}>Обновить</button></div><Overview finance={finance} onPrefetchOrder={onPrefetchOrder} /></>
      : <p className={styles.empty}>Финансовая сводка временно недоступна</p>}
    {payoutId && /^\d+$/.test(payoutId) ? <PayoutDetails key={payoutId} id={payoutId} /> : null}
  </section>;
}

function Overview({ finance, onPrefetchOrder }: { finance: SellerFinanceSummary; onPrefetchOrder?: Props["onPrefetchOrder"] }) {
  const next = finance.nextPayout;
  return <>
    <div className={styles.summaryGrid}>
      <Summary label="Доступно к выплате" value={finance.availableAmount} hint="После комиссии, удержаний и срока ожидания" />
      <Summary label="Ожидает доступности" value={finance.processingAmount} hint="Доставка, 14 дней после получения или открытый возврат" />
      <Link href="/seller/finance?view=payouts" className={styles.summaryLink}>
        <Summary label="В выплатах" value={finance.inPayoutAmount} hint="Сформированные и отправленные реестры" />
      </Link>
    </div>
    {Math.abs(finance.reconciliationDifference) >= 0.005 && <p role="alert" className={styles.notice}>
      <Icon name="alert" size={18} /><span>Обнаружено расхождение в расчёте баланса: {money(finance.reconciliationDifference)}. Обратитесь в поддержку для сверки.</span>
    </p>}
    {finance.failedPayoutAmount > 0 && <Link className={styles.notice} href="/seller/finance?view=payouts">
      <Icon name="alert" size={18} /><span>Выплаты требуют внимания: <strong>{money(finance.failedPayoutAmount)}</strong>. Эти средства остаются в реестрах с ошибкой.</span>
    </Link>}
    {!finance.bankDetailsReady && <Link className={styles.notice} href="/seller/legal">
      <Icon name="alert" size={18} /><span>Заполните банковские реквизиты, чтобы получать выплаты.</span>
    </Link>}
    <div className={styles.nextPayout}>
      <div><span className={styles.caption}>{next ? `Ближайший реестр №${next.id}` : "Прогноз следующего реестра"}</span>
        <strong>{money(next?.payoutAmount ?? finance.nextPayoutAmount)}</strong>
        <p>{next ? `${labels[next.status]}. Плановая дата ${date(next.scheduledDate)}`
          : `Ориентир — ${date(finance.nextPayoutDate)}. Сумма и дата могут измениться до формирования выплаты.`}</p>
        {next && <p>Счёт {next.checkingAccount}</p>}
      </div>
      {next ? <Link className={styles.button} href={`/seller/finance?view=payouts&payout=${next.id}`}>Состав выплаты</Link>
        : <Link className={styles.button} href="/seller/finance?view=payouts">История выплат</Link>}
    </div>
    <p className={styles.month}>Выплачено за текущий месяц: <strong>{money(finance.paidThisMonthAmount)}</strong></p>
    <details className={styles.calculation}><summary>Как рассчитан баланс <strong>{money(finance.estimatedBalance)}</strong></summary>
      <dl className={styles.breakdown}><Figure label="Продажи" value={finance.salesAmount} /><Figure label="Комиссия" value={-finance.commissionAmount} />
        <Figure label="Возвраты и удержания" value={-finance.adjustmentsAmount} /><Figure label="Уже выплачено" value={-finance.paidOutAmount} /></dl>
    </details>
    <div className={styles.heading}><h2>Последние операции</h2><Link href="/seller/finance?view=operations">Все операции</Link></div>
    <OperationTable operations={finance.operations} onPrefetchOrder={onPrefetchOrder} />
  </>;
}

function Summary({ label, value, hint }: { label: string; value: number; hint: string }) {
  return <div className={styles.summary}><span>{label}</span><strong>{money(value)}</strong><small>{hint}</small></div>;
}

function Operations({ onPrefetchOrder }: { onPrefetchOrder?: Props["onPrefetchOrder"] }) {
  const params = useSearchParams();
  const router = useRouter();
  const page = pageNumber(params.get("page"));
  const query = new URLSearchParams({ page: String(page), size: "20" });
  for (const key of ["type", "orderId", "from", "to"]) { const value = params.get(key); if (value) query.set(key, value); }
  const state = useFinanceData<PageResponse<SellerFinanceOperation>>(`operations?${query}`);
  const [validation, setValidation] = useState("");
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const from = String(form.get("from") || ""), to = String(form.get("to") || "");
    if (from && to && from > to) { setValidation("Дата начала должна быть не позже даты окончания"); return; }
    setValidation("");
    const next = new URLSearchParams({ view: "operations" });
    for (const key of ["type", "orderId", "from", "to"]) { const value = String(form.get(key) || ""); if (value) next.set(key, value); }
    router.push(`/seller/finance?${next}`, { scroll: false });
  }
  return <>
    <form className={styles.filters} onSubmit={apply} key={params.toString()}>
      <label>Тип операции<select name="type" defaultValue={params.get("type") || ""}><option value="">Все операции</option>
        {Object.entries(operationLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>Номер заказа<input name="orderId" type="number" min="1" step="1" defaultValue={params.get("orderId") || ""} placeholder="ID заказа" /></label>
      <label>С даты<input name="from" type="date" defaultValue={params.get("from") || ""} /></label>
      <label>По дату<input name="to" type="date" defaultValue={params.get("to") || ""} /></label>
      <button className={styles.button} type="submit">Показать</button>
      <Link href="/seller/finance?view=operations" className={styles.textButton}>Сбросить</Link>
    </form>
    {validation && <p role="alert" className={styles.error}>{validation}</p>}
    <div className={styles.heading}><h2>Операции</h2><button className={styles.textButton} onClick={state.retry} disabled={state.loading}>Обновить</button></div>
    <RemoteState {...state} />
    {state.data && <><div className={styles.heading}><span className={styles.caption}>Найдено: {state.data.totalElements}. Даты — московское время.</span>
      <ExportButton key={query.toString()} query={query.toString()} disabled={!state.data.totalElements} /></div>
      <OperationTable operations={state.data.content} onPrefetchOrder={onPrefetchOrder} /><Pagination data={state.data} /></>}
  </>;
}

function OperationTable({ operations, onPrefetchOrder }: { operations: SellerFinanceOperation[]; onPrefetchOrder?: Props["onPrefetchOrder"] }) {
  if (!operations.length) return <p className={styles.empty}>Операций по выбранным условиям пока нет</p>;
  return <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>Дата</th><th>Операция</th><th>Заказ / выплата</th><th className={styles.numeric}>Сумма</th></tr></thead>
    <tbody>{operations.map(op => <tr key={op.id}>
      <td>{dateTime(op.createdAt)}{op.estimatedDate && <small>Дата создания заказа; дата оплаты не сохранена</small>}</td>
      <td>{operationLabels[op.type]}{op.type === "SALE" && <small>Продажа {money(op.grossAmount ?? 0, op.currency)} − комиссия {money(op.commissionAmount ?? 0, op.currency)}</small>}</td>
      <td>{op.orderId ? <Link href={`/seller/orders?orderId=${op.orderId}`} onFocus={() => onPrefetchOrder?.(op.orderId!)} prefetch={false}>Заказ №{op.orderId}</Link>
        : op.payoutId ? <Link href={`/seller/finance?view=payouts&payout=${op.payoutId}`}>Выплата №{op.payoutId}</Link> : "—"}</td>
      <td className={styles.numeric}>{op.direction === "CREDIT" ? "+" : "−"}{money(op.amount, op.currency)}</td>
    </tr>)}</tbody></table></div>;
}

function Payouts() {
  const params = useSearchParams();
  const state = useFinanceData<PageResponse<SellerPayout>>(`payouts?page=${pageNumber(params.get("page"))}&size=20`);
  return <><div className={styles.heading}><h2>Выплаты</h2><button className={styles.textButton} onClick={state.retry} disabled={state.loading}>Обновить</button></div>
    <RemoteState {...state} />
    {state.data && <>{state.data.content.length ? <div className={styles.tableScroll}><table className={styles.table}>
      <thead><tr><th>Реестр</th><th>Плановая дата</th><th>Статус</th><th>Счёт</th><th>Заказов</th><th className={styles.numeric}>Сумма</th></tr></thead>
      <tbody>{state.data.content.map(p => <tr key={p.id}><td><Link href={`/seller/finance?${new URLSearchParams({ ...Object.fromEntries(params), payout: String(p.id) })}`}>Выплата №{p.id}</Link></td>
        <td>{date(p.scheduledDate)}</td><td>{labels[p.status]}</td><td>{p.checkingAccount || "—"}</td><td>{p.orderCount}</td><td className={styles.numeric}>{money(p.payoutAmount)}</td></tr>)}</tbody>
    </table></div> : <p className={styles.empty}>Сформированных выплат пока нет</p>}<Pagination data={state.data} /></>}
  </>;
}

function PayoutDetails({ id }: { id: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const state = useFinanceData<SellerPayoutDetail>(`payouts/${id}`);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement;
    dialog.showModal();
    const unlock = lockModalScroll();
    return () => { dialog.close(); unlock(); if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  function close() { const next = new URLSearchParams(params); next.delete("payout"); router.replace(`/seller/finance?${next}`, { scroll: false }); }
  const payout = state.data;
  return <dialog ref={ref} className={styles.drawer} aria-labelledby="finance-payout-title" onCancel={e => { e.preventDefault(); close(); }}>
    <div className={styles.heading}><h2 id="finance-payout-title">Выплата №{id}</h2><button className={styles.textButton} onClick={close} aria-label="Закрыть детализацию выплаты"><Icon name="x" size={22} /></button></div>
    <RemoteState {...state} />
    {payout && <><p>{labels[payout.status]}</p><strong className={styles.payoutTotal}>{money(payout.payoutAmount, payout.currency)}</strong>
      {payout.status === "FAILED" && <p className={styles.notice}>Отправку выплаты необходимо проверить. Средства остаются закреплены за этим реестром до решения оператора.</p>}
      <dl className={styles.breakdown}><div><dt>Плановая дата</dt><dd>{date(payout.scheduledDate)}</dd></div><div><dt>Отправлено</dt><dd>{payout.sentAt ? dateTime(payout.sentAt) : "—"}</dd></div>
        <div><dt>Выплачено</dt><dd>{payout.paidAt ? dateTime(payout.paidAt) : "—"}</dd></div><div><dt>Платёжное поручение</dt><dd>{payout.paymentOrderNumber || "—"}</dd></div>
        <div><dt>Банк</dt><dd>{payout.bankName}</dd></div><div><dt>Счёт</dt><dd>{payout.checkingAccount}</dd></div></dl>
      <h3>Расчёт выплаты</h3><dl className={styles.breakdown}><Figure label="Продажи" value={payout.grossSalesAmount} currency={payout.currency} />
        <Figure label="Комиссия" value={-payout.commissionAmount} currency={payout.currency} /><Figure label="Удержания" value={-payout.adjustmentsAmount} currency={payout.currency} /></dl>
      <h3>Состав реестра</h3><div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>Основание</th><th className={styles.numeric}>Продажа</th><th className={styles.numeric}>Комиссия</th><th className={styles.numeric}>Удержание</th><th className={styles.numeric}>Итого</th></tr></thead>
        <tbody>{payout.items.map(item => <tr key={item.id}><td>{item.orderId ? <Link href={`/seller/orders?orderId=${item.orderId}`}>Заказ №{item.orderId}</Link> : "Корректировка"}</td>
          <td className={styles.numeric}>{money(item.grossAmount, payout.currency)}</td><td className={styles.numeric}>{money(item.commissionAmount, payout.currency)}</td>
          <td className={styles.numeric}>{money(item.adjustmentAmount, payout.currency)}</td><td className={styles.numeric}>{money(item.netAmount, payout.currency)}</td></tr>)}</tbody></table></div>
    </>}
  </dialog>;
}

function Figure({ label, value, currency = "RUB" }: { label: string; value: number; currency?: string }) { return <div><dt>{label}</dt><dd>{money(value, currency)}</dd></div>; }
function RemoteState({ loading, error, retry }: { loading: boolean; error?: string; retry: () => void }) {
  return loading ? <div role="status" aria-label="Загрузка финансов"><CabinetSkeleton variant="list" rows={3} compact /></div>
    : error ? <div role="alert" className={styles.error}>{error} <button className={styles.textButton} onClick={retry}>Повторить</button></div> : null;
}
function Pagination({ data }: { data: PageResponse<unknown> }) {
  const params = useSearchParams();
  function href(page: number) { const next = new URLSearchParams(params); next.set("page", String(page)); return `/seller/finance?${next}`; }
  if (data.totalPages <= 1) return null;
  return <nav className={styles.pagination} aria-label="Страницы финансов">
    {data.number > 0 ? <Link href={href(data.number - 1)} scroll={false}>Назад</Link> : <span>Назад</span>}
    <span>Страница {data.number + 1} из {data.totalPages}</span>
    {data.number + 1 < data.totalPages ? <Link href={href(data.number + 1)} scroll={false}>Далее</Link> : <span>Далее</span>}
  </nav>;
}
function pageNumber(value: string | null) { const number = Number(value); return Number.isSafeInteger(number) && number >= 0 ? number : 0; }
function money(value: number, currency = "RUB") { return new Intl.NumberFormat("ru-RU", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value); }
function date(value: string) { return new Date(`${value}T12:00:00Z`).toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" }); }
function dateTime(value: string) { return new Date(value).toLocaleString("ru-RU", { timeZone: "Europe/Moscow", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
function ExportButton({ query, disabled }: { query: string; disabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function download() {
    if (request.current) return;
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setError("");
    try {
      const blob = await exportFinanceOperations(query, controller.signal);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = "rcmarket-operations.csv"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Ошибка выгрузки");
    } finally {
      if (!controller.signal.aborted) { setBusy(false); request.current = null; }
    }
  }
  return <div><button className={styles.textButton} disabled={busy || disabled} onClick={download} aria-busy={busy}>{busy ? "Выгружаем…" : "Скачать CSV"}</button>
    {error && <p role="alert" className={styles.error}>{error}</p>}</div>;
}
