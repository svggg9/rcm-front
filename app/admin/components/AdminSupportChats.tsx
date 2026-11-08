"use client";

import { AdminSearchForm } from "./AdminSearchForm";
import { FormSelect } from "../../components/ui/FormSelect";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "../../components/ui/Button";
import { CabinetSkeleton } from "../../components/ui/CabinetSkeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { RequestError } from "../../components/ui/RequestError";
import { SupportChatView } from "../../components/support/SupportChatView";
import { ApiRequestError } from "../../lib/apiErrors";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { adminSupportTransport, getSupportChats, SUPPORT_STATUSES, type SupportChatPage, type SupportChatStatus } from "../../lib/supportChat";
import styles from "../../components/support/SupportChatView.module.css";

export function AdminSupportChats() {
  const params = useSearchParams();
  const { user, error: sessionError, reload } = useCurrentUser();
  const rawId = Number(params.get("chat"));
  const selected = Number.isSafeInteger(rawId) && rawId > 0 ? rawId : null;
  const transport = useMemo(() => selected ? adminSupportTransport(selected) : null, [selected]);
  const back = new URLSearchParams(params); back.delete("chat");
  if (sessionError) return <RequestError message="Не удалось проверить вход администратора" onRetry={async () => { await reload(); }} />;
  if (!user) return <CabinetSkeleton variant="list" rows={3} compact />;
  if (selected && transport) return <div className={styles.root}>
    <Link href={`/admin?${back}`} scroll={false}>← К списку диалогов</Link>
    <SupportChatView key={`${user.id}:${selected}`} admin transport={transport} storageNamespace={`admin:${user.id}`} />
  </div>;
  return <SupportChatList key={user.id} />;
}

function SupportChatList() {
  const params = useSearchParams(); const router = useRouter(); const query=params.get("q")??"";
  const rawStatus = params.get("chatStatus");
  const status: SupportChatStatus | "ALL" = rawStatus && Object.hasOwn(SUPPORT_STATUSES, rawStatus) ? rawStatus as SupportChatStatus : "ALL";
  const rawPage = Number(params.get("chatPage")); const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 0;
  const [revision, setRevision] = useState(0); const key = `${status}:${page}:${revision}:${query}`;
  const [result, setResult] = useState<{ key: string; data?: SupportChatPage; error?: string }>();
  useEffect(() => {
    let stopped = false; let controller: AbortController | undefined; let timer: ReturnType<typeof setTimeout> | undefined;
    async function load() {
      if (stopped || document.hidden) return;
      if (timer) clearTimeout(timer);
      controller?.abort(); const active = new AbortController(); controller = active;
      try { const data = await getSupportChats(status, page, active.signal, query); if (!stopped && !active.signal.aborted) setResult({ key, data }); }
      catch (reason) { if (!stopped && !active.signal.aborted) setResult({ key, error: reason instanceof ApiRequestError ? reason.message : "Не удалось загрузить диалоги" }); }
      finally { if (!stopped && !active.signal.aborted && !document.hidden) timer = setTimeout(() => void load(), 5000); }
    }
    const refresh = () => { if (!document.hidden) void load(); else { if (timer) clearTimeout(timer); controller?.abort(); } };
    void load(); window.addEventListener("focus", refresh); window.addEventListener("online", refresh); document.addEventListener("visibilitychange", refresh);
    return () => { stopped = true; if (timer) clearTimeout(timer); controller?.abort(); window.removeEventListener("focus", refresh); window.removeEventListener("online", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [status, page, key, query]);
  const current = result?.key === key ? result : undefined;
  function navigate(values: Record<string, string>) { const next = new URLSearchParams(params); Object.entries(values).forEach(([key, value]) => next.set(key, value)); router.push(`/admin?${next}`, { scroll: false }); }
  function href(id: number) { const next = new URLSearchParams(params); next.set("chat", String(id)); return `/admin?${next}`; }
  return <section className={styles.root} aria-label="Диалоги поддержки"><AdminSearchForm label="Имя, Telegram или текст диалога" />
    <div className={styles.tools}><FormSelect label="Статус диалогов" value={status} options={[{value:"ALL",label:"Все диалоги"},...Object.entries(SUPPORT_STATUSES).map(([value,label])=>({value,label}))]} onChange={value=>navigate({chatStatus:String(value||"ALL"),chatPage:"0"})} /><Button loading={!current} onClick={() => setRevision(value => value + 1)}>Обновить список</Button></div>
    {!current ? <CabinetSkeleton variant="list" rows={3} compact /> : current.error ? <RequestError message={current.error} onRetry={() => setRevision(value => value + 1)} /> : null}
    {current?.data && <>{current.data.content.length ? <div className={styles.list}>{current.data.content.map(chat => <Link className={styles.chatLink} href={href(chat.id)} key={chat.id} scroll={false}>
      <div><strong>{chat.name || "Личный диалог"}</strong>{chat.telegramUsername && <p className={styles.hint}>@{chat.telegramUsername.replace(/^@+/, "")}</p>}<p>{chat.lastMessage || "Сообщений пока нет"}</p></div>
      <span className={styles.hint}>{SUPPORT_STATUSES[chat.status]} · {new Date(chat.updatedAt).toLocaleString("ru-RU", { timeZone: "Europe/Moscow", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
    </Link>)}</div> : <EmptyState title="Диалогов пока нет" text="Здесь появится история общения из Telegram и с сайта" />}
      {current.data.totalPages > 1 && <nav className={styles.tools} aria-label="Страницы диалогов"><Button disabled={!page} onClick={() => navigate({ chatPage: String(page - 1) })}>Назад</Button>
        <span>Страница {page + 1} из {current.data.totalPages}</span><Button disabled={page + 1 >= current.data.totalPages} onClick={() => navigate({ chatPage: String(page + 1) })}>Далее</Button></nav>}
    </>}
  </section>;
}
