"use client";

import { useRef, useState } from "react";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import styles from "./PanelAnimationCandidates.module.css";

const options = [
  { id: "slide", title: "01 — Выезд справа", description: "Панель плавно выезжает сбоку и возвращается обратно" },
  { id: "fade", title: "02 — Мягкое появление", description: "Панель проявляется на месте без движения по экрану" },
  { id: "rise", title: "03 — Подъём снизу", description: "Панель слегка поднимается и плавно исчезает" },
] as const;

function PanelExample({ option }: { option: (typeof options)[number] }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = `panel-animation-${option.id}`;

  return <article className={styles.card}>
    <div className={styles.stage}>
      <div className={styles.background}>
        <span className={styles.caption}>Страница</span>
        <Button ref={trigger} type="button" size="compact" variant="secondary" onClick={() => setOpen(true)} aria-expanded={open} aria-controls={panelId}>
          Открыть
        </Button>
      </div>
      <div className={styles.shade} data-open={open || undefined} aria-hidden="true" />
      <div id={panelId} className={`${styles.panel} ${styles[option.id]}`} data-open={open || undefined} aria-hidden={!open} inert={!open}>
        <div className={styles.panelHeader}>
          <strong>Панель</strong>
          <Button type="button" variant="ghost" size="compact" iconOnly aria-label={`Закрыть пример ${option.title}`} onClick={() => { setOpen(false); trigger.current?.focus(); }}>
            <Icon name="x" size={20} aria-hidden />
          </Button>
        </div>
        <span className={styles.panelText}>Содержимое панели</span>
        <div className={styles.lines} aria-hidden="true"><span /><span /><span /></div>
      </div>
    </div>
    <h4>{option.title}</h4>
    <p>{option.description}</p>
    <span className={styles.hint}>Откройте и закройте панель</span>
  </article>;
}

export function PanelAnimationCandidates() {
  return <section className={styles.group} aria-labelledby="panel-animation-heading">
    <h3 id="panel-animation-heading">Панели и диалоги</h3>
    <p className={styles.intro}>Миниатюрные примеры — нажмите «Открыть», затем крестик</p>
    <div className={styles.grid}>{options.map(option => <PanelExample key={option.id} option={option} />)}</div>
  </section>;
}
