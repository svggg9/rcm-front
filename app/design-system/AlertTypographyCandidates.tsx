"use client";

import { Banner } from "../components/ui/Banner";
import { Button } from "../components/ui/Button";
import { toast } from "../components/ui/toast";
import styles from "./AlertTypographyCandidates.module.css";

const variants = [
  { title: "01 — Компактный · выбран", detail: "Заголовок 14/20/600, текст 14/20/400", style: undefined },
  { title: "02 — Акцентный", detail: "Заголовок 16/24/600, текст 14/20/400", style: styles.accent },
  { title: "03 — Крупный", detail: "Заголовок 16/24/600, текст 16/24/400", style: styles.readable },
];

export function AlertTypographyCandidates() {
  return <section className={styles.section} aria-labelledby="alert-typography-candidates">
    <h3 id="alert-typography-candidates">Типографика сообщений — варианты</h3>
    <p className="textHint">Один и тот же текст в живом Banner и всплывающем уведомлении. Между заголовком и текстом 2 px</p>
    <div className={styles.grid}>
      {variants.map(variant => <div className={styles.candidate} key={variant.title}>
        <h4>{variant.title}</h4>
        <p>{variant.detail}</p>
        <Banner tone="danger" title="Не удалось сохранить" className={variant.style}>
          Попробуйте ещё раз. Заполненные данные остались в форме.
        </Banner>
        <Banner tone="info" title="Перед заполнением" className={variant.style}>
          <ul><li>Сверьте документы</li><li>Укажите рабочие контакты</li></ul>
        </Banner>
        <Button onClick={() => toast.error("Не удалось сохранить", {
          id: "ds-alert-typography", description: "Попробуйте ещё раз. Заполненные данные остались в форме.", className: variant.style,
        })}>Показать уведомление</Button>
      </div>)}
    </div>
    <p className="textHint">Компактный вариант применяется в рабочих сообщениях. Данные условные</p>
  </section>;
}
