"use client";

import { useEffect, useState } from "react";
import { BrandPresentation } from "../../brand/[slug]/BrandPresentation";
import { BrandImageCarousel } from "../../brand/[slug]/BrandImageCarousel";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { RequestError } from "../../components/ui/RequestError";
import { SectionLoader } from "../../components/ui/SectionLoader";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { getSellerBrandImages } from "../lib/sellerBrandApi";
import type { SellerBrandImage } from "../types";
import styles from "./SellerBrandPreview.module.css";
import brandStyles from "../../brand/[slug]/BrandPage.module.css";

const previewModes = [
  { value: "desktop", label: "Компьютер" },
  { value: "mobile", label: "Телефон" },
] as const;

type Props = {
  brandId: number;
  name: string;
  description: string;
  wordmarkUrl: string;
  country: string;
  foundationYear: string;
  dirty?: boolean;
  onClose: () => void;
};

type ImageResult = {
  brandId: number;
  attempt: number;
  images?: SellerBrandImage[];
  error?: string;
};

export function SellerBrandPreview({ brandId, name, description, wordmarkUrl, country, foundationYear, dirty = false, onClose }: Props) {
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<ImageResult>();

  useEffect(() => {
    let alive = true;
    getSellerBrandImages(brandId).then(
      images => {
        if (alive) setResult({ brandId, attempt, images: images.filter(image => image.active).sort((a, b) => a.sortOrder - b.sortOrder) });
      },
      () => {
        if (alive) setResult({ brandId, attempt, error: "Не удалось загрузить фотографии" });
      }
    );
    return () => { alive = false; };
  }, [brandId, attempt]);

  const current = result?.brandId === brandId ? result : undefined;
  const loading = current?.attempt !== attempt;
  const facts = [country, foundationYear ? `Основан в ${foundationYear} году` : ""].filter(Boolean);

  return <Dialog title="Предпросмотр витрины" size="wide" mobileFullscreen className={styles.dialog} onClose={onClose}
    actions={<Button variant="secondary" onClick={onClose}>Вернуться к редактированию</Button>}>
    <div className={styles.toolbar}>
      <SegmentedControl items={previewModes} value={mode} onChange={setMode} ariaLabel="Устройство предпросмотра" />
      {dirty ? <p className={styles.note}>Предпросмотр без сохранения</p> : null}
    </div>
    <div className={styles.workspace}>
      <div className={`${styles.canvas} ${mode === "mobile" ? styles.mobile : ""}`}>
        <div className={styles.content}>
          <BrandPresentation name={name} description={description} wordmarkUrl={wordmarkUrl} compact />
          <details className={`${brandStyles.about} ${styles.about}`} open>
            <summary>О бренде {name}</summary>
            {description ? <p className={`${brandStyles.aboutDescription} ${styles.description}`}>{description}</p> : null}
            {facts.length ? <p className={`${brandStyles.brandFacts} ${styles.facts}`}>{facts.join(" | ")}</p> : null}
            {current?.error ? <RequestError variant="inline" message={current.error} loading={loading}
              onRetry={() => setAttempt(value => value + 1)} />
              : loading ? <SectionLoader compact label="Загрузка фотографий бренда" />
                : <BrandImageCarousel images={current?.images ?? []} contained />}
          </details>
          <p className={styles.catalogNote}>Товары и подборки доступны на опубликованной витрине</p>
        </div>
      </div>
    </div>
  </Dialog>;
}
