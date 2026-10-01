"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BrandPresentation } from "../../brand/[slug]/BrandPresentation";
import { BrandImageCarousel } from "../../brand/[slug]/BrandImageCarousel";
import { Icon } from "../../components/ui/Icon";
import { lockModalScroll } from "../../components/ui/modalScrollLock";
import { getSellerBrandImages } from "../lib/sellerBrandApi";
import type { SellerBrandImage } from "../types";
import styles from "./SellerBrandPreview.module.css";
import brandStyles from "../../brand/[slug]/BrandPage.module.css";

export function SellerBrandPreview({ brandId, name, description, wordmarkUrl, country, foundationYear, onClose }: {
  brandId: number; name: string; description: string; wordmarkUrl: string; country: string; foundationYear: string; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [mobile, setMobile] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ attempt: number; images?: SellerBrandImage[]; error?: string }>();
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement;
    dialog.showModal();
    const unlock = lockModalScroll();
    return () => { dialog.close(); unlock(); if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  useEffect(() => {
    let alive = true;
    getSellerBrandImages(brandId).then(
      images => { if (alive) setResult({ attempt, images: images.filter(image => image.active).sort((a,b) => a.sortOrder - b.sortOrder) }); },
      () => { if (alive) setResult({ attempt, error: "Не удалось загрузить фотографии" }); }
    );
    return () => { alive = false; };
  }, [brandId, attempt]);
  const loaded = result?.attempt === attempt;
  return createPortal(<dialog ref={ref} className={styles.dialog} aria-labelledby="brand-preview-title"
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className={styles.header}><h2 id="brand-preview-title">Предпросмотр витрины</h2>
      <button className={styles.control} type="button" onClick={onClose} aria-label="Закрыть предпросмотр"><Icon name="x" size={22} /></button></header>
    <p className={styles.note}>Название, логотип, описание и галерея. Данные формы показаны без сохранения; фотографии уже опубликованы.</p>
    <div className={styles.modes} role="group" aria-label="Ширина предпросмотра">
      <button className={styles.control} type="button" aria-pressed={!mobile} onClick={() => setMobile(false)}>Компьютер</button>
      <button className={styles.control} type="button" aria-pressed={mobile} onClick={() => setMobile(true)}>Телефон</button>
    </div>
    <div className={`${styles.canvas} ${mobile ? styles.mobile : ""}`}>
      <div className={styles.content}>
        <BrandPresentation name={name} description={description} wordmarkUrl={wordmarkUrl} compact />
        <p className={styles.note}>Здесь покупатель увидит категории, подборки и каталог товаров.</p>
        <details className={brandStyles.about}>
          <summary>О бренде {name}</summary>
          {description && <p className={brandStyles.aboutDescription}>{description}</p>}
          {(country || foundationYear) && <p className={brandStyles.brandFacts}>{country}{country && foundationYear ? ". " : ""}{foundationYear ? `Основан в ${foundationYear} году` : ""}</p>}
        {!loaded ? <p role="status">Загрузка фотографий…</p> : result.error ? <p role="alert">{result.error}. <button type="button" onClick={() => setAttempt(value => value + 1)}>Повторить</button></p>
          : <BrandImageCarousel images={result.images ?? []} contained />}
        </details>
      </div>
    </div>
    <p className={styles.note}>Товары и подборки смотрите на опубликованной витрине. Внешние ссылки пока не отображаются на публичной странице.</p>
    <footer className={styles.footer}><button className={styles.control} type="button" onClick={onClose}>Вернуться к редактированию</button></footer>
  </dialog>, document.body);
}
