"use client";

import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Dialog } from "../../../components/ui/Dialog";
import { TextInput } from "../../../components/ui/TextInput";
import { toast } from "../../../components/ui/toast";
import { productArticle } from "../../../lib/productArticle";
import styles from "../ProductPage.module.css";

export function ProductArticleButton({ article: value }: { article?: string | null }) {
  const article = productArticle(value);
  const [manualCopy, setManualCopy] = useState(false);
  if (!article) return null;

  async function copy() {
    if (!article) return;
    try {
      await navigator.clipboard.writeText(article);
      toast.success("Артикул скопирован");
    } catch { setManualCopy(true); }
  }

  return <>
    <button type="button" className={styles.articleCopy} onClick={() => void copy()}
      aria-label={`Скопировать артикул ${article}`} title="Скопировать артикул">
      Артикул: {article}
    </button>
    {manualCopy ? <Dialog title="Артикул товара" onClose={() => setManualCopy(false)}
      actions={<Button onClick={() => setManualCopy(false)}>Готово</Button>}>
      <TextInput label="Скопируйте артикул" value={article} readOnly
        onFocus={event => event.currentTarget.select()} />
    </Dialog> : null}
  </>;
}
