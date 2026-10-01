"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "../../components/ui/Button";
import { Price } from "../../components/ui/Price";
import { CabinetSkeleton } from "../../components/ui/CabinetSkeleton";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { getSellerOrdersClient } from "../lib/sellerClientDataApi";
import { buildSellerStatusLabel } from "../lib/sellerOrderStatus";
import type { SellerOnboardingStatus } from "../lib/sellerOnboardingApi";
import type { SellerBrand, SellerDashboardSummary } from "../types";
import { SellerOrderCard } from "./SellerOrderCard";
import { SellerHomeTasks } from "./SellerHomeTasks";
import styles from "./SellerOverview.module.css";

function useOverviewResource<T,>(load: () => Promise<T>, active: boolean) {
  const [state, setState] = useState<{ data?: T; error?: boolean }>({});
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!active) return;
    let mounted = true;
    load().then(data => { if (mounted) setState({ data }); }).catch(() => { if (mounted) setState({ error: true }); });
    return () => { mounted = false; };
  }, [load, attempt, active]);
  return { ...state, retry: () => { setState({}); setAttempt(value => value + 1); } };
}
const loadOrders = () => getSellerOrdersClient(0, 5);

export function SellerOverview({ active, brand, summary, onboarding, onNavigate, onCreateProduct }: {
  active: boolean;
  brand: SellerBrand | null;
  summary: SellerDashboardSummary | null;
  onboarding: SellerOnboardingStatus | null;
  onNavigate: (href: string) => void;
  onCreateProduct: () => void;
}) {
  const orders = useOverviewResource(loadOrders, active);
  return <div className={styles.overview}>
    <div className={styles.topGrid}>
    <section className={styles.attention} aria-label="Требует внимания">
      <h2 className={styles.attentionTitle}>Требует внимания</h2>
      <SellerHomeTasks active={active} hasSetupTasks={Boolean(summary?.failedPayouts)}>
        {Boolean(summary?.failedPayouts) && <Link className={styles.row} href="/seller/finance?view=payouts">
          <span>Не удалось провести выплату</span><StatusBadge tone="danger">Проверить выплаты</StatusBadge>
        </Link>}
      </SellerHomeTasks>
    </section>

    <OverviewBlock title="Заказы" href="/seller/orders" action="Все заказы">
      <div className={styles.metrics}>
        <Metric label="Всего" value={summary?.totalOrders} />
        <Metric label="В работе" value={summary?.activeOrders} />
        <Metric label="К отправке" value={summary?.readyOrders} />
      </div>
      <div className={styles.orders}>
      <div className={styles.orderHeader} aria-hidden="true"><span>Дата</span><span>Заказ</span><span>Товары</span><span>Статус</span><span>Сумма</span><span /></div>
      <ResourceState resource={orders}>
        {orders.data?.content.length === 0 ? <p className={styles.empty}>Заказов пока нет</p> : orders.data?.content.slice(0, 2).map(order =>
          <SellerOrderCard key={order.id} order={order} statusLabel={buildSellerStatusLabel(order)} showStageElapsed={false} tableLayout navigateOnOpen compact
            onOpenOrder={id => onNavigate(`/seller/orders?orderId=${id}`)} />)}
      </ResourceState>
      </div>
    </OverviewBlock>
    </div>

    <div className={styles.grid}>
      <OverviewBlock title="Товары" href="/seller/products" action="Все товары">
        <Button variant="secondary" onClick={onCreateProduct}>+ Добавить товар</Button>
        <Link className={styles.row} href="/seller/products"><span>Всего товаров</span><strong>{summary?.totalProducts ?? "—"}</strong></Link>
        <Link className={styles.row} href="/seller/products?status=ACTIVE"><span>Опубликованы</span><strong>{summary?.activeProducts ?? "—"}</strong></Link>
        <Link className={styles.row} href="/seller/products?status=attention"><span>Требуют внимания</span><StatusBadge tone={summary?.attentionProducts ? "danger" : "default"}>{summary?.attentionProducts ?? "—"}</StatusBadge></Link>
        <Link className={styles.row} href="/seller/products?section=collections"><span>Подборки</span><span>Управлять →</span></Link>
      </OverviewBlock>

      <OverviewBlock title="Финансы" href="/seller/finance" action="Все финансы">
        <div className={styles.metrics}>
          <Metric label="Доступно к выплате" value={summary ? <Price amount={summary.availablePayout} /> : undefined} />
          <Metric label="Ожидает доступности" value={summary ? <Price amount={summary.processingPayout} /> : undefined} />
          <Metric label="В выплатах" value={summary ? <Price amount={summary.inPayoutAmount} /> : undefined} />
        </div>
        <p className={styles.empty}>График выплат и история операций — в разделе «Финансы».</p>
      </OverviewBlock>

      <OverviewBlock title="Магазин" href="/seller/store" action="Настроить">
        <div className={styles.row}><span>{brand?.name || "Магазин не создан"}</span></div>
        <Link className={styles.row} href="/seller/store"><span>Описание и логотип</span><StatusBadge tone={brand?.description && brand?.wordmarkUrl ? "success" : "warning"}>{brand?.description && brand?.wordmarkUrl ? "Заполнены" : "Нужно заполнить"}</StatusBadge></Link>
      </OverviewBlock>

      <OverviewBlock title="Данные и документы" href="/seller/legal" action="Открыть">
        <Link className={styles.row} href="/seller/legal"><span>Реквизиты и данные</span><Completion value={onboarding?.legalCompleted} /></Link>
        <Link className={styles.row} href="/seller/legal"><span>Условия работы</span><Completion value={onboarding?.agreementAccepted} /></Link>
        <Link className={styles.row} href="/seller/legal"><span>Уведомления в Telegram</span><StatusBadge tone={summary?.telegramLinked ? "success" : "default"}>{!summary ? "Нет данных" : summary.telegramLinked ? "Подключены" : "Не подключены"}</StatusBadge></Link>
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
