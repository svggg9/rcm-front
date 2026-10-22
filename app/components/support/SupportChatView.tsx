"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "../ui/Button";
import { CabinetSkeleton } from "../ui/CabinetSkeleton";
import { RequestError } from "../ui/RequestError";
import { Textarea } from "../ui/Textarea";
import { ApiRequestError } from "../../lib/apiErrors";
import { mergeSupportMessages, readSupportDraft, SUPPORT_STATUSES, type SupportChat, type SupportDraft, type SupportHistory, type SupportMessage, type SupportChatStatus, type SupportTransport } from "../../lib/supportChat";
import styles from "./SupportChatView.module.css";

const legacyLabels: Record<string, string> = { PENDING: "Прежний ответ ожидает отправки", SENDING: "Прежний ответ отправляется", SENT: "Прежний ответ принят Telegram", FAILED: "Прежний ответ не доставлен", UNKNOWN: "Результат доставки прежнего ответа неизвестен", MISSING: "Данные доставки прежнего ответа отсутствуют" };
const emptyDraft: SupportDraft = { body: "", pending: null };
function safeError(reason: unknown, fallback: string) { return reason instanceof ApiRequestError ? reason.message : fallback; }
function time(value: string) { return new Date(value).toLocaleString("ru-RU", { timeZone: "Europe/Moscow", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
function latestChat(current: SupportChat, next: SupportChat) { return next.updatedAt >= current.updatedAt ? next : current; }

/** One history and composer for authenticated operators and capability visitors. */
export function SupportChatView({ transport, storageNamespace, admin = false }: { transport: SupportTransport; storageNamespace: string; admin?: boolean }) {
  const [history, setHistory] = useState<SupportHistory | null>(null);
  const [readError, setReadError] = useState("");
  const [accessExpired, setAccessExpired] = useState(false);
  const [reading, setReading] = useState(true);
  const [olderBusy, setOlderBusy] = useState(false);
  const [olderError, setOlderError] = useState("");
  const [revision, setRevision] = useState(0);
  const [newMessages, setNewMessages] = useState(false);
  const [draft, setDraft] = useState<SupportDraft>(emptyDraft);
  const [draftKeyLoaded, setDraftKeyLoaded] = useState("");
  const [storageError, setStorageError] = useState("");
  const [writeError, setWriteError] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState("");
  const scroll = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const readRequest = useRef<AbortController | null>(null);
  const writeRequest = useRef<AbortController | null>(null);
  const olderRequest = useRef<AbortController | null>(null);
  const statusRequest = useRef<AbortController | null>(null);
  const messagesRef = useRef<SupportMessage[]>([]);
  const mounted = useRef(true);
  const draftKey = history ? `rcm-support-draft-v1:${storageNamespace}:${history.chat.id}` : "";

  useEffect(() => { mounted.current = true; return () => {
    mounted.current = false; writeRequest.current?.abort(); olderRequest.current?.abort(); statusRequest.current?.abort();
  }; }, []);
  useEffect(() => {
    if (!draftKey) return;
    try { setDraft(readSupportDraft(draftKey)); setStorageError(""); }
    catch { setDraft(emptyDraft); setStorageError("Не удалось сохранить данные вкладки — разрешите sessionStorage перед отправкой"); }
    setDraftKeyLoaded(draftKey);
  }, [draftKey]);

  function moveToEnd() {
    const element = scroll.current; if (element) element.scrollTop = element.scrollHeight;
    nearBottom.current = true; setNewMessages(false);
  }

  useEffect(() => {
    if (accessExpired) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function load() {
      if (stopped || document.visibilityState === "hidden") return;
      if (timer) clearTimeout(timer);
      readRequest.current?.abort();
      const controller = new AbortController(); readRequest.current = controller;
      setReading(true);
      try {
        const result = await transport.history(null, controller.signal);
        if (stopped || controller.signal.aborted) return;
        const previousIds = new Set(messagesRef.current.map(row => row.id));
        const hasNew = messagesRef.current.length > 0 && result.messages.some(row => !previousIds.has(row.id));
        const shouldFollow = nearBottom.current;
        messagesRef.current = mergeSupportMessages(messagesRef.current, result.messages);
        setHistory(current => ({ chat: current ? latestChat(current.chat, result.chat) : result.chat,
          messages: messagesRef.current, nextBeforeId: current ? current.nextBeforeId : result.nextBeforeId }));
        setReadError(""); setAccessExpired(false);
        if (shouldFollow) requestAnimationFrame(() => { if (!stopped) moveToEnd(); });
        else if (hasNew) setNewMessages(true);
      } catch (reason) {
        if (!stopped && !controller.signal.aborted) {
          setReadError(safeError(reason, "Не удалось обновить диалог — попробуйте ещё раз"));
          if (!admin && reason instanceof ApiRequestError && [401, 403].includes(reason.status)) setAccessExpired(true);
        }
      } finally {
        if (!stopped && !controller.signal.aborted) {
          setReading(false);
          if (!document.hidden) timer = setTimeout(() => void load(), 5000);
        }
      }
    }
    function visibility() {
      if (document.visibilityState === "hidden") { if (timer) clearTimeout(timer); readRequest.current?.abort(); }
      else void load();
    }
    const refresh = () => { if (document.visibilityState !== "hidden") void load(); };
    void load();
    window.addEventListener("focus", refresh); window.addEventListener("online", refresh); document.addEventListener("visibilitychange", visibility);
    return () => { stopped = true; if (timer) clearTimeout(timer); readRequest.current?.abort(); window.removeEventListener("focus", refresh); window.removeEventListener("online", refresh); document.removeEventListener("visibilitychange", visibility); };
  }, [transport, revision, admin, accessExpired]);

  async function loadOlder() {
    if (!history?.nextBeforeId || olderRequest.current) return;
    const controller = new AbortController(); olderRequest.current = controller; setOlderBusy(true); setOlderError("");
    const height = scroll.current?.scrollHeight ?? 0; const top = scroll.current?.scrollTop ?? 0;
    try {
      const result = await transport.history(history.nextBeforeId, controller.signal);
      if (controller.signal.aborted) return;
      messagesRef.current = mergeSupportMessages(messagesRef.current, result.messages);
      setHistory(current => current ? { ...current, messages: messagesRef.current, nextBeforeId: result.nextBeforeId } : current);
      requestAnimationFrame(() => { if (scroll.current && !controller.signal.aborted) scroll.current.scrollTop = top + scroll.current.scrollHeight - height; });
    } catch (reason) { if (!controller.signal.aborted) setOlderError(safeError(reason, "Не удалось загрузить прежние сообщения")); }
    finally { if (olderRequest.current === controller) olderRequest.current = null; if (mounted.current) setOlderBusy(false); }
  }
  function saveDraft(next: SupportDraft): boolean {
    if (!draftKey) return false;
    try { sessionStorage.setItem(draftKey, JSON.stringify(next)); setStorageError(""); setDraft(next); return true; }
    catch { setStorageError("Не удалось сохранить черновик и номер запроса — разрешите sessionStorage перед отправкой"); return false; }
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    if (writeRequest.current || statusBusy || readError || !history || draftKeyLoaded !== draftKey) return;
    const pending = draft.pending ?? { body: draft.body.trim(), requestId: crypto.randomUUID() };
    if (!pending.body || pending.body.length > 4000) { setWriteError("Введите сообщение от 1 до 4000 символов"); return; }
    if (!saveDraft({ ...draft, pending })) return;
    const controller = new AbortController(); writeRequest.current = controller; setBusy(true); setWriteError("");
    try {
      const result = await transport.send(pending.body, pending.requestId, controller.signal);
      if (controller.signal.aborted) return;
      messagesRef.current = mergeSupportMessages(messagesRef.current, [result]);
      setHistory(current => current ? { ...current, messages: messagesRef.current } : current);
      saveDraft({ body: draft.body.trim() === pending.body ? "" : draft.body, pending: null });
      requestAnimationFrame(moveToEnd);
      setRevision(value => value + 1);
    } catch (reason) {
      if (!controller.signal.aborted) {
        setWriteError(safeError(reason, "Результат отправки неизвестен — повторите тот же запрос, когда связь восстановится"));
        if (!admin && reason instanceof ApiRequestError && [401, 403].includes(reason.status)) setAccessExpired(true);
      }
    } finally { if (writeRequest.current === controller) writeRequest.current = null; if (mounted.current) setBusy(false); }
  }
  async function changeStatus(status: SupportChatStatus) {
    if (!transport.updateStatus || statusRequest.current || busy) return;
    const controller = new AbortController(); statusRequest.current = controller; setStatusBusy(true); setStatusError("");
    try {
      const chat = await transport.updateStatus(status, controller.signal);
      if (!controller.signal.aborted) setHistory(current => current ? { ...current, chat: latestChat(current.chat, chat) } : current);
    } catch (reason) { if (!controller.signal.aborted) setStatusError(safeError(reason, "Не удалось изменить статус диалога")); }
    finally { if (statusRequest.current === controller) statusRequest.current = null; if (mounted.current) setStatusBusy(false); }
  }

  if (accessExpired) return <RequestError message="Ссылка недействительна или срок её действия закончился" text="Запросите новую ссылку в Telegram-боте" />;
  return <section className={styles.root} aria-label="Диалог с поддержкой">
    <header className={styles.header}><div><h1>{admin ? history?.chat.name || "Диалог" : "Поддержка рцмаркет"}</h1>
      <p className={styles.hint}>{admin ? "Ответ публикуется в диалоге на сайте" : "Пишите здесь — ответ поддержки появится в этом диалоге"}</p></div>
      <Button loading={reading} onClick={() => setRevision(value => value + 1)}>Обновить</Button></header>
    {admin && history && <label className={styles.status}>Статус диалога<select value={history.chat.status} disabled={statusBusy || busy} onChange={event => void changeStatus(event.target.value as SupportChatStatus)}>
      {Object.entries(SUPPORT_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>}
    {statusError && <RequestError variant="inline" message={statusError} />}
    {readError && <RequestError variant="inline" message={readError} text={history ? "Показаны последние загруженные сообщения" : undefined} onRetry={() => setRevision(value => value + 1)} loading={reading} />}
    {!history && reading ? <CabinetSkeleton variant="list" rows={3} compact /> : null}
    {history && <>
      <div className={styles.scroll} ref={scroll} tabIndex={0} role="region" aria-label="История диалога" onScroll={() => {
        const element = scroll.current; if (element) { nearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80; if (nearBottom.current) setNewMessages(false); }
      }}>
        {history.nextBeforeId && <Button loading={olderBusy} onClick={() => void loadOlder()}>Предыдущие сообщения</Button>}
        {olderError && <RequestError variant="inline" message={olderError} onRetry={loadOlder} loading={olderBusy} />}
        {!history.messages.length && <p className={styles.hint}>Сообщений пока нет</p>}
        <ol className={styles.messages}>{history.messages.map(row => <li key={row.id} className={`${styles.message} ${(admin ? row.direction === "SUPPORT" : row.direction === "CUSTOMER") ? styles.mine : ""}`}>
          <div className={styles.metadata}><strong>{row.direction === "CUSTOMER" ? admin ? "Клиент" : "Вы" : "Поддержка"}{admin && row.direction === "SUPPORT" && row.authorName ? ` · ${row.authorName}` : ""}</strong><time dateTime={row.createdAt}>{time(row.createdAt)}</time></div>
          <p>{row.body}</p>
          {admin && row.legacyDeliveryStatus && <p className={styles.hint}>{legacyLabels[row.legacyDeliveryStatus] ?? "Статус доставки прежнего ответа неизвестен"}</p>}
        </li>)}</ol>
      </div>
      {newMessages && <Button onClick={moveToEnd}>Новые сообщения</Button>}
      {storageError && <RequestError variant="inline" message={storageError} />}
      {writeError && <RequestError variant="inline" message={writeError} />}
      {draft.pending && !busy && <div className={styles.pending} role="status">Предыдущая отправка ещё не подтверждена. Повтор отправит тот же текст с прежним номером запроса и не создаст дубликат</div>}
      <form className={styles.composer} onSubmit={event => void send(event)}>
        <Textarea label="Сообщение" required maxLength={4000} rows={3} value={draft.pending?.body ?? draft.body} disabled={busy || statusBusy || draftKeyLoaded !== draftKey} readOnly={!!draft.pending}
          onChange={event => { const next = { ...draft, body: event.target.value }; if (!saveDraft(next)) setDraft(next); setWriteError(""); }} hint="До 4000 символов" />
        <Button type="submit" variant="primary" loading={busy} disabled={statusBusy || !!readError || draftKeyLoaded !== draftKey || !(draft.pending?.body ?? draft.body).trim()}>{draft.pending ? "Повторить отправку" : "Отправить"}</Button>
      </form>
    </>}
  </section>;
}
