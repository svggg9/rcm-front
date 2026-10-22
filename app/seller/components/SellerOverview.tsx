"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "../../components/ui/Button";
import { Price } from "../../components/ui/Price";
import { CabinetSkeleton } from "../../components/ui/CabinetSkeleton";
import { DesignSystemIcon as Icon } from "../../components/ui/DesignSystemIcon";
import { EmptyState } from "../../components/ui/EmptyState";
import { RequestError } from "../../components/ui/RequestError";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { getSellerOrdersClient } from "../lib/sellerClientDataApi";
import { buildSellerStatusLabel } from "../lib/sellerOrderStatus";
import type { SellerOnboardingStatus } from "../lib/sellerOnboardingApi";
import type { SellerBrand, SellerDashboardSummary } from "../types";
import { SellerOrderCard } from "./SellerOrderCard";
import { SellerHomeTasks } from "./SellerHomeTasks";
import { SellerNextActions } from "./SellerNextActions";
import { telegramUrl } from "../../lib/telegram";
import styles from "./SellerOverview.module.css";

function useOverviewResource<T,>(load: () => Promise<T>, active: boolean) {
  const [state, setState] = useState<{ data?: T; error?: boolean; loading: boolean }>({ loading: true });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!active) return;
    let mounted = true;
    load().then(data => {
      if (mounted) setState({ data, loading: false });
    }).catch(() => {
      if (mounted) setState(previous => ({ ...previous, error: true, loading: false }));
    });
    return () => { mounted = false; };
  }, [load, attempt, active]);
  return {
    ...state,
    retry: () => {
      setState(previous => ({ ...previous, loading: true }));
      setAttempt(value => value + 1);
    },
  };
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
  const supportTelegramUrl = telegramUrl(summary?.supportTelegramUrl);
  return <div className={styles.overview} data-seller-overview>
    <div className={styles.work} data-seller-work>
      <section className={styles.section} aria-label="Действия">
        <h2>Действия</h2>
        <div className={styles.quickActions}>
          <Button className={styles.quickAction} onClick={onCreateProduct}>
            <Icon name="plus" role="utility" /><span>Добавить товар</span>
          </Button>
          <Link className={styles.quickAction} href="/seller/orders" prefetch={false}>
            <Icon name="shopping-bag" role="utility" /><span>Открыть заказы</span>
          </Link>
          <Link className={styles.quickAction} href="/seller/products?section=collections" prefetch={false}>
            <Icon name="images" role="utility" /><span>Подборки</span>
          </Link>
          <Link className={styles.quickAction} href="/seller/legal" prefetch={false}>
            <Icon name="file" role="utility" /><span>Реквизиты</span>
          </Link>
        </div>
      </section>

      <SellerNextActions />

      <section className={styles.section} aria-label="Задачи магазина">
        <h2>Задачи</h2>
        <SellerHomeTasks active={active} hasSetupTasks={false} variant="plain">{null}</SellerHomeTasks>
      </section>

      <section className={styles.section} aria-label="Последние заказы">
        <header className={styles.heading}>
          <h2>Последние заказы</h2>
          <Link href="/seller/orders" prefetch={false}>Все заказы <Icon name="arrow-up-right" role="utility" /></Link>
        </header>
        <div className={styles.orders}>
          {orders.error && <RequestError variant={orders.data ? "inline" : "section"} message="Не удалось загрузить заказы"
            onRetry={orders.retry} loading={orders.loading} />}
          {!orders.data && !orders.error && <CabinetSkeleton variant="list" rows={2} compact />}
          {orders.data?.content.length === 0 && <EmptyState title="Заказов пока нет" />}
          {orders.data?.content.slice(0, 2).map(order => <SellerOrderCard key={order.id} order={order}
            statusLabel={buildSellerStatusLabel(order)} showStageElapsed={false} worklist
            onOpenOrder={id => onNavigate(`/seller/orders/${id}`)} />)}
        </div>
      </section>
    </div>

    <aside className={styles.summary} aria-label="Сводка магазина" data-seller-summary>
      <section className={styles.section} aria-label="Магазин">
        <h1>Ваш магазин</h1>
        <Link href="/seller/store" className={styles.storeIdentity}>
          <span><strong>{brand?.name || "Магазин"}</strong><span>Настроить магазин</span></span>
        </Link>
      </section>

      <section className={styles.section} aria-label="Финансы">
        <header className={styles.heading}><h2>Финансы</h2><Link href="/seller/finance" aria-label="Все финансы"><Icon name="arrow-up-right" role="utility" /></Link></header>
        <div className={styles.balances}>
          <Balance label="Доступно к выплате" icon="wallet" value={summary ? <Price amount={summary.availablePayout} /> : undefined} primary positive={Boolean(summary && summary.availablePayout > 0)} />
          <Balance label="Ожидает доступности" icon="clock" value={summary ? <Price amount={summary.processingPayout} /> : undefined} />
          <Balance label="В выплатах" icon="money" value={summary ? <Price amount={summary.inPayoutAmount} /> : undefined} />
        </div>
      </section>

      <section className={styles.section} aria-label="Сводка товаров и заказов">
        <h2>Показатели магазина</h2>
        <div className={styles.rows}>
          <SummaryRow label="Всего товаров" href="/seller/products?status=all" value={summary?.totalProducts} />
          <SummaryRow label="Опубликованы" href="/seller/products?status=ACTIVE" value={summary?.activeProducts} />
          <SummaryRow label="Требуют внимания" href="/seller/products?status=attention" value={summary?.attentionProducts} />
          <SummaryRow label="Всего заказов" href="/seller/orders" value={summary?.totalOrders} />
          <SummaryRow label="В работе" href="/seller/orders" value={summary?.activeOrders} />
          <SummaryRow label="К отправке" href="/seller/orders" value={summary?.readyOrders} />
        </div>
      </section>

      <section className={styles.section} aria-label="Данные и документы">
        <header className={styles.heading}><h2>Данные и документы</h2><Link href="/seller/legal" aria-label="Открыть данные и документы"><Icon name="arrow-up-right" role="utility" /></Link></header>
        <div className={styles.details}>
          <Link href="/seller/store"><span>Описание и логотип</span><Completion value={brand ? Boolean(brand.description && brand.wordmarkUrl) : undefined} /></Link>
          <Link href="/seller/legal"><span>Реквизиты и данные</span><Completion value={onboarding?.legalCompleted} /></Link>
          <Link href="/seller/legal?section=bank"><span>Условия работы</span><Completion value={onboarding?.agreementAccepted} /></Link>
          <Link href="/seller/legal?section=contacts"><span>Telegram</span><span className={styles.detailValue}>{!summary ? "Нет данных" : !summary.telegramLinked ? "Не подключён" : summary.telegramEnabled === true ? "Уведомления включены" : summary.telegramEnabled === false ? "Уведомления выключены" : "Аккаунт подключён"}</span></Link>
        </div>
      </section>

      {supportTelegramUrl ? <a className={styles.support} href={supportTelegramUrl} target="_blank" rel="noopener noreferrer">Поддержка в Telegram <Icon name="arrow-up-right" role="utility" /></a>
        : <Link className={styles.support} href="/contacts">Помощь и поддержка <Icon name="arrow-up-right" role="utility" /></Link>}
    </aside>
  </div>;
}

function Balance({ label, icon, value, primary = false, positive = false }: {
  label: string; icon: "wallet" | "clock" | "money"; value?: ReactNode; primary?: boolean; positive?: boolean;
}) {
  return <div className={`${styles.balance} ${primary ? styles.primaryBalance : ""}`} data-positive={positive || undefined}>
    <span className={styles.summaryIcon}><Icon name={icon} role="utility" /></span>
    <div><span>{label}</span><strong>{value ?? "—"}</strong></div>
  </div>;
}

function SummaryRow({ label, href, value }: { label: string; href: string; value?: number }) {
  return <Link className={styles.row} href={href} prefetch={false}><span>{label}</span><strong>{value ?? "—"}</strong></Link>;
}

function Completion({ value }: { value?: boolean }) {
  return <StatusBadge tone={value === undefined ? "default" : value ? "success" : "warning"}>{value === undefined ? "Нет данных" : value ? "Готово" : "Требует действий"}</StatusBadge>;
}
