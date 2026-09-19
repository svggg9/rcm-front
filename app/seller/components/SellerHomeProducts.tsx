"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/Button";
import { DesignSystemIcon as Icon } from "../../components/ui/DesignSystemIcon";
import { Price } from "../../components/ui/Price";
import { ProductTileSkeleton } from "../../components/ui/CommerceSkeleton";
import { getSellerActiveProductsClient } from "../lib/sellerClientDataApi";
import type { SellerProductListItem } from "../types";
import styles from "./SellerHomeProducts.module.css";

type State = { status: "loading" } | { status: "error" } | { status: "ready"; products: SellerProductListItem[] };

export function SellerHomeProducts() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [scroll, setScroll] = useState({ previous: false, next: false });
  const rail = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    void getSellerActiveProductsClient(controller.signal).then(products => {
      if (!controller.signal.aborted) setState({ status: "ready", products });
    }).catch(() => {
      if (!controller.signal.aborted) setState({ status: "error" });
    });
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    const element = rail.current;
    if (!element || state.status !== "ready") return;
    const update = () => setScroll({
      previous: element.scrollLeft > 1,
      next: element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
    });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.addEventListener("scroll", update, { passive: true });
    return () => { observer.disconnect(); element.removeEventListener("scroll", update); };
  }, [state]);

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
      <h2 id="seller-home-products-title">Товары</h2>
      <div className={styles.actions}>
        <Link href="/seller?tab=products" prefetch={false} className={styles.all}>Все товары</Link>
        {state.status === "ready" && state.products.length > 0 && <div className={styles.arrows}>
          <button type="button" className={styles.arrow} aria-label="Предыдущие товары" disabled={!scroll.previous} onClick={() => move(-1)}>
            <Icon name="chevron-left" role="utility" />
          </button>
          <button type="button" className={styles.arrow} aria-label="Следующие товары" disabled={!scroll.next} onClick={() => move(1)}>
            <Icon name="chevron-right" role="utility" />
          </button>
        </div>}
      </div>
    </header>
    {state.status === "loading" ? <div role="status" aria-busy="true" aria-label="Загрузка активных товаров">
      <ul className={styles.rail} aria-hidden="true">{[0, 1, 2, 3].map(key => <ProductTileSkeleton key={key} />)}</ul>
    </div> : state.status === "error" ? <div role="alert" className={styles.error}>
      <Icon name="alert" />
      <p>Не удалось загрузить товары</p>
      <Button type="button" variant="secondary" onClick={() => { setState({ status: "loading" }); setAttempt(value => value + 1); }}>Повторить</Button>
    </div> : state.products.length === 0 ? <div className={styles.empty}>
      <Icon name="package" role="empty" /><p>Активных товаров пока нет</p>
    </div> : <ul ref={rail} className={styles.rail} aria-label="Активные товары продавца">
      {state.products.map(product => <li key={product.id} className={styles.item}>
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
      sizes="(max-width: 600px) 156px, 180px" onError={() => setFailed(true)} />
      : <span className={styles.noPhoto}><Icon name="package" role="empty" /><span>Без фото</span></span>}
  </div>;
}
