"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { DesignSystemIcon as Icon } from "../../components/ui/DesignSystemIcon";
import { RequestError } from "../../components/ui/RequestError";
import { NotificationBadge } from "../../components/ui/NotificationBadge";
import { useSellerAttention } from "../lib/SellerAttentionContext";
import { emitSellerNavigationChanged } from "../lib/sellerNavigationEvents";
import type { SellerTab } from "../types";
import styles from "./SellerNextActions.module.css";

const sections: { tab: SellerTab; title: string }[] = [
  { tab: "orders", title: "Заказы и возвраты" },
  { tab: "products", title: "Товары с замечаниями" },
  { tab: "finance", title: "Выплаты и баланс" },
  { tab: "legal", title: "Данные и условия" },
  { tab: "brand", title: "Оформление магазина" },
];

export function SellerNextActions() {
  const attention = useSellerAttention();
  const actions = sections.filter(section => attention.items[section.tab]);
  if (!attention.loading && !attention.hasErrors && !actions.length) return null;
  return <section className={styles.section} aria-label="Требует внимания">
    <div className={styles.heading}>
      <h2>Требует внимания</h2>
      <Button variant="ghost" className={styles.refresh} loading={attention.loading} reserveLabelSpace={false}
        aria-label="Обновить задачи магазина" onClick={emitSellerNavigationChanged}>
        <RefreshCw size={18} strokeWidth={1.5} aria-hidden="true" />
      </Button>
    </div>
    {attention.hasErrors && <RequestError variant="inline" message="Часть задач не удалось проверить"
      onRetry={emitSellerNavigationChanged} loading={attention.loading} />}
    <div className={styles.actions} aria-busy={attention.loading}>
      {actions.map(section => {
        const task = attention.items[section.tab]!;
        return <Link className={styles.action} key={section.tab} href={task.href} prefetch={false}
          data-seller-next-action={section.tab} data-tone={task.tone}>
          <NotificationBadge count={task.count} tone={task.tone} />
          <span><strong>{section.title}</strong><span>{task.description}</span></span>
          <Icon name="chevron-right" role="utility" />
        </Link>;
      })}
    </div>
  </section>;
}
