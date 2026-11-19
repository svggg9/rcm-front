"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "../components/ui/Button";
import productStyles from "../product/[id]/ProductPage.module.css";
import styles from "./CartAnimationCandidates.module.css";

export function CartAnimationCandidates() {
  const [added, setAdded] = useState(false);
  const [played, setPlayed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function add() {
    setAdded(true);
    setPlayed(true);
    timer.current = setTimeout(() => { setAdded(false); timer.current = null; }, 1600);
  }

  return <section aria-labelledby="cart-animation-candidates-title" className={styles.section}>
    <h3 id="cart-animation-candidates-title">Добавление в корзину</h3>
    <p className={styles.intro}>Выбранный вариант — пример работает на условных данных</p>
    <article className={styles.card}>
      <div className={styles.stage}>
        <Button type="button" variant="primary" className={`${productStyles.addBtn} ${styles.button}`}
          onClick={add} success={added} successMotion="bounce" aria-label={`${added ? "Добавлено" : "В корзину"} — пример`}>
          В корзину
        </Button>
      </div>
      <h4>02 — Упругая галочка</h4>
      <p>Галочка появляется с лёгким упругим откликом</p>
      <span className={styles.state} role="status">{added ? "Добавлено в примере" : played ? "Нажмите ещё раз, чтобы повторить" : "Нажмите «В корзину»"}</span>
    </article>
  </section>;
}
