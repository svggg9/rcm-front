"use client";

import { Loader } from "../../components/ui/Loader";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { Banner } from "../../components/ui/Banner";
import { Button } from "../../components/ui/Button";
import { FormError } from "../../components/ui/FormError";
import { StatusBadge, type StatusBadgeTone } from "../../components/ui/StatusBadge";
import { Textarea } from "../../components/ui/Textarea";
import { toast } from "../../components/ui/toast";
import {
  createContactReply,
  getContactReplies,
  retryContactReply,
  type ContactReply,
  type ContactReplyStatus,
} from "../lib/contactMessages";
import styles from "./AdminContactReplies.module.css";

export type ContactReplyDraft = {
  body: string;
  requestId: string | null;
  retryRequestIds: Record<number, string>;
};

export const EMPTY_CONTACT_REPLY_DRAFT: ContactReplyDraft = {
  body: "",
  requestId: null,
  retryRequestIds: {},
};

type Props = {
  contactId: number;
  email: string | null;
  channel?: "EMAIL" | "TELEGRAM";
  telegramUsername?: string | null;
  draft: ContactReplyDraft;
  onDraftChange: (update: (current: ContactReplyDraft) => ContactReplyDraft) => void;
};

const statuses: Record<ContactReplyStatus, { label: string; tone: StatusBadgeTone }> = {
  PENDING: { label: "Ожидает отправки", tone: "default" },
  SENDING: { label: "Отправляется", tone: "default" },
  SENT: { label: "Отправлено", tone: "success" },
  FAILED: { label: "Не отправлено", tone: "danger" },
  UNKNOWN: { label: "Результат неизвестен", tone: "warning" },
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function errorMessage(reason: unknown, fallback: string) {
  return reason instanceof Error && !(reason instanceof TypeError) && !(reason instanceof SyntaxError)
    ? reason.message : fallback;
}

function upsertReply(rows: ContactReply[] | null, reply: ContactReply) {
  return [...(rows ?? []).filter((row) => row.id !== reply.id), reply]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id);
}

export function AdminContactReplies({ contactId, email, channel = "EMAIL", telegramUsername, draft, onDraftChange }: Props) {
  const maximumLength = channel === "TELEGRAM" ? 4000 : 5000;
  const [open, setOpen] = useState(Boolean(draft.body || draft.requestId || Object.keys(draft.retryRequestIds).length));
  const [history, setHistory] = useState<{ rows: ContactReply[] | null; error: string }>({ rows: null, error: "" });
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState<"send" | number | null>(null);
  const [fieldError, setFieldError] = useState("");
  const [actionError, setActionError] = useState("");
  const [receipt, setReceipt] = useState<ContactReply | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const historyControllerRef = useRef<AbortController | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const contentId = useId();

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    historyControllerRef.current = controller;
    let poll: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      try {
        const rows = await getContactReplies(contactId, controller.signal);
        if (controller.signal.aborted || controllerRef.current) return;
        setHistory({ rows, error: "" });
        setReceipt((current) => current ? rows.find((row) => row.id === current.id) ?? current : null);
        if (rows.some((row) => row.status === "PENDING" || row.status === "SENDING")) {
          poll = setTimeout(() => void load(), 3000);
        }
      } catch (reason: unknown) {
        if (!controller.signal.aborted && !controllerRef.current) {
          setHistory((current) => ({ ...current, error: errorMessage(reason, "Не удалось загрузить ответы") }));
        }
      }
    }

    void load();
    return () => {
      controller.abort();
      if (poll) clearTimeout(poll);
      if (historyControllerRef.current === controller) historyControllerRef.current = null;
    };
  }, [contactId, open, revision]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  function showReplies() {
    setOpen((current) => !current);
    if (!open) {
      requestAnimationFrame(() => contentRef.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus());
    }
  }

  function showResult(reply: ContactReply) {
    setReceipt(reply);
    setHistory((current) => ({ rows: upsertReply(current.rows, reply), error: "" }));
    if (reply.status === "SENT") {
      toast.success("Ответ отправлен", { id: `admin-contact-reply-${reply.id}` });
    }
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (controllerRef.current) return;
    const body = draft.body.trim();
    if (!body || body.length > maximumLength) {
      setFieldError(`Введите ответ от 1 до ${maximumLength} символов`);
      contentRef.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    historyControllerRef.current?.abort();
    const requestId = draft.requestId ?? crypto.randomUUID();
    onDraftChange((current) => ({ ...current, requestId }));
    setBusy("send");
    setActionError("");
    setReceipt(null);
    try {
      const reply = await createContactReply(contactId, body, requestId, controller.signal);
      if (controller.signal.aborted) return;
      showResult(reply);
      onDraftChange((current) => current.requestId === requestId && current.body.trim() === body
        ? { ...current, body: "", requestId: null } : current);
    } catch (reason: unknown) {
      if (!controller.signal.aborted) {
        setActionError(errorMessage(reason, "Не удалось получить результат отправки — проверьте историю перед повтором"));
      }
    } finally {
      if (!controller.signal.aborted) {
        controllerRef.current = null;
        setBusy(null);
        setRevision((current) => current + 1);
      }
    }
  }

  async function retry(reply: ContactReply) {
    if (!reply.canRetry || controllerRef.current) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    historyControllerRef.current?.abort();
    const requestId = draft.retryRequestIds[reply.id] ?? crypto.randomUUID();
    onDraftChange((current) => ({
      ...current,
      retryRequestIds: { ...current.retryRequestIds, [reply.id]: requestId },
    }));
    setBusy(reply.id);
    setActionError("");
    setReceipt(null);
    try {
      const updated = await retryContactReply(contactId, reply.id, requestId, controller.signal);
      if (controller.signal.aborted) return;
      showResult(updated);
      onDraftChange((current) => {
        const retryRequestIds = { ...current.retryRequestIds };
        if (retryRequestIds[reply.id] === requestId) delete retryRequestIds[reply.id];
        return { ...current, retryRequestIds };
      });
    } catch (reason: unknown) {
      if (!controller.signal.aborted) {
        setActionError(errorMessage(reason, "Не удалось получить результат повтора — проверьте историю ответов"));
      }
    } finally {
      if (!controller.signal.aborted) {
        controllerRef.current = null;
        setBusy(null);
        setRevision((current) => current + 1);
      }
    }
  }

  return (
    <div className={styles.section} data-admin-contact-replies={contactId}>
      <Button variant="secondary" onClick={showReplies} disabled={busy !== null} aria-expanded={open} aria-controls={contentId}>
        {open ? "Скрыть ответы" : draft.body ? "Ответить — есть черновик" : "Ответить"}
      </Button>
      {open && (
        <div className={styles.content} id={contentId} ref={contentRef} aria-busy={busy !== null}>
          <section aria-label={`Ответы на обращение №${contactId}`}>
            <h3 className={styles.heading}>Ответы</h3>
            {history.error ? (
              <Banner tone="danger" actions={<Button variant="secondary" disabled={busy !== null} onClick={() => {
                setHistory((current) => ({ ...current, error: "" }));
                setRevision((current) => current + 1);
              }}>Попробовать ещё раз</Button>}>
                {history.error}
              </Banner>
            ) : history.rows === null ? (
              <div className={styles.loading}><Loader inline label="Загрузка ответов" /></div>
            ) : !history.rows.length ? (
              <p className={styles.hint}>Ответов пока нет</p>
            ) : null}
            {Boolean(history.rows?.length) && (
              <ol className={styles.history}>
                {history.rows?.map((reply) => (
                  <li className={styles.reply} key={reply.id} data-contact-reply={reply.id}>
                    <div className={styles.replyHeading}>
                      <span className={styles.author}>{reply.authorName || `Администратор №${reply.authorId}`}</span>
                      <StatusBadge tone={statuses[reply.status].tone}>{reply.channel === "TELEGRAM" && reply.status === "SENT" ? "Принято Telegram" : statuses[reply.status].label}</StatusBadge>
                    </div>
                    <p className={styles.metadata}>
                      <time dateTime={reply.createdAt}>{formatDate(reply.createdAt)}</time>
                      {reply.sentAt && <> · Отправлено <time dateTime={reply.sentAt}>{formatDate(reply.sentAt)}</time></>}
                    </p>
                    <p className={styles.body}>{reply.body}</p>
                    <p className={styles.metadata}>Получатель: {reply.channel === "TELEGRAM" ? "Личный чат в Telegram" : reply.recipientEmail || "Email не указан"} · Попыток: {reply.attempts}</p>
                    {reply.status === "FAILED" && <Banner tone="danger">{reply.errorMessage || "Не удалось отправить ответ"}</Banner>}
                    {reply.status === "UNKNOWN" && <Banner tone="warning">Результат отправки неизвестен — сообщение могло уйти</Banner>}
                    {reply.canRetry && (
                      <div className={styles.retry}>
                        <Button variant="secondary" disabled={busy !== null} loading={busy === reply.id} onClick={() => void retry(reply)}>
                          Повторить отправку
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
          <FormError message={actionError} />
          {receipt && (receipt.status === "PENDING" || receipt.status === "SENDING") && (
            <Banner tone="info" role="status">Ответ отправляется — результат появится в истории</Banner>
          )}
          <form className={styles.form} onSubmit={(event) => void send(event)} noValidate>
            <Textarea
              label="Ответ на обращение"
              required
              rows={5}
              maxLength={maximumLength}
              hint={`До ${maximumLength} символов`}
              value={draft.body}
              error={fieldError}
              disabled={busy !== null}
              onChange={(event) => {
                const body = event.target.value;
                onDraftChange((current) => ({ ...current, body, requestId: null }));
                setFieldError("");
                setActionError("");
                setReceipt(null);
              }}
            />
            <div className={styles.actions}>
              <span className={styles.hint}>{channel === "TELEGRAM" ? `В Telegram${telegramUsername ? ` · @${telegramUsername.replace(/^@/, "")}` : ""}` : `На ${email || "email не указан"}`}</span>
              <Button type="submit" variant="primary" disabled={busy !== null} loading={busy === "send"}>
                Отправить ответ
              </Button>
            </div>
          </form>
          {channel === "TELEGRAM" && <p className={styles.hint}>Принятие Telegram подтверждает отправку в чат, но не прочтение пользователем</p>}
        </div>
      )}
    </div>
  );
}
