"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { CdekLogo } from "../../components/Delivery/CdekLogo";
import { Loader } from "../../components/ui/Loader";
import { formatRussianPhoneInput } from "../../lib/phone";
import styles from "./CheckoutFlow.module.css";

type Props = {
  delivery: ReactNode; contact: ReactNode; pickupLabel: string; cityName: string; recipient: string; phone: string;
  subtotal: number; deliveryPrice: number; deliveryCalculated: boolean; deliveryCalculating: boolean;
  submitting: boolean; error: string | null;
  committedOrderId?: number | null;
  checkoutUnknown?: boolean;
  disabled?: boolean;
  onContinue: () => Promise<boolean>; onSubmit: () => void;
};
const names = ["Доставка", "Оплата", "Итого"];
const money = (amount: number) => amount.toLocaleString("ru-RU") + " ₽";

export function CheckoutFlow(props: Props) {
  const [step, setStep] = useState(props.committedOrderId ? 2 : 0);
  const [reached, setReached] = useState(props.committedOrderId ? 2 : 0);
  const [advancing, setAdvancing] = useState(false);
  const lock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (props.committedOrderId) { setStep(2); setReached(2); } }, [props.committedOrderId]);
  useEffect(() => { const frame = requestAnimationFrame(() => heading.current?.focus()); return () => cancelAnimationFrame(frame); }, []);
  const blocked = advancing || props.submitting || props.deliveryCalculating || props.disabled;
  function show(index: number) {
    setStep(index); setReached(current => Math.max(current, index));
    requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
  }
  async function go(index: number) {
    if (lock.current || blocked) return;
    if (index === 0) { show(index); return; }
    lock.current = true; setAdvancing(true);
    try { if (await props.onContinue()) show(index); }
    finally { lock.current = false; setAdvancing(false); }
  }
  return <section className={styles.flow} aria-label="Оформление заказа" aria-busy={blocked || undefined}>
    <h2 className={styles.title} ref={heading} tabIndex={-1}>Оформление заказа</h2>
    {props.checkoutUnknown ? <>
      <p>Результат создания заказа пока не подтверждён</p>
      {props.error && <p className={styles.error} role="alert">{props.error}</p>}
      <Button type="button" variant="primary" className={styles.primary} loading={props.submitting} onClick={props.onSubmit}>Проверить заказ</Button>
      <Link href="/account?tab=orders" className={styles.orderLink}>Мои заказы</Link>
      <Link href="/cart" className={styles.orderLink}>Вернуться в корзину</Link>
    </> : <>
      <nav className={styles.steps} aria-label="Шаги оформления">
        {names.map((name, index) => <button type="button" key={name} disabled={blocked || Boolean(props.committedOrderId) || index > reached}
          aria-current={step === index ? "step" : undefined} data-complete={index <= step || undefined}
          onClick={() => void go(index)}>{index + 1}. {name}</button>)}
      </nav>
      <div className={styles.content}>
        {step === 0 ? <>{props.delivery}{props.contact}</> : step === 1 ? <div className={styles.payment}>
          <span className={styles.checked} aria-hidden="true" /><div><h3>Оплата онлайн</h3><p>На странице Т-Банка</p></div>
        </div> : <>
          <div className={styles.review}>
            <div className={styles.reviewTitle}><h3>Пункт выдачи</h3><button type="button" className={styles.edit} disabled={blocked || Boolean(props.committedOrderId)} aria-label="Изменить доставку и получателя" onClick={() => show(0)}><Icon name="pencil" size={20} strokeWidth={1} /></button></div>
            <p>{props.pickupLabel}</p><CdekLogo /><p className={styles.muted}>{props.cityName}</p>
            <p>{props.recipient}</p><p className={styles.muted}>+7 {formatRussianPhoneInput(props.phone)}</p>
          </div>
          <p className={styles.deliveryNotice}>Примерка и частичный выкуп в пункте выдачи не предусмотрены</p>
          <div className={styles.review}>
            <div className={styles.reviewTitle}><h3>Оплата онлайн</h3><button type="button" className={styles.edit} disabled={blocked || Boolean(props.committedOrderId)} aria-label="Изменить оплату" onClick={() => show(1)}><Icon name="pencil" size={20} strokeWidth={1} /></button></div>
            <p className={styles.muted}>На странице Т-Банка</p>
          </div>
          <dl className={styles.totals}><div><dt>Общая стоимость товаров</dt><dd>{money(props.subtotal)}</dd></div>
            <div><dt>Доставка</dt><dd>{props.deliveryCalculating ? <Loader inline label="Расчёт доставки" /> : props.deliveryCalculated ? props.deliveryPrice === 0 ? "Бесплатно" : money(props.deliveryPrice) : "Не рассчитана"}</dd></div>
            <div className={styles.total}><dt>К оплате</dt><dd>{props.deliveryCalculated && !props.deliveryCalculating ? money(props.subtotal + props.deliveryPrice) : "—"}</dd></div></dl>
        </>}
      </div>
      {props.error && <p className={styles.error} role="alert">{props.error}</p>}
      <Button type="button" variant="primary" className={styles.primary} loading={props.submitting || advancing}
        disabled={props.disabled || props.deliveryCalculating || (step === 0 && !props.pickupLabel)} onClick={() => step < 2 ? void go(step + 1) : props.onSubmit()}>
        {step === 2 ? props.committedOrderId ? "Оплатить" : "Заказать" : "Продолжить"}
      </Button>
      {step === 2 && <p className={styles.legal}>Нажимая «{props.committedOrderId ? "Оплатить" : "Заказать"}», вы принимаете <Link href="/legal/offer" target="_blank">публичную оферту</Link>, <Link href="/legal/privacy" target="_blank">политику конфиденциальности</Link> и условия доставки и возврата</p>}
      {props.committedOrderId && <Link href={`/account?tab=orders&orderId=${props.committedOrderId}`} className={styles.orderLink}>Открыть заказ</Link>}
    </>}
  </section>;
}
