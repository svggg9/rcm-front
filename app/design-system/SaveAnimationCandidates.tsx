"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "../components/ui/Button";
import { Checkbox } from "../components/ui/Checkbox";
import { useTransientFailure } from "../components/ui/useTransientFailure";
import styles from "./SaveAnimationCandidates.module.css";

export function SaveAnimationCandidates() {
  const [phase, setPhase] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [fail, setFail] = useState(false);
  const { failure, show: showFailure, clear: clearFailure } = useTransientFailure();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function save() {
    if (timer.current) return;
    clearFailure();
    setPhase("loading");
    timer.current = setTimeout(() => {
      if (fail) { setPhase("error"); showFailure(); timer.current = null; return; }
      setPhase("success");
      timer.current = setTimeout(() => { setPhase("idle"); timer.current = null; }, 1500);
    }, 1200);
  }

  return <section className={styles.section} aria-labelledby="save-animation-title">
    <h3 id="save-animation-title">Сохранение</h3>
    <p className={styles.intro}>Загрузка и упругая галочка — пример на условных данных</p>
    <article className={styles.card}>
      <div className={styles.stage}>
        <Button type="button" variant="primary" loading={phase === "loading"} success={phase === "success"} successMotion="bounce" failure={failure}
          aria-label={phase === "loading" ? "Сохранение примера" : phase === "success" ? "Пример успешно сохранён" : failure ? "Ошибка сохранения — пример" : "Сохранить — пример анимации"} onClick={save}>
          Сохранить
        </Button>
      </div>
      <h4>Упругая галочка</h4>
      <p>При успехе появляется галочка, при ошибке можно повторить</p>
      <label className={styles.option}><Checkbox size={18} checked={fail} disabled={phase === "loading" || phase === "success" || failure} onChange={event => setFail(event.target.checked)} /> Сымитировать ошибку</label>
      <span className={styles.status} role="status">{phase === "error" ? "Не удалось сохранить — попробуйте ещё раз" : phase === "success" ? "Пример сохранён" : phase === "loading" ? "Сохраняем" : "Нажмите «Сохранить»"}</span>
    </article>
  </section>;
}
