"use client";

import { useId, useState } from "react";
import { Checkbox } from "../components/ui/Checkbox";
import { Radio } from "../components/ui/Radio";
import styles from "./DesignSystem.module.css";

/** Дополнительные состояния нативных элементов выбора. */
export function ChoiceExamples() {
  const [accepted, setAccepted] = useState(false);
  const [delivery, setDelivery] = useState("");
  const checkboxErrorId = useId();
  const radioErrorId = useId();
  const radioName = useId();

  return <div className={styles.ruleGrid}>
    <article>
      <h3>Флажок: ошибка и недоступное состояние</h3>
      <label className={styles.checkbox}>
        <Checkbox checked={accepted} onChange={event => setAccepted(event.target.checked)}
          aria-invalid={!accepted || undefined} aria-describedby={!accepted ? checkboxErrorId : undefined} />
        Подтвердить условия
      </label>
      {!accepted && <p id={checkboxErrorId} className="fieldError">Подтвердите условия</p>}
      <label className={styles.checkbox}><Checkbox disabled />Недоступный флажок</label>
      <label className={styles.checkbox}><Checkbox disabled checked />Недоступный выбранный флажок</label>
    </article>
    <article>
      <h3>Переключатель: ошибка и недоступное состояние</h3>
      <div className={styles.demo} role="group" aria-label="Способ получения в примере">
        {[["pickup", "Пункт выдачи"], ["store", "Магазин"]].map(([value, label]) =>
          <label key={value} className={styles.checkbox}>
            <Radio name={radioName} value={value} checked={delivery === value}
              onChange={() => setDelivery(value)} aria-invalid={!delivery || undefined}
              aria-describedby={!delivery ? radioErrorId : undefined} />{label}
          </label>)}
        <label className={styles.checkbox}><Radio name={radioName} disabled />Курьер</label>
      </div>
      {!delivery && <p id={radioErrorId} className="fieldError">Выберите способ получения</p>}
    </article>
  </div>;
}
