"use client";

import { useRef, useState, type MouseEvent } from "react";
import { LikeButton } from "../components/ui/LikeButton";
import { FavoritesNavigationIcon } from "../components/BuyerNavigation/FavoritesNavigationIcon";
import { useFavoriteFlight } from "../components/BuyerNavigation/useFavoriteFlight";
import styles from "./AnimationCandidates.module.css";

export function AnimationCandidates() {
  const [ids, setIds] = useState<number[]>([]);
  const targetRef = useRef<HTMLSpanElement>(null);
  const { displayCount, pulseKey, startFlight, cancelFlight, flightLayer } = useFavoriteFlight(ids, 0, targetRef);
  const liked = ids.length > 0;

  function toggle(event: MouseEvent<HTMLButtonElement>) {
    if (liked) {
      cancelFlight(1);
      setIds([]);
    } else {
      startFlight(1, event.currentTarget);
      setIds([1]);
    }
  }

  return <div>
    <p className={styles.intro}>Нажмите на сердце — пример работает на условных данных и не меняет избранное</p>
    <div className={styles.card}>
      <div className={styles.stage}>
        <div className={styles.header}>
          <span>Избранное</span>
          <span className={styles.destination} ref={targetRef}><FavoritesNavigationIcon count={displayCount} pulseKey={pulseKey} /></span>
        </div>
        <div className={styles.interaction}>
          <LikeButton liked={liked} onClick={toggle} aria-label={liked ? "Убрать из избранного — пример" : "Добавить в избранное — пример"} />
        </div>
      </div>
      <h3>В избранное</h3>
      <p>Упругое сердце, полёт и отклик счётчика</p>
      <span className={styles.state} aria-live="polite">{liked ? "Добавлено — нажмите ещё раз, чтобы повторить" : "Нажмите на сердце"}</span>
    </div>
    {flightLayer}
    <p className={styles.note}>При уменьшении движения в настройках устройства эффект отключается, а состояние остаётся понятным</p>
  </div>;
}
