"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, Headset } from "lucide-react";
import { getSellerBrands } from "../../seller/lib/sellerBrandApi";
import { getSellerDashboardSummaryClient } from "../../seller/lib/sellerClientDataApi";
import type { SellerBrand, SellerDashboardSummary } from "../../seller/types";

import styles from "./SellerHeader.module.css";

export function isSellerCabinetPath(pathname: string | null) {
  return pathname === "/seller" || pathname?.startsWith("/seller/products/") === true;
}

export function SellerHeader() {
  const [brand, setBrand] = useState<SellerBrand | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<SellerDashboardSummary | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let active = true;
    getSellerBrands().then(brands => { if (active) setBrand(brands[0] ?? null); }).catch(() => {});
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!open) return;
    let active = true;
    getSellerDashboardSummaryClient().then(value => { if (active) { setSummary(value); setFailed(false); } }).catch(() => { if (active) setFailed(true); });
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !panel.current?.contains(event.target)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { active = false; document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open, attempt]);
  return (
    <div className={`pageContainer ${styles.bar}`}>
      <div className={styles.identity}>
        <Link href="/" className={styles.logo} aria-label="рцмаркет — главная">
          <Image src="/brand/wordmark-gold-white.svg" alt="рцмаркет" width={794} height={100} priority />
        </Link>
        <span className={styles.caption}>Для продавцов</span>
      </div>
      <div className={styles.actions}>
        <Link href="/contacts" className={styles.iconButton} aria-label="Поддержка" title="Поддержка"><Headset size={22} strokeWidth={1.5} aria-hidden="true" /></Link>
        <div ref={panel} className={styles.notifications}>
          <button ref={trigger} type="button" className={styles.iconButton} aria-label="Уведомления" title="Уведомления" aria-expanded={open} aria-controls="seller-notifications" onClick={() => setOpen(value => !value)}><Bell size={22} strokeWidth={1.5} aria-hidden="true" /></button>
          {open && <section id="seller-notifications" className={styles.popover} aria-label="Уведомления">
            <h2>Уведомления</h2>
            {failed ? <div role="alert"><p>Не удалось загрузить уведомления</p><button type="button" onClick={() => { setFailed(false); setAttempt(value => value + 1); }}>Повторить</button></div>
              : !summary ? <p role="status">Загрузка…</p>
              : summary.recentEvents.length === 0 ? <p>Новых событий пока нет</p>
              : summary.recentEvents.slice(0, 8).map(event => <Link key={`${event.type}-${event.occurredAt}-${event.href}`} href={event.href} className={styles.event} onClick={() => setOpen(false)}>
                <strong>{event.title}</strong><span>{event.description}</span><time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</time>
              </Link>)}
          </section>}
        </div>
        <Link href="/seller?tab=brand" className={styles.account} aria-label={brand ? `Магазин ${brand.name}` : "Магазин"}>
          {brand?.wordmarkUrl && !imageFailed
            ? <Image className={styles.brandWordmark} src={brand.wordmarkUrl} alt={brand.name} width={120} height={36} onError={() => setImageFailed(true)} />
            : <span className={styles.brandName}>{brand?.name || "Магазин"}</span>}
        </Link>
      </div>
    </div>
  );
}
