"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "../../components/ui/Button";
import { CdekLogo } from "../../components/Delivery/CdekLogo";
import { Loader } from "../../components/ui/Loader";
import { Banner } from "../../components/ui/Banner";
import { formatRussianPhoneInput } from "../../lib/phone";
import { registerBuyerPanelActions } from "../../lib/buyerPanelActions";
import styles from "./CheckoutFlow.module.css";

type Props = {
  delivery: ReactNode; contact: ReactNode; pickupLabel: string; cityName: string; recipient: string; phone: string;
  subtotal: number; deliveryPrice: number; deliveryCalculated: boolean; deliveryCalculating: boolean;
  submitting: boolean; error: string | null;
  committedOrderId?: number | null;
  checkoutUnknown?: boolean;
  disabled?: boolean;
  autoFocusHeading?: boolean;
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
  useEffect(() => { if (props.autoFocusHeading === false) return; const frame = requestAnimationFrame(() => heading.current?.focus()); return () => cancelAnimationFrame(frame); }, [props.autoFocusHeading]);
  const blocked = advancing || props.submitting || props.deliveryCalculating || props.disabled;
  const show = useCallback((index: number) => {
    setStep(index); setReached(current => Math.max(current, index));
    if (props.autoFocusHeading !== false) requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
  }, [props.autoFocusHeading]);
  useEffect(() => registerBuyerPanelActions(action => {
    if (advancing || props.submitting) return true;
    if (action === "back" && step > 0 && !props.committedOrderId && !props.checkoutUnknown) {
      show(step - 1);
      return true;
    }
    return false;
  }, 20), [advancing, props.submitting, props.committedOrderId, props.checkoutUnknown, step, show]);
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
      <Link href="/cart" className={styles.orderLink}>В корзину</Link>
    </> : <>
      <nav className={styles.steps} aria-label="Шаги оформления">
        {names.map((name, index) => <button type="button" key={name} disabled={blocked || Boolean(props.committedOrderId) || index > reached}
          aria-current={step === index ? "step" : undefined} data-complete={index <= step || undefined}
          onClick={() => void go(index)}><span className={styles.stepNumber}>0{index + 1}</span> {name}</button>)}
      </nav>
      <div className={styles.content}>
        {step === 0 ? <>{props.delivery}{props.contact}</> : step === 1 ? <>
          <div className={styles.payment}><h3>Оплата онлайн</h3><p>На защищённой странице Т-Банка</p><p className={styles.muted}>Доступные способы оплаты можно выбрать на странице банка</p></div>
          <div className={styles.review}><h3>Ваш заказ</h3><dl className={styles.totals}><div><dt>Товары</dt><dd>{money(props.subtotal)}</dd></div><div><dt>Доставка</dt><dd>{props.deliveryCalculating ? <Loader inline label="Расчёт доставки" /> : props.deliveryCalculated ? props.deliveryPrice === 0 ? "Бесплатно" : money(props.deliveryPrice) : "Не рассчитана"}</dd></div><div className={styles.total}><dt>К оплате</dt><dd>{props.deliveryCalculated && !props.deliveryCalculating ? money(props.subtotal + props.deliveryPrice) : "—"}</dd></div></dl></div>
        </> : <>
          <div className={styles.review}>
            <div className={styles.reviewTitle}><h3>Пункт выдачи</h3><Button type="button" variant="utility" disabled={blocked || Boolean(props.committedOrderId)} aria-label="Изменить доставку" onClick={() => show(0)}>Изменить</Button></div>
            <CdekLogo height={18} /><p>{props.pickupLabel}</p><p className={styles.muted}>{props.cityName}</p>
            <Banner tone="warning">Примерка и частичный выкуп в пункте выдачи не предусмотрены</Banner>
          </div>
          <div className={styles.review}>
            <div className={styles.reviewTitle}><h3>Получатель</h3><Button type="button" variant="utility" disabled={blocked || Boolean(props.committedOrderId)} aria-label="Изменить данные получателя" onClick={() => show(0)}>Изменить</Button></div>
            <p>{props.recipient}</p><p className={styles.muted}>+7 {formatRussianPhoneInput(props.phone)}</p>
          </div>
          <div className={styles.review}>
            <div className={styles.reviewTitle}><h3>Оплата онлайн</h3><Button type="button" variant="utility" disabled={blocked || Boolean(props.committedOrderId)} aria-label="Изменить оплату" onClick={() => show(1)}>Изменить</Button></div>
            <p className={styles.muted}>На странице Т-Банка</p>
          </div>
          <div className={styles.review}><h3>Ваш заказ</h3><dl className={styles.totals}><div><dt>Товары</dt><dd>{money(props.subtotal)}</dd></div>
            <div><dt>Доставка</dt><dd>{props.deliveryCalculating ? <Loader inline label="Расчёт доставки" /> : props.deliveryCalculated ? props.deliveryPrice === 0 ? "Бесплатно" : money(props.deliveryPrice) : "Не рассчитана"}</dd></div>
            <div className={styles.total}><dt>К оплате</dt><dd>{props.deliveryCalculated && !props.deliveryCalculating ? money(props.subtotal + props.deliveryPrice) : "—"}</dd></div></dl></div>
        </>}
      </div>
      {props.error && <p className={styles.error} role="alert">{props.error}</p>}
      <div className={styles.footer}>
      {step < 2 && <div className={styles.footerTotal}><span>К оплате</span><strong>{props.deliveryCalculating ? <Loader inline label="Расчёт доставки" /> : props.deliveryCalculated ? money(props.subtotal + props.deliveryPrice) : "—"}</strong></div>}
      <Button type="button" variant="primary" className={styles.primary} loading={props.submitting || advancing}
        disabled={props.disabled || props.deliveryCalculating || (step === 0 && !props.pickupLabel)} onClick={() => step < 2 ? void go(step + 1) : props.onSubmit()}>
        {step === 2 ? props.committedOrderId ? "Оплатить" : "Заказать" : "Продолжить"}
      </Button>
      </div>
      {step === 2 && <p className={styles.legal}>Нажимая «{props.committedOrderId ? "Оплатить" : "Заказать"}», вы принимаете <Link href="/legal/offer" target="_blank">публичную оферту</Link>, <Link href="/legal/privacy" target="_blank">политику конфиденциальности</Link> и условия доставки и возврата</p>}
      {props.committedOrderId && <Link href={`/account?tab=orders&orderId=${props.committedOrderId}`} className={styles.orderLink}>Открыть заказ</Link>}
    </>}
  </section>;
}
