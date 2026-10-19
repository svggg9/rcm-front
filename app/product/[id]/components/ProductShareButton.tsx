"use client";

import { useRef, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Dialog } from "../../../components/ui/Dialog";
import { toast } from "../../../components/ui/toast";
import { productPath } from "../../../lib/productUrls";
import type { Product } from "../lib/types";
import styles from "../ProductPage.module.css";

export function ProductShareButton({ product }: { product: Product }) {
  const pending = useRef(false);
  const [manualUrl, setManualUrl] = useState<string | null>(null);

  async function share() {
    if (pending.current) return;
    pending.current = true;
    const url = new URL(productPath(product), window.location.origin).href;
    try {
      if (navigator.share) {
        try {
          await navigator.share({ title: product.title, url });
          return;
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") return;
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Ссылка скопирована");
      } catch {
        setManualUrl(url);
      }
    } finally {
      pending.current = false;
    }
  }

  return (
    <>
      <button type="button" className={styles.shareButton} aria-label="Поделиться товаром" onClick={share}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 15V2m-4 4 4-4 4 4M7 10H4v12h16V10h-3" />
        </svg>
      </button>
      {manualUrl ? (
        <Dialog title="Поделиться товаром" onClose={() => setManualUrl(null)} actions={<Button onClick={() => setManualUrl(null)}>Готово</Button>}>
          <label className={styles.shareLink}>
            Скопируйте ссылку
            <input readOnly value={manualUrl} onFocus={(event) => event.currentTarget.select()} />
          </label>
        </Dialog>
      ) : null}
    </>
  );
}
