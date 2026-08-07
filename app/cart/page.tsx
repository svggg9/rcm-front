"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { API_URL, apiFetch } from "../lib/api";
import { loadResolvedCart } from "../lib/cartAuthority";
import { emitCartChanged } from "../lib/cartEvents";
import { AUTH_EVENT } from "../lib/authEvents";
import { useCurrentUser } from "../lib/useCurrentUser";
import { mapProductToCarouselProduct } from "../lib/productMappers";

import { ProductShowcase } from "../components/ProductShowcase/ProductShowcase";

import type { CartItem } from "./lib/types";
import { removeItem, updateQuantity } from "./lib/cartApi";

import { CartItemRow } from "./components/CartItemRow";
import { CartSummary } from "./components/CartSummary";
import { EmptyCart } from "./components/EmptyCart";
import { CartContentSkeleton } from "../components/ui/CommerceSkeleton";
import { SkeletonBlock } from "../components/ui/SkeletonBlock";

import styles from "./Cart.module.css";

type Product = {
  id: number;
  publicId?: string | null;
  title: string;
  brand: string | null;
  category: string | null;
  audience?: "MEN" | "WOMEN" | "UNISEX";
  coverImage?: string | null;
  hoverImage?: string | null;
  minPrice?: number | null;
};

function formatCartCount(count: number): string {
  const lastTwo = count % 100;
  const last = count % 10;

  if (lastTwo >= 11 && lastTwo <= 14) return `${count} товаров`;
  if (last === 1) return `${count} товар`;
  if (last >= 2 && last <= 4) return `${count} товара`;
  return `${count} товаров`;
}

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated: isAuth, loading: authLoading } = useCurrentUser();

  const [items, setItems] = useState<CartItem[]>([]);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartId, setCartId] = useState("");
  const [cartError, setCartError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [pendingVariantIds, setPendingVariantIds] = useState<Set<number>>(
    () => new Set()
  );

  useEffect(() => {
    const reload = () => setReloadToken((current) => current + 1);
    window.addEventListener(AUTH_EVENT, reload);
    return () => window.removeEventListener(AUTH_EVENT, reload);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadCart() {
      try {
        setLoading(true);
        const resolvedCart = await loadResolvedCart();
        if (!active) return;
        setCartId(resolvedCart.cartId);
        setItems(resolvedCart.items);
        setCartError(null);
      } catch {
        if (!active) return;
        setCartId("");
        setItems([]);
        setCartError("Не удалось подключиться к корзине.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCart();

    return () => {
      active = false;
    };
  }, [reloadToken]);

  useEffect(() => {
    let active = true;

    async function loadRecommendations() {
      try {
        const res = await apiFetch(
          `${API_URL}/api/products/page?page=0&size=12&sort=newest`
        );
        if (!res.ok) throw new Error("Failed to load recommendations");

        const data: { content?: Product[] } = await res.json();
        if (!active) return;

        setRecommendations(Array.isArray(data.content) ? data.content : []);
      } catch {
        if (!active) return;
        setRecommendations([]);
      }
    }

    void loadRecommendations();

    return () => {
      active = false;
    };
  }, []);

  function setVariantPending(variantId: number, pending: boolean) {
    setPendingVariantIds((current) => {
      const next = new Set(current);
      if (pending) next.add(variantId);
      else next.delete(variantId);
      return next;
    });
  }

  async function handleQty(variantId: number, qty: number) {
    if (!cartId || pendingVariantIds.has(variantId)) return;

    setVariantPending(variantId, true);

    try {
      const data = await updateQuantity(cartId, variantId, qty);

      setItems(Array.isArray(data) ? data : []);
      emitCartChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось изменить количество"
      );
    } finally {
      setVariantPending(variantId, false);
    }
  }

  async function handleRemove(variantId: number) {
    if (!cartId || pendingVariantIds.has(variantId)) return;

    setVariantPending(variantId, true);

    try {
      const data = await removeItem(cartId, variantId);

      setItems(Array.isArray(data) ? data : []);
      emitCartChanged();
      toast("Товар удалён из корзины");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось удалить товар"
      );
    } finally {
      setVariantPending(variantId, false);
    }
  }

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items]);

  const totalQuantity = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const visibleRecommendations = useMemo(() => {
    const cartProductIds = new Set(items.map((item) => item.productId));
    return recommendations.filter((product) => !cartProductIds.has(product.id));
  }, [items, recommendations]);

  function goCheckout() {
    if (!items.length || authLoading || pendingVariantIds.size > 0) return;

    if (!isAuth) {
      router.push("/auth/login?next=/checkout");
      return;
    }

    router.push("/checkout");
  }

  function retryCart() {
    setCartError(null);
    setLoading(true);
    setReloadToken((current) => current + 1);
  }

  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <div className={styles.top}>
          <h1 className={styles.title}>Корзина</h1>
          <p className={styles.count} aria-live="polite">
            {loading ? (
              <SkeletonBlock as="span" className={styles.countSkeleton} />
            ) : (
              formatCartCount(totalQuantity)
            )}
          </p>
        </div>

        {loading ? (
          <CartContentSkeleton />
        ) : cartError ? (
          <div className={styles.errorState} role="alert">
            <h2>Не удалось загрузить корзину</h2>
            <p>{cartError} Попробуйте ещё раз.</p>
            <div className={styles.errorActions}>
              <button type="button" className={styles.errorRetry} onClick={retryCart}>
                Повторить
              </button>
              <Link href="/catalog" className={styles.errorCatalog}>
                Перейти в каталог
              </Link>
            </div>
          </div>
        ) : items.length === 0 ? (
          <EmptyCart />
        ) : (
          <div className={styles.grid}>
            <div className={styles.items}>
              {items.map((item) => (
                <CartItemRow
                  key={item.variantId}
                  item={item}
                  pending={pendingVariantIds.has(item.variantId)}
                  onChangeQty={handleQty}
                  onRemove={handleRemove}
                />
              ))}
            </div>

            <CartSummary
              subtotal={subtotal}
              itemCount={totalQuantity}
              onCheckout={goCheckout}
              disabled={
                !items.length || authLoading || pendingVariantIds.size > 0
              }
            />
          </div>
        )}

        {!loading ? (
          <ProductShowcase
            variant="carousel"
            title="Возможно, вам понравится"
            products={visibleRecommendations.map(mapProductToCarouselProduct)}
            href="/catalog"
            actionLabel="Смотреть всё"
            className={styles.recommendations}
          />
        ) : null}
      </div>
    </div>
  );
}
