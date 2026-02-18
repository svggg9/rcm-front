"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";
import { getCartId } from "../lib/auth";
import { emitCartChanged } from "../lib/cartEvents";
import { useClientAuth } from "../lib/useClientAuth";
import styles from "./Cart.module.css";

type CartItem = {
  productId: number;
  variantId: number;
  title: string;
  size: string;
  color: string;
  price: number;
  quantity: number;
  imageUrl: string;
};

export default function CartPage() {
  const router = useRouter();
  const isAuth = useClientAuth();

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const cartId = getCartId();

  useEffect(() => {
    if (!cartId) return;

    apiFetch(`http://localhost:9696/api/cart?cartId=${cartId}`)
      .then((r: Response) => r.json())
      .then((data: CartItem[]) => {
        setItems(data);
        setLoading(false);
      });
  }, [cartId]);

  function updateQty(variantId: number, qty: number) {
    apiFetch(
      `http://localhost:9696/api/cart/quantity?cartId=${cartId}&variantId=${variantId}&qty=${qty}`,
      { method: "PUT" }
    )
      .then((r: Response) => r.json())
      .then((data: CartItem[]) => {
        setItems(data);
        emitCartChanged();
      });
  }

  function removeItem(variantId: number) {
    apiFetch(
      `http://localhost:9696/api/cart/remove?cartId=${cartId}&variantId=${variantId}`,
      { method: "DELETE" }
    )
      .then((r: Response) => r.json())
      .then((data: CartItem[]) => {
        setItems(data);
        emitCartChanged();
      });
  }

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );

  function goCheckout() {
    if (items.length === 0) return;
    if (isAuth === null) return;

    if (!isAuth) {
      router.push("/auth/login?next=/checkout");
      return;
    }

    router.push("/checkout");
  }

  if (loading) return <div>Загрузка корзины…</div>;

  return (
    <div className={styles.page}>
      <h1>Корзина</h1>

      {items.length === 0 && <p>Корзина пуста</p>}

      {items.map((item) => (
        <div key={item.variantId} className={styles.row}>
          <img
            src={item.imageUrl}
            width={80}
            height={80}
            className={styles.image}
            alt=""
          />

          <div className={styles.meta}>
            <div>{item.title}</div>
            <div className={styles.sub}>
              {item.size} / {item.color}
            </div>
            <div>{item.price} ₽</div>
          </div>

          <div className={styles.qty}>
            <button
              disabled={item.quantity <= 1}
              onClick={() => updateQty(item.variantId, item.quantity - 1)}
            >
              −
            </button>

            <span className={styles.qtyValue}>{item.quantity}</span>

            <button onClick={() => updateQty(item.variantId, item.quantity + 1)}>
              +
            </button>
          </div>

          <button className={styles.remove} onClick={() => removeItem(item.variantId)}>
            ✕
          </button>
        </div>
      ))}

      <h2 className={styles.total}>Итого: {total.toLocaleString()} ₽</h2>

      <div className={styles.footer}>
        <button
          onClick={goCheckout}
          disabled={items.length === 0 || isAuth === null}
          className={styles.checkoutBtn}
        >
          Оформить заказ
        </button>
      </div>
    </div>
  );
}
