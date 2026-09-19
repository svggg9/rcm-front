"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "../../components/ui/Button";
import { Price } from "../../components/ui/Price";
import { CabinetSkeleton } from "../../components/ui/CabinetSkeleton";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { getSellerFinanceClient, getSellerOrdersClient } from "../lib/sellerClientDataApi";
import { buildSellerStatusLabel } from "../lib/sellerOrderStatus";
import type { SellerOnboardingStatus } from "../lib/sellerOnboardingApi";
import type { SellerBrand, SellerDashboardSummary } from "../types";
import { SellerOrderCard } from "./SellerOrderCard";
import { SellerHomeTasks } from "./SellerHomeTasks";
import styles from "./SellerOverview.module.css";

function useOverviewResource<T,>(load: () => Promise<T>) {
  const [state, setState] = useState<{ data?: T; error?: boolean }>({});
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    load().then(data => { if (active) setState({ data }); }).catch(() => { if (active) setState({ error: true }); });
    return () => { active = false; };
  }, [load, attempt]);
  return { ...state, retry: () => { setState({}); setAttempt(value => value + 1); } };
}
const loadOrders = () => getSellerOrdersClient(0, 5);

export function SellerOverview({ brand, summary, onboarding, onNavigate, onCreateProduct }: {
  brand: SellerBrand | null;
  summary: SellerDashboardSummary | null;
  onboarding: SellerOnboardingStatus | null;
  onNavigate: (href: string) => void;
  onCreateProduct: () => void;
}) {
  const orders = useOverviewResource(loadOrders);
  const finance = useOverviewResource(getSellerFinanceClient);
  return <div className={styles.overview}>
    <div className={styles.topGrid}>
    <section aria-label="Требует внимания">
      <h2 className={styles.attentionTitle}>Требует внимания</h2>
      <SellerHomeTasks hasSetupTasks={Boolean(summary?.failedPayouts)}>
        {Boolean(summary?.failedPayouts) && <Link className={styles.row} href="/seller?tab=finance&view=payouts">
          <span>Не удалось провести выплату</span><StatusBadge tone="danger">Проверить выплаты</StatusBadge>
        </Link>}
      </SellerHomeTasks>
    </section>

    <OverviewBlock title="Заказы" href="/seller?tab=orders" action="Все заказы">
      <div className={styles.metrics}>
        <Metric label="Всего" value={summary?.totalOrders} />
        <Metric label="В работе" value={summary?.activeOrders} />
        <Metric label="К отправке" value={summary?.readyOrders} />
      </div>
      <div className={styles.orders}>
      <div className={styles.orderHeader} aria-hidden="true"><span>Дата</span><span>Заказ</span><span>Товары</span><span>Статус</span><span>Сумма</span><span /></div>
      <ResourceState resource={orders}>
        {orders.data?.content.length === 0 ? <p className={styles.empty}>Заказов пока нет</p> : orders.data?.content.slice(0, 3).map(order =>
          <SellerOrderCard key={order.id} order={order} statusLabel={buildSellerStatusLabel(order)} showStageElapsed={false} tableLayout navigateOnOpen compact
            onOpenOrder={id => onNavigate(`/seller?tab=orders&orderId=${id}`)} />)}
      </ResourceState>
      </div>
    </OverviewBlock>
    </div>

    <div className={styles.grid}>
      <OverviewBlock title="Товары" href="/seller?tab=products" action="Все товары">
        <Button variant="secondary" onClick={onCreateProduct}>+ Добавить товар</Button>
        <Link className={styles.row} href="/seller?tab=products"><span>Всего товаров</span><strong>{summary?.totalProducts ?? "—"}</strong></Link>
        <Link className={styles.row} href="/seller?tab=products&status=ACTIVE"><span>Опубликованы</span><strong>{summary?.activeProducts ?? "—"}</strong></Link>
        <Link className={styles.row} href="/seller?tab=products&status=attention"><span>Требуют внимания</span><StatusBadge tone={summary?.attentionProducts ? "danger" : "default"}>{summary?.attentionProducts ?? "—"}</StatusBadge></Link>
        <Link className={styles.row} href="/seller?tab=products&section=collections"><span>Подборки</span><span>Управлять →</span></Link>
      </OverviewBlock>

      <OverviewBlock title="Финансы" href="/seller?tab=finance" action="Все финансы">
        <div className={styles.metrics}>
          <Metric label="Доступно к выплате" value={summary ? <Price amount={summary.availablePayout} /> : undefined} />
          <Metric label="Расчётный баланс" value={summary ? <Price amount={summary.estimatedBalance} /> : undefined} />
        </div>
        <ResourceState resource={finance}>
          {finance.data && <>
            <Link className={styles.row} href="/seller?tab=finance&view=payouts"><span>Ближайшая выплата · {shortDate(finance.data.nextPayoutDate)}</span><Price amount={finance.data.nextPayoutAmount} /></Link>
            {finance.data.operations.slice(0, 3).map((operation, index) => <Link className={styles.row} key={`${operation.createdAt}-${index}`}
              href={operation.orderId ? `/seller?tab=orders&orderId=${operation.orderId}` : "/seller?tab=finance&view=operations"}>
              <span>{operation.type === "SALE" ? `Продажа${operation.orderId ? ` по заказу ${operation.orderId}` : ""}` : operation.type === "SELLER_PAYOUT" ? "Выплата" : "Возврат или удержание"}<small>{shortDate(operation.createdAt)}</small></span>
              <span className={styles.amount}>{operation.direction === "CREDIT" ? "+" : "−"}<Price amount={operation.amount} /></span>
            </Link>)}
            {finance.data.operations.length === 0 && <p className={styles.empty}>Операций пока нет</p>}
          </>}
        </ResourceState>
      </OverviewBlock>

      <OverviewBlock title="Магазин" href="/seller?tab=brand" action="Настроить">
        <div className={styles.row}><span>{brand?.name || "Магазин не создан"}</span></div>
        <Link className={styles.row} href="/seller?tab=brand"><span>Описание и логотип</span><StatusBadge tone={brand?.description && brand?.wordmarkUrl ? "success" : "warning"}>{brand?.description && brand?.wordmarkUrl ? "Заполнены" : "Нужно заполнить"}</StatusBadge></Link>
      </OverviewBlock>

      <OverviewBlock title="Данные и документы" href="/seller?tab=legal" action="Открыть">
        <Link className={styles.row} href="/seller?tab=legal"><span>Реквизиты и данные</span><Completion value={onboarding?.legalCompleted} /></Link>
        <Link className={styles.row} href="/seller?tab=legal"><span>Условия работы</span><Completion value={onboarding?.agreementAccepted} /></Link>
        <Link className={styles.row} href="/seller?tab=legal"><span>Уведомления в Telegram</span><StatusBadge tone={summary?.telegramLinked ? "success" : "default"}>{!summary ? "Нет данных" : summary.telegramLinked ? "Подключены" : "Не подключены"}</StatusBadge></Link>
      </OverviewBlock>
    </div>
    <Link className={styles.support} href="/contacts">Помощь и поддержка →</Link>
  </div>;
}

function OverviewBlock({ title, href, action, children }: { title: string; href: string; action: string; children: ReactNode }) {
  return <section className={styles.block} aria-label={title}><header className={styles.header}><h2>{title}</h2><Link href={href}>{action} →</Link></header><div className={styles.content}>{children}</div></section>;
}
function Metric({ label, value }: { label: string; value?: ReactNode }) {
  return <div className={styles.metric}><span>{label}</span><strong>{value ?? "—"}</strong></div>;
}
function Completion({ value }: { value?: boolean }) {
  return <StatusBadge tone={value === undefined ? "default" : value ? "success" : "warning"}>{value === undefined ? "Нет данных" : value ? "Готово" : "Требует действий"}</StatusBadge>;
}
function ResourceState({ resource, children }: { resource: { data?: unknown; error?: boolean; retry: () => void }; children: ReactNode }) {
  if (resource.error) return <div className={styles.failure} role="alert"><span>Не удалось загрузить данные</span><Button variant="secondary" onClick={resource.retry}>Повторить</Button></div>;
  if (!resource.data) return <CabinetSkeleton variant="list" rows={2} compact />;
  return <>{children}</>;
}
function shortDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Дата не указана" : date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
