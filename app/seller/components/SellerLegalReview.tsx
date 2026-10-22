"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Banner";
import { Dialog } from "../../components/ui/Dialog";
import { Textarea } from "../../components/ui/Textarea";
import { ApiRequestError } from "../../lib/apiErrors";
import { scrollToFirstValidationError } from "../../lib/formValidation";
import { getSellerLegalReview, requestLegalChange, type SellerLegalReview } from "../lib/sellerLegalReviewApi";
import type { SellerLegalInfoForm } from "../lib/sellerLegalApi";
import styles from "./SellerLegalReview.module.css";

export function useSellerLegalReview() {
  const [review, setReview] = useState<SellerLegalReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setReview(await getSellerLegalReview()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось загрузить статус реквизитов"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return { review, setReview, error, loading, load };
}

export function SellerLegalValues({ form, section }: { form: SellerLegalInfoForm; section: "legal" | "bank" | "contacts" | "shipping" }) {
  const entries: [string, string][] = section === "legal" ? [
    ["Тип продавца", form.sellerType === "IP" ? "ИП" : form.sellerType === "OOO" ? "ООО" : "Самозанятый"], ["ИНН", form.inn],
    ...(form.sellerType === "IP" ? [["ОГРНИП", form.ogrnip] as [string, string]] : []),
    ...(form.sellerType === "OOO" ? [["Название компании", form.companyName], ["ОГРН", form.ogrn]] as [string, string][] : []),
    [form.sellerType === "OOO" ? "Юридическое название" : "ФИО", form.legalName], ["Юридический адрес", form.legalAddress],
  ] : section === "bank" ? [["Банк", form.bankName], ["БИК", form.bik], ["Расчётный счёт", form.checkingAccount],
    ["Корреспондентский счёт", form.correspondentAccount], ["Оферта продавца", form.agreementAccepted ? "Принята" : "Не принята"]]
    : section === "contacts" ? [["Контактное лицо", form.contactName], ["Телефон", form.phone]]
    : [["Город отправления", form.shippingCityName], ["Пункт приёма СДЭК", form.cdekShipmentPoint], ["Адрес пункта", form.shippingAddress]];
  return <dl className={styles.values}>{entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Не указано"}</dd></div>)}</dl>;
}

export function SellerLegalReviewNotice({ review, error, loading, onRefresh, onRequest }: {
  review: SellerLegalReview | null; error: string | null; loading: boolean; onRefresh: () => void; onRequest: () => void;
}) {
  if (error) return <Banner tone="danger" actions={<Button type="button" variant="secondary" loading={loading} onClick={onRefresh}>Повторить</Button>}>{error}</Banner>;
  if (!review) return null;
  const pending = review.changeRequest && !review.changeRequest.reopenedAt;
  return <div className={styles.summary}>
    <Banner tone={review.verified ? "success" : "info"} title={review.verified ? "Реквизиты подтверждены" : "Реквизиты ещё не подтверждены"}>
      {review.verified ? "Для изменения юридических и банковских реквизитов отправьте запрос в поддержку" : "До подтверждения вы можете исправить юридические и банковские реквизиты самостоятельно"}
    </Banner>
    {pending ? <Banner tone="info" title={`Запрос №${review.changeRequest!.id} на рассмотрении`}>
      <p>{review.changeRequest!.changes}</p><p className={styles.hint}>Причина: {review.changeRequest!.reason}</p>
      <Button type="button" variant="utility" loading={loading} onClick={onRefresh}>Обновить статус</Button>
    </Banner> : review.changeRequest?.reopenedAt && !review.verified ? <Banner tone="info" title="Редактирование разрешено">
      {review.changeRequest.resolution}<p>Внесите изменения и сохраните данные для повторной проверки</p>
    </Banner> : null}
    {review.verified && !pending ? <div><Button type="button" variant="secondary" onClick={onRequest}>Запросить изменение</Button></div> : null}
  </div>;
}

export function LegalChangeDialog({ onClose, onSaved }: { onClose: () => void; onSaved: (review: SellerLegalReview) => void }) {
  const [changes, setChanges] = useState(""); const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null); const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false); const [uncertain, setUncertain] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const pending = useRef(false); const requestId = useRef<string | null>(null);
  const changesError = submitted && !changes.trim() ? "Укажите, какие данные нужно изменить" : null;
  const reasonError = submitted && !reason.trim() ? "Укажите причину изменения" : null;
  async function send() {
    if (pending.current) return;
    setSubmitted(true);
    if (!changes.trim() || !reason.trim()) { scrollToFirstValidationError({ root: formRef.current }); return; }
    pending.current = true; setBusy(true); setError(null);
    requestId.current ??= crypto.randomUUID();
    try { onSaved(await requestLegalChange({ requestId: requestId.current, changes: changes.trim(), reason: reason.trim() })); }
    catch (failure) {
      setError(failure instanceof Error ? failure.message : "Не удалось отправить запрос");
      setUncertain(!(failure instanceof ApiRequestError) || failure.kind !== "http" || failure.status >= 500);
    } finally { pending.current = false; setBusy(false); }
  }
  function close() { if (busy) return; if (changes.trim() || reason.trim()) setConfirmClose(true); else onClose(); }
  return <><Dialog title="Запросить изменение реквизитов" busy={busy} onClose={close} actions={<>
    <Button type="button" variant="secondary" disabled={busy} onClick={close}>Закрыть</Button>
    <Button type="submit" form="legal-change-request" loading={busy} disabled={busy}>{uncertain ? "Повторить отправку" : "Отправить запрос"}</Button>
  </>}>
    <form ref={formRef} id="legal-change-request" className={styles.requestForm} noValidate onSubmit={event => { event.preventDefault(); void send(); }}>
      <p className={styles.hint}>Поддержка рассмотрит запрос и разрешит редактирование реквизитов на этой странице</p>
      <Textarea label="Какие данные нужно изменить" required maxLength={2000} rows={4} value={changes} error={changesError} readOnly={busy || uncertain} onChange={event => setChanges(event.target.value)} />
      <Textarea label="Причина изменения" required maxLength={1000} rows={3} value={reason} error={reasonError} readOnly={busy || uncertain} onChange={event => setReason(event.target.value)} />
      {error ? <Banner tone="danger">{error}</Banner> : null}
    </form>
  </Dialog>{confirmClose ? <Dialog title={uncertain ? "Закрыть окно запроса" : "Закрыть запрос без отправки"} onClose={() => setConfirmClose(false)} actions={<>
    <Button type="button" variant="secondary" onClick={() => setConfirmClose(false)}>Продолжить заполнение</Button>
    <Button type="button" variant="primary" onClick={onClose}>Закрыть запрос</Button>
  </>}><p>{uncertain ? "Запрос мог быть принят сервером. После закрытия обновите его статус на странице реквизитов." : "Введённый текст не сохранится. Можно вернуться к заполнению и отправить запрос."}</p></Dialog> : null}</>;
}
