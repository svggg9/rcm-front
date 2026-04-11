"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { API_URL } from "../lib/api";
import { getCartId } from "../lib/auth";
import { emitCartChanged } from "../lib/cartEvents";
import { useClientAuth } from "../lib/useClientAuth";
import { mapProductToCarouselProduct } from "../lib/productMappers";

import { ProductCarousel } from "../components/ProductCarousel/ProductCarousel";

import { CartItem } from "./lib/types";
import { getCart, removeItem, updateQuantity } from "./lib/cartApi";

import { CartItemRow } from "./components/CartItemRow";
import { CartSummary } from "./components/CartSummary";
import { EmptyCart } from "./components/EmptyCart";

import styles from "./Cart.module.css";

type ProductVariant = {
  id: number;
  size: string;
  color: string;
  price: number;
  quantity: number;
  sku: string;
};

type Product = {
  id: number;
  title: string;
  description: string;
  brand: string | null;
  category: string;
  audience?: "MEN" | "WOMEN" | "UNISEX";
  images: string[];
  variants: ProductVariant[];
};

export default function CartPage() {
  const router = useRouter();
  const isAuth = useClientAuth();

  const [items, setItems] = useState<CartItem[]>([]);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const cartId = getCartId();

  useEffect(() => {
    let active = true;

    async function loadCart() {
      if (!cartId) {
        if (active) setLoading(false);
        return;
      }

      try {
        const data = await getCart(cartId);
        if (!active) return;
        setItems(data);
      } catch {
        if (!active) return;
        setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadCart();

    return () => {
      active = false;
    };
  }, [cartId]);

  useEffect(() => {
    let active = true;

    async function loadRecommendations() {
      try {
        const res = await fetch(`${API_URL}/api/products`);
        if (!res.ok) throw new Error("Failed to load recommendations");

        const data: Product[] = await res.json();
        if (!active) return;

        const safeList = Array.isArray(data) ? data : [];
        setRecommendations(safeList.slice(0, 12));
      } catch {
        if (!active) return;
        setRecommendations([]);
      }
    }

    loadRecommendations();

    return () => {
      active = false;
    };
  }, []);

  async function handleQty(variantId: number, qty: number) {
    if (!cartId) return;

    try {
      const data = await updateQuantity(cartId, variantId, qty);
      setItems(data);
      emitCartChanged();
    } catch (error) {
      console.error(error);
    }
  }

  async function handleRemove(variantId: number) {
    if (!cartId) return;

    try {
      const data = await removeItem(cartId, variantId);
      setItems(data);
      emitCartChanged();
    } catch (error) {
      console.error(error);
    }
  }

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items]);

  function goCheckout() {
    if (!items.length || isAuth === null) return;

    if (!isAuth) {
      router.push("/auth/login?next=/checkout");
      return;
    }

    router.push("/checkout");
  }

  if (loading) {
    return <div className={styles.state}>Загрузка…</div>;
  }

  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <div className={styles.top}>
          <h1 className={styles.title}>КОРЗИНА</h1>

          <button
            type="button"
            className={styles.continue}
            onClick={() => router.push("/catalog")}
          >
            Продолжить покупки
          </button>
        </div>

        {items.length === 0 ? (
          <EmptyCart />
        ) : (
          <div className={styles.grid}>
            <div className={styles.items}>
              {items.map((item) => (
                <CartItemRow
                  key={item.variantId}
                  item={item}
                  onChangeQty={handleQty}
                  onRemove={handleRemove}
                />
              ))}
            </div>

            <CartSummary
              subtotal={subtotal}
              onCheckout={goCheckout}
              disabled={!items.length || isAuth === null}
            />
          </div>
        )}

        <ProductCarousel
          title="Вам может понравиться"
          products={recommendations.map(mapProductToCarouselProduct)}
        />
      </div>
    </div>
  );
}