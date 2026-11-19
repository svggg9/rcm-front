"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "../components/ui/Button";
import styles from "./SaveFailureCandidates.module.css";

export function SaveFailureCandidates() {
  const [phase, setPhase] = useState<"idle" | "loading" | "error" | "retry">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function trySave() {
    if (timer.current) return;
    setPhase("loading");
    timer.current = setTimeout(() => {
      setPhase("error");
      timer.current = setTimeout(() => { setPhase("retry"); timer.current = null; }, 1800);
    }, 1000);
  }

  return <section className={styles.section} aria-labelledby="save-failure-candidates-title">
    <h3 id="save-failure-candidates-title">Ошибка сохранения</h3>
    <p className={styles.intro}>Выбранный вариант — пример не отправляет данные</p>
    <article className={styles.card}>
      <div className={styles.stage}>
        <Button type="button" variant="primary" className={styles.button} loading={phase === "loading"} failure={phase === "error"}
          aria-label={phase === "loading" ? "Сохранение примера" : phase === "error" ? "Ошибка сохранения — пример" : `${phase === "retry" ? "Повторить" : "Сохранить"} — пример ошибки`}
          onClick={trySave}>
          {phase === "retry" ? "Повторить" : "Сохранить"}
        </Button>
      </div>
      <h4>01 — Крестик</h4>
      <p>После загрузки появляется крестик с мягким движением</p>
      <span className={styles.status} role="status">{phase === "loading" ? "Сохраняем" : phase === "error" || phase === "retry" ? "Не удалось сохранить — попробуйте ещё раз" : "Нажмите «Сохранить»"}</span>
    </article>
  </section>;
}
