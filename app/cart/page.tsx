"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { getCartId } from "../lib/auth";
import { emitCartChanged } from "../lib/cartEvents";

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
        emitCartChanged(); // 👈 ВАЖНО
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
        emitCartChanged(); // 👈 ВАЖНО
      });
  }


  const total = items.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );

  if (loading) return <div>Загрузка корзины…</div>;

  return (
    <div style={{ maxWidth: 900, margin: "40px auto" }}>
      <h1>Корзина</h1>

      {items.length === 0 && <p>Корзина пуста</p>}

      {items.map((item) => (
        <div
          key={item.variantId}
          style={{
            display: "flex",
            gap: 16,
            padding: "16px 0",
            borderBottom: "1px solid #eee",
          }}
        >
          <img
            src={item.imageUrl}
            width={80}
            height={80}
            style={{ objectFit: "cover" }}
          />

          <div style={{ flex: 1 }}>
            <div>{item.title}</div>
            <div>
              {item.size} / {item.color}
            </div>
            <div>{item.price} ₽</div>
          </div>

          <div>
            <button
              disabled={item.quantity <= 1}
              onClick={() => updateQty(item.variantId, item.quantity - 1)}
            >
              −
            </button>

            <span style={{ margin: "0 8px" }}>
              {item.quantity}
            </span>

            <button onClick={() => updateQty(item.variantId, item.quantity + 1)}>
              +
            </button>   
          </div>

          <button onClick={() => removeItem(item.variantId)}>
            ✕
          </button>
        </div>
      ))}

      <h2 style={{ marginTop: 24 }}>
        Итого: {total.toLocaleString()} ₽
      </h2>
    </div>
  );
}
