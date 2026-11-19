"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "../components/ui/Button";
import { PopoverPanel } from "../components/ui/PopoverPanel";
import styles from "./FloatingConfirmationCandidates.module.css";

type Motion = "settle" | "drop" | "lift";
const options: { motion: Motion; title: string; description: string }[] = [
  { motion: "settle", title: "Мягкое появление", description: "Карточка появляется из области действия" },
  { motion: "drop", title: "Плавный выезд", description: "Карточка мягко опускается сверху" },
  { motion: "lift", title: "Лёгкий подъём", description: "Карточка плавно поднимается снизу" },
];

function Example({ motion, title, description }: { motion: Motion; title: string; description: string }) {
  const id = useId();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [cleared, setCleared] = useState(false);

  useEffect(() => () => { if (timer.current !== null) clearTimeout(timer.current); }, []);

  function close(confirm = false) {
    if (timer.current !== null) return;
    const finish = () => {
      timer.current = null;
      setOpen(false);
      setClosing(false);
      if (confirm) setCleared(true);
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { finish(); return; }
    setClosing(true);
    timer.current = setTimeout(finish, 180);
  }

  function cancel() { close(); anchorRef.current?.focus({ preventScroll: true }); }
  function confirm() { close(true); anchorRef.current?.focus({ preventScroll: true }); }

  return <article className={styles.example}>
    <h4>{title}</h4><p className="textHint">{description}</p>
    <div className={styles.cart}>
      <div className={styles.cartHeader}><span>Корзина</span>
        <Button ref={anchorRef} type="button" variant="utility" size="compact" aria-haspopup="dialog" aria-expanded={open}
          aria-controls={id} onClick={() => { if (cleared) { setCleared(false); return; } if (open) close(); else setOpen(true); }}>
          {cleared ? "Восстановить пример" : "Очистить"}
        </Button>
      </div>
      <p role="status">{cleared ? "Корзина очищена в примере" : "2 товара в корзине"}</p>
      <PopoverPanel id={id} title="Очистить корзину?" open={open} onClose={() => close()} anchorRef={anchorRef}
        initialFocusRef={cancelRef} motion={motion} closing={closing}>
        <p className={styles.message}>Из корзины будут удалены 2 товара</p>
        <div className={`${styles.actions} ${motion === "drop" ? styles.stacked : ""}`}>
          <Button ref={cancelRef} type="button" variant="secondary" onClick={cancel}>Отмена</Button>
          <Button type="button" variant="primary" onClick={confirm}>Очистить</Button>
        </div>
      </PopoverPanel>
    </div>
  </article>;
}

/** Local-only examples of the shared anchored component. */
export function FloatingConfirmationCandidates() {
  return <section className={styles.section} aria-labelledby="floating-confirmation-candidates-title">
    <h3 id="floating-confirmation-candidates-title">Плавающее подтверждение</h3>
    <p className="textHint">Нажмите «Очистить» в каждом примере — настоящая корзина не меняется</p>
    <div className={styles.examples}>{options.map(option => <Example key={option.motion} {...option} />)}</div>
  </section>;
}
