"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import { PhotoPlaceholder } from "../components/ui/PhotoPlaceholder";
import { Price } from "../components/ui/Price";
import styles from "./CartRemovalCandidates.module.css";

const options = [
  { id: "fade", title: "01 — Плавное исчезновение", description: "Товар растворяется, затем остальные строки занимают его место" },
  { id: "collapse", title: "02 — Сжатие строки", description: "Строка плавно схлопывается по высоте" },
  { id: "slide", title: "03 — Уход в сторону", description: "Товар немного уходит вправо и исчезает" },
] as const;

function Product({ name, amount, remove, removeRef, optionTitle }: { name: string; amount: number; remove?: () => void; removeRef?: RefObject<HTMLButtonElement | null>; optionTitle?: string }) {
  return <div className={styles.product}>
    <div className={styles.photo}><PhotoPlaceholder decorative /></div>
    <div className={styles.details}><span className={styles.brand}>Пример бренда</span><span>{name}</span><Price amount={amount} /></div>
    {remove ? <Button ref={removeRef} variant="ghost" size="compact" iconOnly aria-label={`Удалить ${name} — ${optionTitle}`} onClick={remove}>
      <Icon name="x" size={20} aria-hidden />
    </Button> : null}
  </div>;
}

function RemovalExample({ option }: { option: (typeof options)[number] }) {
  const [state, setState] = useState<"ready" | "removing" | "removed">("ready");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetRef = useRef<HTMLButtonElement>(null);
  const removeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function remove() {
    if (state !== "ready") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const returnFocus = document.activeElement === removeRef.current;
      setState("removed");
      if (returnFocus) requestAnimationFrame(() => resetRef.current?.focus());
      return;
    }
    setState("removing");
    timer.current = setTimeout(() => {
      const returnFocus = document.activeElement === removeRef.current;
      setState("removed");
      timer.current = null;
      if (returnFocus) requestAnimationFrame(() => resetRef.current?.focus());
    }, 650);
  }

  function reset() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setState("ready");
  }

  return <article className={styles.card}>
    <div className={styles.stage}>
      <div className={styles.list}>
        {state !== "removed" && <div className={`${styles.animatedRow} ${styles[option.id]}`} data-removing={state === "removing" || undefined}>
          <div className={styles.rowInner}><Product name="Шёлковая рубашка" amount={12900} remove={remove} removeRef={removeRef} optionTitle={option.title} /></div>
        </div>}
        <Product name="Брюки прямого кроя" amount={16900} />
      </div>
    </div>
    <h4>{option.title}</h4>
    <p>{option.description}</p>
    <div className={styles.controls}>
      <Button ref={resetRef} type="button" size="compact" variant="secondary" aria-label={`Повторить — ${option.title}`} onClick={reset}>Повторить</Button>
      <span className={styles.status} role="status">{state === "removed" ? "Товар удалён в примере" : state === "removing" ? "Удаление" : "Нажмите на крестик у товара"}</span>
    </div>
  </article>;
}

export function CartRemovalCandidates() {
  return <section className={styles.section} aria-labelledby="cart-removal-candidates-title">
    <h3 id="cart-removal-candidates-title">Удаление товара из корзины</h3>
    <p className={styles.intro}>Нажмите крестик у товара и сравните варианты — примеры работают на условных данных</p>
    <div className={styles.grid}>{options.map(option => <RemovalExample key={option.id} option={option} />)}</div>
  </section>;
}
