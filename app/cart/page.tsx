"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { loadResolvedCart } from "../lib/cartAuthority";
import { emitCartChanged } from "../lib/cartEvents";
import { AUTH_EVENT } from "../lib/authEvents";
import { useCurrentUser } from "../lib/useCurrentUser";
import { useAuthModal } from "../components/AuthModal/useAuthModal";
import { RecommendationsShowcase } from "../components/Recommendations/RecommendationsShowcase";

import type { CartItem } from "./lib/types";
import { removeItem, updateQuantity } from "./lib/cartApi";

import { CartItemRow } from "./components/CartItemRow";
import { CartSummary } from "./components/CartSummary";
import { EmptyCart } from "./components/EmptyCart";
import { CartContentSkeleton } from "../components/ui/CommerceSkeleton";
import { SkeletonBlock } from "../components/ui/SkeletonBlock";

import styles from "./Cart.module.css";

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
  const { openAuth } = useAuthModal();
  const { isAuthenticated: isAuth, loading: authLoading } = useCurrentUser();

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartId, setCartId] = useState("");
  const [cartError, setCartError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [pendingVariantIds, setPendingVariantIds] = useState<Set<number>>(
    () => new Set()
  );
  const guestPromptShown = useRef(false);

  useEffect(() => {
    if (authLoading || isAuth || guestPromptShown.current) return;
    guestPromptShown.current = true;
    openAuth("login", "/cart");
  }, [authLoading, isAuth, openAuth]);

  useEffect(() => {
    const reload = () => setReloadToken((current) => current + 1);
    window.addEventListener(AUTH_EVENT, reload);
    return () => window.removeEventListener(AUTH_EVENT, reload);
  }, []);

  useEffect(() => {
    let active = true;

    if (authLoading) return;

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
  }, [authLoading, isAuth, reloadToken]);

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

  const visibleItems = items;
  const cartLoading = authLoading || loading;

  const subtotal = useMemo(() => {
    return visibleItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [visibleItems]);

  const totalQuantity = useMemo(() => {
    return visibleItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [visibleItems]);

  function goCheckout() {
    if (!visibleItems.length || authLoading || pendingVariantIds.size > 0) return;

    if (!isAuth) {
      openAuth("login", "/checkout");
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
        {cartLoading || visibleItems.length > 0 ? <div className={styles.top}>
          <h1 className={styles.title}>Корзина</h1>
          <p className={styles.count} aria-live="polite">
            {cartLoading ? (
              <SkeletonBlock as="span" className={styles.countSkeleton} />
            ) : (
              formatCartCount(totalQuantity)
            )}
          </p>
        </div> : null}

        {cartLoading ? (
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
                Каталог
              </Link>
            </div>
          </div>
        ) : visibleItems.length === 0 ? (
          <EmptyCart isAuthenticated={isAuth} />
        ) : (
          <div className={styles.grid}>
            <div className={styles.items}>
              {visibleItems.map((item) => (
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
                !visibleItems.length || authLoading || pendingVariantIds.size > 0
              }
            />
          </div>
        )}

        {!cartLoading ? (
          <RecommendationsShowcase
            seedIds={visibleItems.map((item) => item.productId)}
            className={styles.recommendations}
          />
        ) : null}
      </div>
    </div>
  );
}
