"use client";

import { useState } from "react";
import { FavoriteCard } from "../favorites/FavoriteCard";
import { LikeButton } from "../components/ui/LikeButton";
import styles from "./FavoriteGoldCandidates.module.css";

const product = {
  id: 0, title: "Футболка — пример", brand: "РЦМАРКЕТ", minPrice: 6900,
  images: ["/examples/demo-shirt-front.svg"],
};

const candidates = [
  { name: "Текущий чёрный", description: "Для сравнения", color: styles.black },
  { name: "Золото с чёрным контуром", description: "Цвет из палитры", color: styles.brand },
];

export function FavoriteGoldCandidates() {
  const [liked, setLiked] = useState(() => candidates.map(() => true));
  const toggle = (index: number, next: boolean) => setLiked(values => values.map((value, i) => i === index ? next : value));

  return <section aria-labelledby="favorite-gold-candidates">
    <h3 id="favorite-gold-candidates">Золотое сердце с чёрным контуром — варианты</h3>
    <p className="textHint">Чёрный контур и золотая заливка. Нажмите на сердце, чтобы сравнить состояния — примеры работают только здесь</p>
    <div className={styles.candidates}>
      {candidates.map((candidate, index) => <div className={`${styles.candidate} ${candidate.color}`} key={candidate.name}>
        <h4>{candidate.name}</h4>
        <p>{candidate.description}</p>
        <div className={styles.sample}>
          <span>Размер кнопки</span>
          <LikeButton liked={liked[index]} onClick={() => toggle(index, !liked[index])} aria-label={`${candidate.name}: ${liked[index] ? "убрать из избранного" : "добавить в избранное"}`} />
        </div>
        <ul className={styles.card}>
          <FavoriteCard product={product} onRemove={() => {}} demo={{
            liked: liked[index], onLikeChange: next => toggle(index, next), href: "#favorite-gold-candidates",
            variants: [{ id: 1, size: "M", color: "", price: 6900, availableQuantity: 1, sku: "" }], onAdd: () => {},
          }} />
        </ul>
      </div>)}
    </div>
    <p className="textHint">Цвета показаны на рабочей кнопке и карточке; избранное и корзина не меняются</p>
  </section>;
}
