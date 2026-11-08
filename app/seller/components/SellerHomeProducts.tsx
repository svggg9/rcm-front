"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/Button";
import { DesignSystemIcon as Icon } from "../../components/ui/DesignSystemIcon";
import { Price } from "../../components/ui/Price";
import { SectionLoader } from "../../components/ui/SectionLoader";
import { EmptyState } from "../../components/ui/EmptyState";
import { RequestError } from "../../components/ui/RequestError";
import { getSellerActiveProductsClient } from "../lib/sellerClientDataApi";
import type { SellerProductListItem } from "../types";
import styles from "./SellerHomeProducts.module.css";

type State = { status: "loading" } | { status: "error"; retrying?: boolean; products?: SellerProductListItem[] } | { status: "ready"; products: SellerProductListItem[] };

export function SellerHomeProducts({ active = true }: { active?: boolean }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [scroll, setScroll] = useState({ previous: false, next: false });
  const rail = useRef<HTMLUListElement>(null);
  const products = "products" in state ? state.products : undefined;

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    void getSellerActiveProductsClient(controller.signal).then(products => {
      if (!controller.signal.aborted) setState({ status: "ready", products });
    }).catch(() => {
      if (!controller.signal.aborted) setState(previous => ({ status: "error", products: "products" in previous ? previous.products : undefined }));
    });
    return () => controller.abort();
  }, [attempt, active]);

  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const update = () => setScroll({
      previous: element.scrollLeft > 1,
      next: element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
    });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.addEventListener("scroll", update, { passive: true });
    return () => { observer.disconnect(); element.removeEventListener("scroll", update); };
  }, [products]);

  function move(direction: number) {
    const element = rail.current;
    if (!element) return;
    element.scrollBy({
      left: direction * Math.max(180, element.clientWidth * 0.8),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }

  return <section className={styles.section} aria-labelledby="seller-home-products-title">
    <header className={styles.heading}>
      <h2 id="seller-home-products-title">Активные товары</h2>
      <div className={styles.actions}>
        <Link href="/seller/products?status=ACTIVE" prefetch={false} className={styles.all}>Все активные</Link>
        {products && products.length > 0 && (scroll.previous || scroll.next) && <div className={styles.arrows}>
          <Button type="button" variant="ghost" reserveLabelSpace={false} className={styles.arrow} aria-label="Предыдущие товары" disabled={!scroll.previous} onClick={() => move(-1)}>
            <Icon name="chevron-left" role="utility" />
          </Button>
          <Button type="button" variant="ghost" reserveLabelSpace={false} className={styles.arrow} aria-label="Следующие товары" disabled={!scroll.next} onClick={() => move(1)}>
            <Icon name="chevron-right" role="utility" />
          </Button>
        </div>}
      </div>
    </header>
    {state.status === "error" && <RequestError variant="inline" message="Не удалось загрузить товары" loading={state.retrying}
      onRetry={() => { setState(previous => previous.status === "error" ? { ...previous, retrying: true } : previous); setAttempt(value => value + 1); }} />}
    {state.status === "loading" && <SectionLoader label="Загрузка активных товаров" compact />}
    {products?.length === 0 && <EmptyState title="Активных товаров пока нет" />}
    {products && products.length > 0 && <ul ref={rail} className={styles.rail} tabIndex={0} aria-label="Активные товары продавца">
      {products.map(product => <li key={product.id} className={styles.item}>
        <Link href={`/seller/products/${product.id}/edit`} prefetch={false} className={styles.card}
          aria-label={`Редактировать: ${product.title.trim() || "Без названия"}`}>
          <ProductCover product={product} />
          <h3>{product.title.trim() || "Без названия"}</h3>
          {product.minPrice !== null && <Price amount={product.minPrice} className={styles.price} />}
        </Link>
      </li>)}
    </ul>}
  </section>;
}

function ProductCover({ product }: { product: SellerProductListItem }) {
  const [failed, setFailed] = useState(false);
  return <div className={styles.cover}>
    {product.coverImage && !failed ? <Image src={product.coverImage} alt="" width={180} height={240}
      sizes="(max-width: 600px) 120px, 136px" onError={() => setFailed(true)} />
      : <span className={styles.noPhoto}><Icon name="package" role="empty" /><span>Без фото</span></span>}
  </div>;
}
