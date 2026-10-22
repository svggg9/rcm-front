"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Banner } from "../../components/ui/Banner";
import { Button } from "../../components/ui/Button";
import { CabinetSkeleton } from "../../components/ui/CabinetSkeleton";
import { ConfirmActionButton } from "../../components/ui/ConfirmActionButton";
import { Dialog } from "../../components/ui/Dialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { InputControl } from "../../components/ui/InputControl";
import { RequestError } from "../../components/ui/RequestError";
import { Textarea } from "../../components/ui/Textarea";
import { ApiRequestError } from "../../lib/apiErrors";
import type { AdminSellerPayout, AdminSellerPayoutStatus, PageResponse, PayoutGenerationResult } from "../types";
import { applyPayoutAction, generatePayouts, getPayoutDetail, getPayouts, getPayoutStats, PAYOUT_STATUSES,
  payoutMoney, payoutSkipReason, type AdminPayoutDetail, type PayoutAction, type PayoutActionPayload, type PayoutStats } from "../lib/adminPayoutApi";
import styles from "./AdminFinanceTab.module.css";

const actionLabels: Record<PayoutAction, string> = {
  BEGIN: "Начать обработку", SENT: "Зафиксировать отправку", REVIEW: "Передать на сверку", PAID: "Подтвердить выплату",
  FAILED: "Подтвердить отказ банка", RETRY: "Подготовить новую попытку", CANCEL: "Отменить реестр",
};
const actionHints: Record<PayoutAction, string> = {
  BEGIN: "Закрепите реестр за банковской попыткой до перевода денег. После подтверждения обработайте поручение отдельно в банке",
  SENT: "Банк принял поручение к обработке. Укажите его номер — выплата ещё не считается выполненной",
  REVIEW: "Исход перевода неизвестен. До банковской сверки повторный перевод и отмена недоступны",
  PAID: "Подтвердите исполнение поручения по выписке или другому банковскому документу. Система запишет факт выплаты",
  FAILED: "Подтверждайте только окончательный отказ банка. При таймауте или отсутствии ответа выберите сверку",
  RETRY: "Новая попытка допустима только после подтверждённого отказа. История предыдущего поручения сохранится",
  CANCEL: "Отмените неисполненный реестр. Его суммы вернутся в расчёт доступного остатка",
};

function safeError(reason: unknown, fallback: string) { return reason instanceof ApiRequestError ? reason.message : fallback; }
function timestamp(value: string | null) {
  return value ? new Date(value).toLocaleString("ru-RU", { timeZone: "Europe/Moscow", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}
function date(value: string) { return new Date(`${value}T12:00:00Z`).toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" }); }

/** A compact queue inside the existing finance section; mutations live in the register detail. */
export function AdminPayoutRegistry() {
  const [status, setStatus] = useState<AdminSellerPayoutStatus | "ALL">("ALL");
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const key = `${status}:${page}:${revision}`;
  const [result, setResult] = useState<{ key: string; rows?: PageResponse<AdminSellerPayout>; stats?: PayoutStats; error?: string }>();
  const [selected, setSelected] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generation, setGeneration] = useState<PayoutGenerationResult | null>(null);
  const [generationError, setGenerationError] = useState("");
  const [generationNeedsRefresh, setGenerationNeedsRefresh] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getPayouts(status, page, controller.signal), getPayoutStats(controller.signal)]).then(([rows, stats]) => {
      if (!controller.signal.aborted) {
        setResult({ key, rows, stats });
        setGenerationNeedsRefresh(false);
      }
    }).catch(reason => { if (!controller.signal.aborted) setResult({ key, error: safeError(reason, "Не удалось загрузить выплаты") }); });
    return () => controller.abort();
  }, [status, page, key]);
  const current = result?.key === key ? result : undefined;
  const loading = !current;
  const refresh = () => setRevision(value => value + 1);

  async function generate() {
    if (inFlight.current || generationNeedsRefresh || loading || current?.error) return;
    inFlight.current = true; setGenerating(true); setGenerationError(""); setGeneration(null);
    try {
      const response = await generatePayouts();
      if (mounted.current) { setGeneration(response); refresh(); }
    } catch (reason) {
      if (mounted.current) {
        setGenerationError(safeError(reason, "Результат формирования неизвестен — обновите очередь перед продолжением"));
        setGenerationNeedsRefresh(true);
      }
    } finally { inFlight.current = false; if (mounted.current) setGenerating(false); }
  }

  return <>
    <div className={styles.queueTools}>
      <label className={styles.filterField}>Статус выплаты
        <select aria-label="Статус выплаты" value={status} disabled={generating} onChange={event => { setStatus(event.target.value as AdminSellerPayoutStatus | "ALL"); setPage(0); }}>
          <option value="ALL">Все статусы</option>
          {Object.entries(PAYOUT_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <Button loading={loading} disabled={generating} onClick={refresh}>Обновить очередь</Button>
      <Button variant="primary" loading={generating} disabled={loading || Boolean(current?.error) || generationNeedsRefresh} onClick={() => void generate()}>Сформировать реестры</Button>
    </div>
    <p className={styles.caption}>Переводы выполняются отдельно в банке. Действия здесь фиксируют банковскую попытку и подтверждённый результат</p>
    {generationError && <RequestError variant="inline" message={generationError} text="Проверьте обновлённую очередь, прежде чем формировать реестры повторно" onRetry={refresh} loading={loading} />}
    {generation && <section className={styles.generationResult} aria-label="Результат формирования реестров" role="status">
      <p>Сформировано: {generation.payouts.length} · Пропущено: {generation.skipped.length}</p>
      {generation.skipped.length > 0 && <ul>{generation.skipped.map(row => <li key={row.sellerId}><strong>{row.sellerName} · №{row.sellerId}</strong><span>{payoutSkipReason(row.reason)}</span></li>)}</ul>}
    </section>}
    {loading ? <CabinetSkeleton variant="list" rows={3} compact /> : current?.error ? <RequestError message={current.error} onRetry={refresh} /> : null}
    {current?.stats && <dl className={styles.summary}>
      <Figure label="Готово к обработке" value={payoutMoney(current.stats.readyAmount)} />
      <Figure label="В обработке / банке" value={payoutMoney(current.stats.inProgressAmount + current.stats.sentAmount)} />
      <Figure label="Требует сверки" value={payoutMoney(current.stats.reviewAmount)} />
    </dl>}
    {current?.rows && <>
      {current.rows.content.length ? <div className={styles.payoutList}>{current.rows.content.map(row => <article className={styles.payoutCard} key={row.id} aria-label={`Реестр №${row.id}`}>
        <div className={styles.payoutMain}>
          <div className={styles.payoutIdentity}><span>Реестр №{row.id} · {date(row.scheduledDate)}</span><strong>{row.sellerName}</strong><small>ИНН {row.inn} · Продавец №{row.sellerId}</small></div>
          <div className={styles.payoutAmount}><span>К выплате</span><strong>{payoutMoney(row.payoutAmount, row.currency)}</strong><span className={styles.queueStatus}>{PAYOUT_STATUSES[row.status]}</span></div>
        </div>
        <div className={styles.cardFooter}><span className={styles.caption}>{row.orderCount ?? 0} заказов · {row.paymentOrderNumber ? `Поручение ${row.paymentOrderNumber}` : "Поручение не зафиксировано"}</span>
          <Button onClick={() => setSelected(row.id)}>Состав и действия</Button></div>
      </article>)}</div> : <EmptyState icon="wallet" title="Реестров нет" text={status === "ALL" ? "Сформируйте реестры после окончания холда по доставленным заказам" : "По выбранному статусу выплат пока нет"} />}
      {current.rows.totalPages > 1 && <nav className={styles.queueTools} aria-label="Страницы реестров">
        <Button disabled={page === 0} onClick={() => setPage(value => value - 1)}>Назад</Button>
        <span>Страница {page + 1} из {current.rows.totalPages}</span>
        <Button disabled={page + 1 >= current.rows.totalPages} onClick={() => setPage(value => value + 1)}>Далее</Button>
      </nav>}
    </>}
    {selected !== null && <PayoutDetail key={selected} id={selected} onClose={() => setSelected(null)} onChanged={refresh} />}
  </>;
}

function PayoutDetail({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
  const [detail, setDetail] = useState<AdminPayoutDetail | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [loadedRevision, setLoadedRevision] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const request = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    getPayoutDetail(id, controller.signal).then(data => {
      if (!controller.signal.aborted) { setDetail(data); setError(""); setLoadedRevision(revision); }
    }).catch(reason => { if (!controller.signal.aborted) { setError(safeError(reason, "Не удалось загрузить реестр")); setLoadedRevision(revision); } });
    return () => controller.abort();
  }, [id, revision]);
  const loading = loadedRevision !== revision;
  async function act(action: PayoutAction, payload: PayoutActionPayload) {
    if (request.current || loading || error || !detail?.allowedActions.includes(action)) return;
    request.current = true; setBusy(true); setNotice("");
    let accepted = false;
    try {
      await applyPayoutAction(id, action, payload);
      accepted = true;
      if (mounted.current) { setNotice("Действие сохранено — сверяем актуальное состояние"); onChanged(); }
    } catch (reason) {
      if (mounted.current) { setError(safeError(reason, "Не удалось подтвердить результат действия — обновите реестр")); onChanged(); }
    } finally {
      request.current = false;
      if (mounted.current) { setBusy(false); if (accepted) setRevision(value => value + 1); }
    }
  }
  const payout = detail?.payout;
  return <Dialog title={`Реестр №${id}`} size="wide" mobileFullscreen busy={busy} onClose={onClose}
    actions={<><Button disabled={busy} loading={loading} onClick={() => setRevision(value => value + 1)}>Обновить реестр</Button><Button disabled={busy} onClick={onClose}>Закрыть</Button></>}>
    {error && <RequestError variant="inline" message={error} text="До успешного обновления действия недоступны" onRetry={() => setRevision(value => value + 1)} loading={loading} disabled={busy} />}
    {!detail && loading ? <CabinetSkeleton variant="list" rows={3} compact /> : null}
    {notice && <p role="status" className={styles.caption}>{notice}</p>}
    {payout && <div className={styles.detailContent}>
      <div className={styles.payoutMain}><div><p>{payout.sellerName} · Продавец №{payout.sellerId}</p><p className={styles.caption}>{PAYOUT_STATUSES[payout.status]}</p></div><strong className={styles.detailAmount}>{payoutMoney(payout.payoutAmount, payout.currency)}</strong></div>
      {payout.status === "REVIEW" && <Banner tone="warning">Результат перевода неизвестен. Повторная отправка заблокирована до подтверждённого результата банка</Banner>}
      {payout.adminComment && <p className={styles.caption}>Комментарий реестра: {payout.adminComment}</p>}
      <section aria-label="Расчёт выплаты"><h3>Расчёт выплаты</h3><dl className={styles.detailFigures}>
        <Figure label="Продажи" value={payoutMoney(payout.grossSalesAmount, payout.currency)} /><Figure label="Комиссия" value={payoutMoney(payout.commissionAmount, payout.currency)} />
        <Figure label="Удержания" value={payoutMoney(payout.adjustmentsAmount, payout.currency)} /><Figure label="К выплате" value={payoutMoney(payout.payoutAmount, payout.currency)} />
      </dl></section>
      <section aria-label="Реквизиты реестра"><h3>Реквизиты реестра</h3><dl className={styles.detailFigures}>
        <Figure label="Получатель" value={payout.sellerName} /><Figure label="ИНН" value={payout.inn} /><Figure label="Банк" value={payout.bankName} /><Figure label="БИК" value={payout.bik} />
        <Figure label="Расчётный счёт" value={payout.checkingAccount} /><Figure label="Корреспондентский счёт" value={payout.correspondentAccount || "—"} />
        <Figure label="Плановая дата" value={date(payout.scheduledDate)} /><Figure label="Поручение" value={payout.paymentOrderNumber || "—"} />
        <Figure label="Отправлено" value={timestamp(payout.sentAt)} /><Figure label="Выплачено" value={timestamp(payout.paidAt)} />
      </dl></section>
      <section><h3>Состав реестра</h3><div className={styles.detailTableScroll} tabIndex={0} role="region" aria-label="Заказы и удержания в выплате"><table className={styles.detailTable}>
        <thead><tr><th scope="col">Основание</th><th scope="col">Продажи</th><th scope="col">Комиссия</th><th scope="col">Удержания</th><th scope="col">Итого</th></tr></thead>
        <tbody>{payout.items?.map(item => <tr key={item.id}><td>{item.orderId ? <Link href={`/admin?tab=orders&orderId=${item.orderId}`}>Заказ №{item.orderId}</Link> : "Корректировка"}</td>
          <td>{payoutMoney(item.grossAmount, payout.currency)}</td><td>{payoutMoney(item.commissionAmount, payout.currency)}</td><td>{payoutMoney(item.adjustmentAmount, payout.currency)}</td><td>{payoutMoney(item.netAmount, payout.currency)}</td></tr>)}</tbody>
      </table></div></section>
      {detail && <section><h3>Банковские попытки</h3>{detail.attempts.length ? <ol className={styles.history}>{detail.attempts.map(attempt => <li key={attempt.id}>
        <strong>Попытка №{attempt.number} · {PAYOUT_STATUSES[attempt.status as AdminSellerPayoutStatus] ?? "Проверка истории"}</strong>
        <span>Начата {timestamp(attempt.startedAt)} · {attempt.startedBy ? `Оператор №${attempt.startedBy}` : "Импортирована"}</span>
        <span>Поручение: {attempt.paymentOrderNumber || "—"} · Отправлено: {timestamp(attempt.sentAt)} · Результат: {timestamp(attempt.resolvedAt)}</span>
        {attempt.legacy && <span>Перенесено из прежней версии — первоначальная история недоступна</span>}{attempt.evidence && <p>{attempt.evidence}</p>}
      </li>)}</ol> : <p className={styles.caption}>Банковские попытки ещё не начаты</p>}</section>}
      {detail && <section><h3>История действий</h3>{detail.history.length ? <ol className={styles.history}>{detail.history.map(event => <li key={event.id}>
        <strong>{actionLabels[event.action as PayoutAction] ?? "Создание / перенос реестра"}</strong><span>{timestamp(event.createdAt)} · {event.actorId ? `Оператор №${event.actorId}` : "Система"}</span>
        <span>{event.fromStatus ? `${PAYOUT_STATUSES[event.fromStatus]} → ` : ""}{PAYOUT_STATUSES[event.toStatus]}</span>
        {event.reason && <p>Причина: {event.reason}</p>}{event.evidence && <p>Основание: {event.evidence}</p>}
      </li>)}</ol> : <p className={styles.caption}>Событий пока нет</p>}</section>}
      {detail && !loading && !error && <PayoutActionForm key={`${id}:${detail.version}`} detail={detail} busy={busy} onAction={act} />}
    </div>}
  </Dialog>;
}

function PayoutActionForm({ detail, busy, onAction }: { detail: AdminPayoutDetail; busy: boolean; onAction: (action: PayoutAction, payload: PayoutActionPayload) => Promise<void> }) {
  const [action, setAction] = useState<PayoutAction | "">("");
  const [comment, setComment] = useState("");
  const [evidence, setEvidence] = useState("");
  const [paymentOrder, setPaymentOrder] = useState("");
  const latestAttempt = detail.attempts.reduce<typeof detail.attempts[number] | undefined>((last, next) => !last || next.number > last.number ? next : last, undefined);
  const needsAttempt = action === "SENT" || action === "PAID" || action === "FAILED" || action === "REVIEW";
  const needsReason = action === "BEGIN" || action === "REVIEW" || action === "RETRY" || action === "CANCEL";
  const needsEvidence = action === "PAID" || action === "FAILED";
  const needsNumber = action === "SENT" || action === "PAID" && !latestAttempt?.paymentOrderNumber;
  const allowed = !!action && detail.allowedActions.includes(action);
  const valid = allowed && (!needsAttempt || !!latestAttempt) && (!needsReason || !!comment.trim()) && (!needsEvidence || !!evidence.trim()) && (!needsNumber || !!paymentOrder.trim());
  if (!detail.allowedActions.length) return <p className={styles.caption}>Реестр завершён — изменений не требуется</p>;
  const payload: PayoutActionPayload = { expectedVersion: detail.version,
    ...(needsAttempt && latestAttempt ? { attemptId: latestAttempt.id } : {}),
    ...(comment.trim() ? { comment: comment.trim() } : {}), ...(evidence.trim() ? { evidence: evidence.trim() } : {}),
    ...(paymentOrder.trim() ? { paymentOrderNumber: paymentOrder.trim() } : {}) };
  return <section className={styles.actionForm} aria-label="Действие с выплатой">
    <h3>Действие с выплатой</h3>
    <label className={styles.filterField}>Действие<select aria-label="Действие" value={action} disabled={busy} onChange={event => { setAction(event.target.value as PayoutAction | ""); setComment(""); setEvidence(""); setPaymentOrder(""); }}>
      <option value="">Выберите действие</option>{detail.allowedActions.map(value => <option key={value} value={value}>{actionLabels[value]}</option>)}
    </select></label>
    {action && <><p className={styles.caption}>{actionHints[action]}</p>
      {needsNumber && <label className={styles.filterField}>Номер платёжного поручения<InputControl required disabled={busy} maxLength={100} value={paymentOrder} onChange={event => setPaymentOrder(event.target.value)} autoComplete="off" /></label>}
      <Textarea label={needsReason ? "Причина действия" : "Комментарий (необязательно)"} required={needsReason} disabled={busy} maxLength={1000} value={comment} onChange={event => setComment(event.target.value)} />
      {needsEvidence && <Textarea label="Основание банковского результата" hint="Дата и номер выписки, банковского документа или подтверждения окончательного отказа" required disabled={busy} maxLength={2000} value={evidence} onChange={event => setEvidence(event.target.value)} />}
      <ConfirmActionButton variant="primary" disabled={!valid || busy} loading={busy} confirmTitle={actionLabels[action]}
        confirmText={`Реестр №${detail.payout.id} · ${payoutMoney(detail.payout.payoutAmount, detail.payout.currency)} · Счёт ${detail.payout.checkingAccount}. ${actionHints[action]}`}
        confirmLabel={actionLabels[action]} onConfirm={() => onAction(action, payload)}>{actionLabels[action]}</ConfirmActionButton>
    </>}
  </section>;
}

function Figure({ label, value }: { label: string; value: ReactNode }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
