"use client";

import { useState } from "react";
import { Button } from "../components/ui/Button";
import { CartIcon } from "../components/ui/CartIcon";
import styles from "./CartFillCandidates.module.css";

const options = [
  { id: "01", name: "Наполнение снизу", description: "Серый цвет поднимается и остаётся в нижней части пакета", kind: "bottom" },
  { id: "02", name: "Мягкая заливка", description: "Пакет целиком мягко становится серым", kind: "soft" },
  { id: "03", name: "Золотое наполнение", description: "Один товар заполняет пакет наполовину, второй — целиком", kind: "gold" },
  { id: "04", name: "Посылка внутри", description: "В пакете появляется маленькая посылка", kind: "parcel" },
] as const;

type Option = (typeof options)[number];

function Bag({ option, count, size }: { option: Option; count: number; size: number }) {
  return <span className={styles.visual} style={{ width: size, height: size }} aria-hidden="true">
    <span key={option.kind === "gold" ? "gold" : count} className={`${styles.bag} ${count ? styles.response : ""}`}>
      {count > 0 && option.kind !== "gold" && <span className={`${styles.inside} ${styles[option.kind]} ${count === 1 ? styles.first : ""}`}>
        <span className={styles.fill} />
      </span>}
      <CartIcon size={size} fillLevel={option.kind === "gold" ? count >= 2 ? "full" : count === 1 ? "half" : "empty" : undefined} />
    </span>
    {count > 0 && option.kind !== "gold" && <span className={styles.dot} />}
  </span>;
}

function Candidate({ option }: { option: Option }) {
  const [count, setCount] = useState(0);
  return <article className={styles.card}>
    <div className={styles.stage}>
      <div className={styles.sizes}>
        <div><Bag option={option} count={count} size={48} /><span>Крупно</span></div>
        <div><Bag option={option} count={count} size={24} /><span>В шапке</span></div>
      </div>
      <div className={styles.actions}>
        <Button type="button" variant="primary" size="compact" aria-label={`Добавить товар — вариант ${option.id}`} onClick={() => setCount(value => value + 1)}>Добавить</Button>
        <Button type="button" variant="ghost" size="compact" aria-label={`Очистить пример ${option.id}`} disabled={count === 0} onClick={() => setCount(0)}>Очистить</Button>
      </div>
    </div>
    <h4>{option.id} — {option.name}{option.kind === "gold" ? " · на сайте" : ""}</h4>
    <p>{option.description}</p>
    <span role="status" className={styles.status}>{option.kind === "gold" && count > 0 ? count === 1 ? "Первый товар — добавьте ещё один" : "Два товара или больше" : count ? "В корзине есть товар — нажмите ещё раз" : "Корзина пуста"}</span>
  </article>;
}

export function CartFillCandidates() {
  return <section className={styles.section} aria-labelledby="cart-fill-candidates-title">
    <h3 id="cart-fill-candidates-title">Наполнение корзины</h3>
    <p className={styles.intro}>Нажмите «Добавить», чтобы увидеть изменение иконки. Данные условные, настоящая корзина не меняется</p>
    <div className={styles.grid}>{options.map(option => <Candidate key={option.id} option={option} />)}</div>
  </section>;
}
