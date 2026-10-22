"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Banner } from "../../components/ui/Banner";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { SectionLoader } from "../../components/ui/SectionLoader";
import { Textarea } from "../../components/ui/Textarea";
import { getAdminLegalReview, getLegalChangeQueue, reviewSellerLegal, type AdminLegalReview, type LegalRequestQueue } from "../../seller/lib/sellerLegalReviewApi";
import styles from "../../seller/components/SellerLegalReview.module.css";

export function AdminSellerLegalReview({ sellerId, onChanged }: { sellerId: number; onChanged?: () => void }) {
  const [data, setData] = useState<AdminLegalReview | null>(null);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null); const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(false); const [needsReload, setNeedsReload] = useState(false);
  const pending = useRef(false);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await getAdminLegalReview(sellerId)); setNeedsReload(false); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось загрузить реквизиты"); }
    finally { setLoading(false); }
  }, [sellerId]);
  useEffect(() => { void load(); }, [load]);
  async function act(reopen: boolean) {
    if (!data?.info || pending.current || needsReload) return;
    pending.current = true; setBusy(true); setError(null);
    try {
      setData(await reviewSellerLegal(sellerId, data.info.updatedAt, reopen ? data.review.changeRequest?.id : undefined, reopen ? note.trim() : undefined));
      setNote(""); setConfirm(false); onChanged?.();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось выполнить действие"); setNeedsReload(true); setConfirm(false); }
    finally { pending.current = false; setBusy(false); }
  }
  if (loading && !data) return <SectionLoader label="Загрузка реквизитов" />;
  const info = data?.info;
  const request = data?.review.changeRequest;
  const entries: [string, string | null][] = info ? [["Тип продавца", info.sellerType === "IP" ? "ИП" : info.sellerType === "OOO" ? "ООО" : "Самозанятый"],
    ["ИНН", info.inn], ["ОГРН", info.ogrn], ["ОГРНИП", info.ogrnip], ["Название компании", info.companyName],
    ["Юридическое название / ФИО", info.legalName], ["Юридический адрес", info.legalAddress], ["Банк", info.bankName], ["БИК", info.bik],
    ["Расчётный счёт", info.checkingAccount], ["Корреспондентский счёт", info.correspondentAccount], ["Оферта", info.agreementAccepted ? "Принята" : "Не принята"]] : [];
  return <div className={styles.summary}>
    {error ? <Banner tone="danger">{error}</Banner> : null}
    <div className={styles.actions}><Button type="button" variant="secondary" loading={loading} disabled={busy} onClick={() => void load()}>Обновить реквизиты</Button></div>
    {info ? <>
      <Banner tone={data?.review.verified ? "success" : "info"} title={data?.review.verified ? "Реквизиты подтверждены" : "Реквизиты не подтверждены"}>
        {data?.review.verified ? "Юридические и банковские реквизиты защищены от самостоятельного изменения" : "Продавец может редактировать данные до подтверждения"}
      </Banner>
      <dl className={styles.values}>{entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Не указано"}</dd></div>)}</dl>
      {request && !request.reopenedAt ? <>
        <Banner tone="info" title={`Запрос №${request.id} на изменение`}><p>{request.changes}</p><p>Причина: {request.reason}</p></Banner>
        <Textarea label="Ответ продавцу" maxLength={1000} rows={3} value={note} disabled={busy} onChange={event => setNote(event.target.value)} hint="После разрешения продавец исправит данные самостоятельно, затем их нужно проверить повторно" />
        <div><Button type="button" variant="primary" loading={busy} disabled={busy || loading || needsReload || !note.trim()} onClick={() => void act(true)}>Разрешить редактирование</Button></div>
      </> : !data?.review.verified ? <div><Button type="button" variant="primary" disabled={busy || loading || needsReload} onClick={() => setConfirm(true)}>Подтвердить реквизиты</Button></div> : null}
      {request?.reopenedAt ? <p className={styles.hint}>Ответ по запросу №{request.id}: {request.resolution}</p> : null}
    </> : !error ? <p>Продавец ещё не сохранил реквизиты</p> : null}
    {confirm ? <Dialog title="Подтвердить реквизиты продавца" busy={busy} onClose={() => setConfirm(false)} actions={<>
      <Button type="button" variant="secondary" disabled={busy} onClick={() => setConfirm(false)}>Отмена</Button>
      <Button type="button" variant="primary" loading={busy} disabled={busy} onClick={() => void act(false)}>Подтвердить</Button>
    </>}><p>Убедитесь, что юридические и банковские реквизиты проверены. После подтверждения продавец сможет изменить их через запрос в поддержку.</p></Dialog> : null}
  </div>;
}

export function AdminSellerLegalRequests() {
  const [page, setPage] = useState(0); const [data, setData] = useState<LegalRequestQueue | null>(null);
  const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(true);
  const [selectedSeller, setSelectedSeller] = useState<number | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await getLegalChangeQueue(page)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось загрузить запросы"); }
    finally { setLoading(false); }
  }, [page]);
  useEffect(() => { void load(); }, [load]);
  return <section className={styles.queue} aria-label="Запросы на изменение реквизитов">
    <h2>Изменение реквизитов</h2>
    <div><Button type="button" variant="secondary" loading={loading} onClick={() => void load()}>Обновить запросы</Button></div>
    {error ? <Banner tone="danger">{error}</Banner> : !loading && !data?.content.length ? <p className={styles.hint}>Новых запросов нет</p> : null}
    {data?.content.map(item => <div className={styles.queueItem} key={item.changeRequest.id}>
      <Button type="button" variant="utility" onClick={() => setSelectedSeller(item.sellerId)}>{item.sellerName} · Запрос №{item.changeRequest.id}</Button>
      <p>{item.changeRequest.changes}</p>
    </div>)}
    {data && data.totalPages > 1 ? <div className={styles.actions}>
      <Button type="button" variant="secondary" disabled={page === 0 || loading} onClick={() => setPage(value => value - 1)}>Предыдущая</Button>
      <span>{page + 1} / {data.totalPages}</span>
      <Button type="button" variant="secondary" disabled={page + 1 >= data.totalPages || loading} onClick={() => setPage(value => value + 1)}>Следующая</Button>
    </div> : null}
    {selectedSeller !== null ? <>
      <div><Button type="button" variant="secondary" onClick={() => setSelectedSeller(null)}>Закрыть реквизиты</Button></div>
      <AdminSellerLegalReview key={selectedSeller} sellerId={selectedSeller} onChanged={() => void load()} />
    </> : null}
  </section>;
}
