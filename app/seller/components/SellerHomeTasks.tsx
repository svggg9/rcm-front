"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "../../components/ui/Button";
import { DesignSystemIcon as Icon } from "../../components/ui/DesignSystemIcon";
import { CabinetSkeleton } from "../../components/ui/CabinetSkeleton";
import { CabinetPanel } from "../../components/ui/CabinetPanel";
import { getSellerTasks, type SellerTask } from "../lib/sellerTasks";
import styles from "./SellerHomeTab.module.css";
import listItemStyles from "../../components/ui/CabinetListItem.module.css";

type State = { status: "loading" } | { status: "ready"; tasks: SellerTask[]; hasNext: boolean };

export function SellerHomeTasks({ children, hasSetupTasks, active = true }: { children: ReactNode; hasSetupTasks: boolean; active?: boolean }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(true);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const refresh = () => setAttempt(value => value + 1);
    window.addEventListener("seller-return-updated", refresh);
    return () => window.removeEventListener("seller-return-updated", refresh);
  }, []);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    Promise.resolve().then(() => {
      controller.signal.throwIfAborted();
      setBusy(true);
      setRefreshError(null);
      return getSellerTasks(controller.signal, category, page);
    }).then(result => {
      if (!controller.signal.aborted) setState({ status: "ready", tasks: result.content, hasNext: result.hasNext });
    }).catch(error => {
      if (!controller.signal.aborted) setRefreshError(error instanceof Error ? error.message : "Не удалось загрузить задачи");
    }).finally(() => {
      if (!controller.signal.aborted) setBusy(false);
    });
    return () => controller.abort();
  }, [attempt, category, page, active]);

  const filteredTasks = state.status === "ready" ? state.tasks.filter(task => category === "all" || task.id.startsWith(`${category}-`)) : [];
  return <CabinetPanel className={styles.tasksPanel} value={category} ariaLabel="Тип задач"
      items={[{ value: "all", label: "Все" }, { value: "order", label: "Заказы" }, { value: "return", label: "Возвраты" }, { value: "product", label: "Товары" }]}
      onChange={value => { setCategory(value); setPage(0); setState({ status: "loading" }); }}>
    {state.status === "loading" && busy && <CabinetSkeleton variant="list" rows={2} compact />}
    {refreshError && <div className="alertDanger" role="alert">
      <p>{refreshError}</p><Button onClick={() => setAttempt(value => value + 1)}>Повторить</Button>
    </div>}
    {state.status === "ready" && filteredTasks.map(task => <SellerTaskRow key={task.id} task={task} now={now} />)}
    {state.status === "ready" && category !== "all" && filteredTasks.length === 0 && <p>Задач этого типа пока нет</p>}
    {children}
    {state.status === "ready" && <div>
      {busy && <span role="status">Обновляем задачи…</span>}
      {page > 0 && <Button disabled={busy} onClick={() => { setState({ status: "loading" }); setPage(value => value - 1); }}>Назад</Button>}
      {state.hasNext && <Button disabled={busy} onClick={() => { setState({ status: "loading" }); setPage(value => value + 1); }}>Следующие задачи</Button>}
    </div>}
    {state.status === "ready" && category === "all" && !state.tasks.length && !hasSetupTasks && <div className={styles.emptyTasks}>
      <Icon name="check-circle" role="empty" /><strong>Новых задач пока нет</strong>
    </div>}
  </CabinetPanel>;
}

export function SellerTaskRow({ task, now }: { task: SellerTask; now: number | null }) {
  const overdue = Boolean(task.dueAt && now !== null && Date.parse(task.dueAt) < now);
  return <Link href={task.href} scroll={false} prefetch={false} className={`${styles.task} ${styles.compactTask} ${listItemStyles.item}`}>
    <span className={`${styles.taskIcon} ${task.tone === "danger" || overdue ? styles.taskDanger : ""}`}><Icon name={task.icon} /></span>
    <div className={styles.taskCopy}>
      <strong>{task.title}</strong>
      <span>{task.object}</span>
      {task.description && <span>{task.description}</span>}
      {task.dueAt ? <time dateTime={task.dueAt} className={overdue ? styles.taskDeadlineOverdue : undefined}>
        {overdue ? "Срок отправки истёк: " : "Передать в доставку до "}
        {new Date(task.dueAt).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
      </time> : task.id.startsWith("order-") ? <span>Время оплаты не указано — срок не рассчитан</span> : null}
    </div>
    <Icon name="arrow-up-right" role="utility" className={styles.taskArrow} />
  </Link>;
}
