"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Ellipsis } from "lucide-react";
import Link from "next/link";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Banner";
import { Dialog } from "../../components/ui/Dialog";
import { Icon } from "../../components/ui/Icon";
import type { SellerProductListItem } from "../types";
import {
  formatSelectedProducts, getProductActionSelection, productActionBlockedReason, productActionLabels, type ProductAction,
} from "../lib/sellerProductActions";
import { ProductFailureGroups } from "./ProductFailureGroups";
import styles from "./SellerProductsTab.module.css";
import menuStyles from "../../components/ui/ActionMenu.module.css";

type ActionItem = { action: ProductAction; reason?: string | null };

export function ProductActionsMenu({
  label,
  items,
  disabled,
  onAction,
  onCreateCollection,
  collectionReason,
}: {
  label: string;
  items: ActionItem[];
  disabled?: boolean;
  onAction: (action: ProductAction) => void;
  onCreateCollection?: () => void;
  collectionReason?: string | null;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function dismiss(event: Event) {
      if (event.target instanceof Node && menu.current?.contains(event.target)) return;
      menu.current?.hidePopover();
    }
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => { window.removeEventListener("scroll", dismiss, true); window.removeEventListener("resize", dismiss); };
  }, [open]);

  function close() {
    menu.current?.hidePopover();
    trigger.current?.focus({ preventScroll: true });
  }

  function toggle() {
    const element = menu.current;
    const button = trigger.current;
    if (!element || !button) return;
    if (element.matches(":popover-open")) { close(); return; }
    element.showPopover();
    const rect = button.getBoundingClientRect();
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    element.style.left = `${Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))}px`;
    element.style.top = `${Math.max(8, rect.bottom + height + 8 < window.innerHeight ? rect.bottom + 8 : rect.top - height - 8)}px`;
    element.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
  }

  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") { event.preventDefault(); close(); return; }
    if (event.key === "Tab") { close(); return; }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const buttons = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    const index = buttons.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
      : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  }

  return <>
    <button type="button" ref={trigger} className={`buttonGhost ${styles.iconButton}`} aria-label={label}
      aria-haspopup="menu" aria-expanded={open} aria-controls={id} disabled={disabled}
      onClick={toggle} onKeyDown={event => { if (event.key === "ArrowDown") { event.preventDefault(); toggle(); } }}>
      <Ellipsis size={24} strokeWidth={1.5} aria-hidden="true" />
    </button>
    <div id={id} ref={menu} popover="auto" role="menu" aria-label={label} className={menuStyles.panel}
      onToggle={event => setOpen(event.newState === "open")} onKeyDown={navigate}>
      {onCreateCollection ? <button type="button" role="menuitem" aria-disabled={!!collectionReason}
        onClick={() => { if (!collectionReason) { close(); onCreateCollection(); } }}>
        <span>Создать подборку</span>
        {collectionReason ? <small>{collectionReason}</small> : null}
      </button> : null}
      {items.map(({ action, reason }) => <button key={action} type="button" role="menuitem"
        className={action === "delete" ? menuStyles.danger : undefined} aria-disabled={!!reason}
        onClick={() => { if (!reason) { close(); onAction(action); } }}>
        <span>{productActionLabels[action]}</span>
        {reason ? <small>{reason}</small> : null}
      </button>)}
      {items.some(({ reason }) => /заблокирован|поддержк/i.test(reason ?? "")) ?
        <Link href="/contacts" role="menuitem" onClick={close}>Поддержка</Link> : null}
    </div>
  </>;
}

export function ProductSelectionBar({ products, busy, onAction, onSelectAll, onClear, allSelected, onAddToCollection }: {
  products: SellerProductListItem[];
  busy: boolean;
  allSelected: boolean;
  onAction: (action: ProductAction) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onAddToCollection: () => void;
}) {
  const primary: ProductAction = products.every(product => product.status === "ARCHIVED") ? "draft" : "publish";
  function reason(action: ProductAction) {
    return products.some(product => !productActionBlockedReason(action, product.status)) ? null
      : productActionBlockedReason(action, products[0]?.status);
  }
  return <section className={styles.selectionBar} aria-label="Действия с выбранными товарами">
    <div className={styles.selectionSummary}>
      <strong aria-live="polite">{formatSelectedProducts(products.length)}</strong>
      {products.some(product => product.status !== "ACTIVE") ? <small className={styles.selectionHint}>В подборку — только активные товары</small> : products.length > 12 ? <small className={styles.selectionHint}>В подборку — до 12 товаров</small> : null}
      <button type="button" className={styles.selectAllLink} onClick={onSelectAll} disabled={busy || allSelected}>
        {allSelected ? "Все показанные выбраны" : "Выбрать все показанные"}
      </button>
    </div>
    <div className={styles.selectionActions}>
      <Button variant="secondary" disabled={busy || products.some(product => product.status !== "ACTIVE") || products.length > 12}
        title={products.some(product => product.status !== "ACTIVE") ? "Выберите только активные товары" : products.length > 12 ? "В подборке может быть не более 12 товаров" : undefined}
        onClick={onAddToCollection}>В подборку</Button>
      {primary === "publish" && !reason("publish") ? <Button variant="primary" disabled={busy} onClick={() => onAction("publish")}>На модерацию</Button> : null}
      {primary === "draft" ? <Button variant="tertiary" disabled={busy || !!reason("draft")} onClick={() => onAction("draft")}>{productActionLabels.draft}</Button> : null}
      {primary !== "draft" ? <Button variant="tertiary" disabled={busy || !!reason("archive")} title={reason("archive") || undefined}
        onClick={() => onAction("archive")}>В архив</Button> : null}
      <Button variant="ghost" className={styles.iconButton} aria-label="Удалить выбранные товары"
        title={reason("delete") || "Удалить выбранные товары"} disabled={busy || !!reason("delete")}
        onClick={() => onAction("delete")}>
        <Icon name="trash" size={24} />
      </Button>
    </div>
    <Button variant="ghost" className={styles.clearSelection} aria-label="Снять выделение" disabled={busy} onClick={onClear}>
      <Icon name="x" size={24} />
    </Button>
  </section>;
}

export function ProductActionDialog({ action, products, busy, completed, onConfirm, onClose }: {
  action: ProductAction;
  products: SellerProductListItem[];
  busy: boolean;
  completed: number;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { allowed, blocked } = getProductActionSelection(action, products);
  const explanation: Record<ProductAction, string> = {
    publish: "Карточки пройдут проверку перед публикацией. Если обязательных данных не хватает, покажем, какие товары нужно исправить",
    archive: "Товары исчезнут с витрины. Карточки сохранятся в архиве, существующие заказы не изменятся",
    draft: "Товары вернутся в черновики. Чтобы снова появились на витрине, отправьте их на модерацию",
    delete: "Товары исчезнут с витрины и из вашего списка. Заказы и история сохранятся. Самостоятельное восстановление недоступно. Если планируете продавать их позже, используйте архив",
  };
  return <Dialog title={`${productActionLabels[action]}?`} busy={busy} onClose={onClose} actions={<>
    <Button variant="secondary" disabled={busy} onClick={onClose}>Отмена</Button>
    <Button variant="primary" loading={busy} disabled={!allowed.length} onClick={onConfirm}>
      {`${productActionLabels[action]}${products.length > 1 ? ` (${allowed.length})` : ""}`}
    </Button>
  </>}>
    <p>{explanation[action]}</p>
    <p className={styles.confirmCount}>{products.length === 1 ? products[0].title.trim() || "Без названия" : `Будет обработано ${allowed.length} из ${products.length}`}</p>
    {products.length > 1 && allowed.length > 0 ? <ul className={styles.confirmList}>
      {allowed.slice(0, 5).map(product => <li key={product.id}>{product.title.trim() || "Без названия"}</li>)}
      {allowed.length > 5 ? <li>И ещё {allowed.length - 5}</li> : null}
    </ul> : null}
    {blocked.length ? <Banner tone="warning" title="Не будут обработаны">
      <ProductFailureGroups failures={blocked} disabled={busy} onNavigate={onClose} />
    </Banner> : null}
    {busy ? <p role="status" aria-live="polite">Обработано {completed} из {allowed.length}</p> : null}
  </Dialog>;
}
