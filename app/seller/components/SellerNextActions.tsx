"use client";
import Link from "next/link";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Banner";
import { CabinetSkeleton } from "../../components/ui/CabinetSkeleton";
import { NotificationBadge } from "../../components/ui/NotificationBadge";
import { useSellerAttention } from "../lib/SellerAttentionContext";
import { emitSellerNavigationChanged } from "../lib/sellerNavigationEvents";
import type { SellerTab } from "../types";
import styles from "./SellerHomeTab.module.css";

const sections: { tab: SellerTab; title: string; all: string }[] = [
  { tab: "orders", title: "Заказы и возвраты", all: "/seller/orders" },
  { tab: "products", title: "Товары с замечаниями", all: "/seller/products?status=attention" },
  { tab: "finance", title: "Проверка выплат и баланса", all: "/seller/finance" },
  { tab: "legal", title: "Данные и условия работы", all: "/seller/legal" },
  { tab: "brand", title: "Оформление магазина", all: "/seller/store" },
];
export function SellerNextActions() {
  const attention = useSellerAttention();
  const actions = sections.filter(section => attention.items[section.tab]);
  return <section className={styles.panel} aria-label="Следующие действия">
    <div className={styles.setupHeading}><h2>Следующие действия</h2>
      <Button variant="secondary" disabled={attention.loading} onClick={emitSellerNavigationChanged}>Обновить</Button>
    </div>
    <p className={styles.setupCopy}>Сначала заказы и возвраты, затем замечания и подготовка магазина</p>
    {attention.loading && !actions.length && <CabinetSkeleton variant="list" rows={2} compact />}
    {attention.hasErrors && <Banner tone="danger" role="alert">Часть задач не удалось проверить — повторите обновление</Banner>}
    <div className={styles.taskList} aria-busy={attention.loading}>
      {actions.map(section => {
        const task = attention.items[section.tab]!;
        return <article className={styles.task} key={section.tab} data-seller-next-action={section.tab}>
          <NotificationBadge count={task.count} />
          <div className={styles.taskCopy}><strong>{section.title}</strong><p>{task.description}</p>
            <Link href={section.all} prefetch={false}>Открыть раздел →</Link>
          </div>
          <Link className={`buttonSecondary ${styles.action} ${styles.taskAction}`} href={task.href} prefetch={false}>Перейти к задаче</Link>
        </article>;
      })}
    </div>
    {!attention.loading && !attention.hasErrors && !actions.length && <div className={styles.emptyTasks}><strong>Всё готово — открытых задач нет</strong></div>}
  </section>;
}
