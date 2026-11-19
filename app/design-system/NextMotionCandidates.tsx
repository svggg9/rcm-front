"use client";

import { useState } from "react";
import { Button } from "../components/ui/Button";
import { AnimatedValue } from "../components/ui/AnimatedValue";
import { Icon } from "../components/ui/Icon";
import stepMotion from "../components/ui/StepMotion.module.css";
import styles from "./NextMotionCandidates.module.css";

const quantityOptions = [
  { id: "quantityPulse", title: "01 — Упругое число", description: "Число слегка увеличивается и возвращается обратно" },
  { id: "quantitySlide", title: "02 — Смена числа", description: "Новое значение мягко появляется снизу" },
  { id: "quantityGlow", title: "03 — Золотой отклик", description: "Число ненадолго подсвечивается золотым" },
] as const;

const checkoutOptions = [
  { id: "stepFade", title: "01 — Мягкое появление", description: "Содержимое нового шага плавно проявляется" },
  { id: "stepSlide", title: "02 — Шаг вперёд", description: "Новый шаг слегка появляется сбоку" },
  { id: "stepRise", title: "03 — Лёгкий подъём", description: "Содержимое поднимается и проявляется" },
] as const;

function QuantityExample({ option }: { option: (typeof quantityOptions)[number] }) {
  const [quantity, setQuantity] = useState(1);
  const [revision, setRevision] = useState(0);
  const change = (amount: number) => {
    setQuantity(current => current + amount);
    setRevision(current => current + 1);
  };

  return <article className={styles.card}>
    <div className={styles.quantityStage}>
      <span className={styles.productName}>Рубашка · количество</span>
      <div className={styles.quantityControl}>
        <Button variant="ghost" size="compact" iconOnly type="button" disabled={quantity === 1}
          aria-label={`Уменьшить количество — ${option.title}`} onClick={() => change(-1)}><Icon name="minus" size={18} aria-hidden /></Button>
        <span className={styles.quantityValue} aria-live="polite" aria-atomic="true">{option.id === "quantityPulse" ? <AnimatedValue revision={revision}>{quantity}</AnimatedValue> : <span key={revision} className={revision ? styles[option.id] : undefined}>{quantity}</span>}</span>
        <Button variant="ghost" size="compact" iconOnly type="button" disabled={quantity === 9}
          aria-label={`Увеличить количество — ${option.title}`} onClick={() => change(1)}><Icon name="plus" size={18} aria-hidden /></Button>
      </div>
    </div>
    <h4>{option.title}</h4><p>{option.description}</p>
    <span className={styles.hint}>Нажмите плюс или минус</span>
  </article>;
}

function CheckoutExample({ option }: { option: (typeof checkoutOptions)[number] }) {
  const [step, setStep] = useState(0);
  const [hasTransition, setHasTransition] = useState(false);
  return <article className={styles.card}>
    <div className={styles.stepStage}>
      <div className={styles.stepLabel}>Шаг {step + 1} из 2</div>
      <div key={step} className={`${styles.stepContent} ${option.id === "stepSlide" ? hasTransition ? stepMotion[step === 1 ? "forward" : "back"] : "" : styles[option.id]}`}>
        <strong>{step === 0 ? "Доставка" : "Оплата"}</strong>
        <span>{step === 0 ? "Пункт выдачи СДЭК" : "Онлайн при оформлении"}</span>
      </div>
      <Button type="button" size="compact" variant="secondary" onClick={() => { setHasTransition(true); setStep(current => 1 - current); }} aria-label={`${step === 0 ? "Далее" : "Назад"} — ${option.title}`}>
        {step === 0 ? "Далее" : "Назад"}
      </Button>
    </div>
    <h4>{option.title}</h4><p>{option.description}</p>
    <span className={styles.hint}>Переключайте шаги</span>
  </article>;
}

export function NextMotionCandidates() {
  return <>
    <section className={styles.section} aria-labelledby="quantity-motion-title">
      <h3 id="quantity-motion-title">Изменение количества</h3>
      <p className={styles.intro}>Нажмите плюс или минус, чтобы сравнить отклик — данные условные</p>
      <div className={styles.grid}>{quantityOptions.map(option => <QuantityExample key={option.id} option={option} />)}</div>
    </section>
    <section className={styles.section} aria-labelledby="checkout-motion-title">
      <h3 id="checkout-motion-title">Переход между шагами оформления</h3>
      <p className={styles.intro}>Нажмите «Далее» и «Назад», чтобы сравнить переход — заказ не создаётся</p>
      <div className={styles.grid}>{checkoutOptions.map(option => <CheckoutExample key={option.id} option={option} />)}</div>
    </section>
  </>;
}
