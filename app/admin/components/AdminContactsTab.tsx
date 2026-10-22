"use client";

import { Loader } from "../../components/ui/Loader";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "../../components/ui/Button";
import { CabinetPanel } from "../../components/ui/CabinetPanel";
import { CabinetSkeleton } from "../../components/ui/CabinetSkeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { FormSelect } from "../../components/ui/FormSelect";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { toast } from "../../components/ui/toast";
import { CONTACT_TOPIC_OPTIONS } from "../../lib/contactMessages";
import {
  getContactMessages,
  updateContactMessageStatus,
  type ContactMessage,
  type ContactMessageStatus,
} from "../lib/contactMessages";
import type { PageResponse } from "../types";
import { AdminContactReplies, EMPTY_CONTACT_REPLY_DRAFT, type ContactReplyDraft } from "./AdminContactReplies";
import styles from "./AdminContactsTab.module.css";
import { AdminSupportChats } from "./AdminSupportChats";

type Filter = ContactMessageStatus | "ALL";

const statusLabels: Record<ContactMessageStatus, string> = {
  NEW: "Новое",
  IN_PROGRESS: "В работе",
  CLOSED: "Закрыто",
};
const filters: { value: Filter; label: string }[] = [
  { value: "NEW", label: "Новые" },
  { value: "IN_PROGRESS", label: "В работе" },
  { value: "CLOSED", label: "Закрытые" },
  { value: "ALL", label: "Все" },
];
const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({ value, label }));

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function AdminContactsTab() {
  const params = useSearchParams(); const router = useRouter();
  const email = params.get("contactView") === "email" && !params.get("chat");
  const [emailVisited, setEmailVisited] = useState(email);
  function changeView(view: "chats" | "email") {
    if (view === "email") setEmailVisited(true);
    const next = new URLSearchParams(params); next.delete("chat");
    if (view === "email") next.set("contactView", "email"); else next.delete("contactView");
    router.push(`/admin?${next}`, { scroll: false });
  }
  return <div className={styles.page}><h1 className={styles.title}>Обращения</h1>
    <CabinetPanel items={[{ value: "chats", label: "Диалоги" }, { value: "email", label: "Email" }]}
      value={email ? "email" : "chats"} onChange={changeView} ariaLabel="Каналы обращений">
      {!email && <AdminSupportChats />}
      {(email || emailVisited) && <div hidden={!email}><EmailContacts /></div>}
    </CabinetPanel>
  </div>;
}

function EmailContacts() {
  const [status, setStatus] = useState<Filter>("NEW");
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data: PageResponse<ContactMessage> | null;
    error: string;
  } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, ContactReplyDraft>>({});
  const actionController = useRef<AbortController | null>(null);
  const key = `${status}:${page}:${revision}`;
  const loading = result?.key !== key;
  const data = !loading ? result?.data : null;
  const error = !loading ? result?.error : "";
  const busy = busyId !== null;

  useEffect(() => {
    const controller = new AbortController();
    void getContactMessages(status, page, controller.signal)
      .then((nextData) => {
        if (controller.signal.aborted) return;
        if (page > 0 && page >= nextData.totalPages) {
          setPage(Math.max(0, nextData.totalPages - 1));
        }
        setResult({ key, data: nextData, error: "" });
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setResult({
            key,
            data: null,
            error: reason instanceof Error ? reason.message : "Не удалось загрузить обращения",
          });
        }
      });
    return () => controller.abort();
  }, [key, page, status]);

  useEffect(() => () => actionController.current?.abort(), []);

  function changeFilter(nextStatus: Filter) {
    setStatus(nextStatus);
    setPage(0);
  }

  async function changeStatus(row: ContactMessage, nextStatus: ContactMessageStatus | "") {
    if (!nextStatus || nextStatus === row.status || actionController.current) return;
    const controller = new AbortController();
    actionController.current = controller;
    setBusyId(row.id);
    const toastId = `admin-contact-status-${row.id}`;
    try {
      const updated = await updateContactMessageStatus(row.id, nextStatus, controller.signal);
      if (!controller.signal.aborted) {
        toast.success(`Обращение №${row.id}: ${statusLabels[updated.status]}`, {
          id: toastId, description: undefined, action: undefined,
        });
        setRevision((value) => value + 1);
      }
    } catch (reason: unknown) {
      if (!controller.signal.aborted) {
        toast.error(reason instanceof Error ? reason.message : "Не удалось изменить статус обращения", { id: toastId });
      }
    } finally {
      if (!controller.signal.aborted) {
        actionController.current = null;
        setBusyId(null);
      }
    }
  }

  return (
    <div className={styles.page}>
      <CabinetPanel
        items={filters}
        value={status}
        onChange={changeFilter}
        ariaLabel="Статус обращений"
        disabled={busy}
        actions={
          <Button variant="ghost" disabled={busy || loading} onClick={() => setRevision((value) => value + 1)}>
            Обновить
          </Button>
        }
      >
        <div aria-busy={loading || busy} className={styles.content}>
          {loading ? (
            <CabinetSkeleton variant="list" compact />
          ) : error ? (
            <EmptyState
              title="Не удалось загрузить обращения"
              text={error}
              tone="danger"
              actions={<Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>Попробовать ещё раз</Button>}
            />
          ) : data?.content.length ? (
            <>
              <p className={styles.total}>Всего: {data.totalElements}</p>
              <div className={styles.list}>
                {data.content.map((row) => (
                  <article className={styles.card} key={row.id} aria-labelledby={`contact-message-${row.id}`}>
                    <div className={styles.heading}>
                      <h2 id={`contact-message-${row.id}`}>Обращение №{row.id}</h2>
                      <StatusBadge tone={row.status === "NEW" ? "warning" : row.status === "CLOSED" ? "success" : "default"}>
                        {statusLabels[row.status]}
                      </StatusBadge>
                    </div>
                    <dl className={styles.facts}>
                      <div><dt>Имя</dt><dd>{row.name}</dd></div>
                      <div><dt>Канал</dt><dd>{row.channel === "TELEGRAM" ? "Telegram" : "Email"}</dd></div>
                      {row.channel === "TELEGRAM" ? <div><dt>Аккаунт</dt><dd>{row.telegramUsername ? `@${row.telegramUsername.replace(/^@/, "")}` : "Личный чат"}</dd></div>
                        : <div><dt>Email</dt><dd>{row.email ? <a href={`mailto:${row.email}`}>{row.email}</a> : "Не указан"}</dd></div>}
                      <div><dt>Тема</dt><dd>{CONTACT_TOPIC_OPTIONS.find((option) => option.value === row.topic)?.label ?? row.topic}</dd></div>
                      {row.orderNumber && <div><dt>Номер заказа</dt><dd>{row.orderNumber}</dd></div>}
                      <div><dt>Получено</dt><dd><time dateTime={row.createdAt}>{formatDate(row.createdAt)}</time></dd></div>
                      <div><dt>Обновлено</dt><dd><time dateTime={row.updatedAt}>{formatDate(row.updatedAt)}</time></dd></div>
                    </dl>
                    <p className={styles.message}>{row.message}</p>
                    <div className={styles.statusControl}>
                      <FormSelect<ContactMessageStatus>
                        label={`Статус обращения №${row.id}`}
                        value={row.status}
                        options={statusOptions}
                        required
                        disabled={busy || loading}
                        onChange={(nextStatus) => void changeStatus(row, nextStatus)}
                      />
                      {busyId === row.id && <Loader inline className={styles.saving} label="Сохранение обращения" />}
                    </div>
                    <AdminContactReplies
                      contactId={row.id}
                      email={row.email}
                      channel={row.channel}
                      telegramUsername={row.telegramUsername}
                      draft={replyDrafts[row.id] ?? EMPTY_CONTACT_REPLY_DRAFT}
                      onDraftChange={(update) => setReplyDrafts((current) => ({
                        ...current,
                        [row.id]: update(current[row.id] ?? EMPTY_CONTACT_REPLY_DRAFT),
                      }))}
                    />
                  </article>
                ))}
              </div>
              {data.totalPages > 1 && (
                <nav className={styles.pagination} aria-label="Страницы обращений">
                  <Button variant="ghost" disabled={busy || page === 0} onClick={() => setPage((value) => value - 1)}>Назад</Button>
                  <span>Страница {data.number + 1} из {data.totalPages}</span>
                  <Button variant="ghost" disabled={busy || page + 1 >= data.totalPages} onClick={() => setPage((value) => value + 1)}>Далее</Button>
                </nav>
              )}
            </>
          ) : (
            <EmptyState title="Обращений пока нет" text={status === "ALL" ? "Здесь появятся сообщения из формы и Telegram" : "В выбранном статусе нет обращений"} icon="file" />
          )}
        </div>
      </CabinetPanel>
    </div>
  );
}
