"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/app/components/ui/toast";

import { loadResolvedCart } from "../lib/cartAuthority";
import { emitCartChanged } from "../lib/cartEvents";
import { AUTH_EVENT } from "../lib/authEvents";
import { API_URL, apiFetch } from "../lib/api";
import { loadBankReturnOrder, clearSucceededPendingPayment } from "../checkout/lib/pendingPayment";
import { useCurrentUser } from "../lib/useCurrentUser";
import { CheckoutPageClient } from "../checkout/CheckoutPageClient";
import { AuthForm } from "../components/Auth/AuthForm";

import type { CartItem } from "./lib/types";
import { MAX_PRODUCT_QUANTITY, maxLineQuantity, productQuantities as countProducts } from "./lib/quantityLimits";
import { CartActionError, PRODUCT_QUANTITY_LIMIT_MESSAGE, getCart, removeItem, updateQuantity } from "./lib/cartApi";

import { CartItemRow } from "./components/CartItemRow";
import { CartSummary } from "./components/CartSummary";
import { EmptyCart } from "./components/EmptyCart";
import { CartContentSkeleton } from "../components/ui/CommerceSkeleton";
import { ConfirmActionButton } from "../components/ui/ConfirmActionButton";
import { Button } from "../components/ui/Button";

import styles from "./Cart.module.css";

function CartPageContent() {
  const router = useRouter();
  const checkoutRequested = useSearchParams().get("checkout") === "1";
  const { isAuthenticated: isAuth, loading: authLoading } = useCurrentUser();

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartId, setCartId] = useState("");
  const [cartError, setCartError] = useState<string | null>(null);
  const [checkoutOrderId, setCheckoutOrderId] = useState<number | null>(null);
  const [returnVersion, setReturnVersion] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const [pendingVariantIds, setPendingVariantIds] = useState<Set<number>>(
    () => new Set()
  );
  const [inlineAuth, setInlineAuth] = useState(false);
  const checkoutOpen = checkoutRequested && isAuth && !inlineAuth;
  const [authBusy, setAuthBusy] = useState(false);
  const mutationInFlight = useRef(false);
  const checkoutInFlight = useRef(false);
  const restoringCheckout = useRef(false);
  const [checkoutState, setCheckoutState] = useState({ busy: false });
  const checkoutBusy = checkoutState.busy;
  const handleSubmitBusyChange = useCallback((value: boolean) => {
    checkoutInFlight.current = value;
    setCheckoutState({ busy: value });
  }, []);
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [stockLimits, setStockLimits] = useState<Record<number, number>>({});
  const [clearing, setClearing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const reload = () => { if (!checkoutInFlight.current) setReloadToken((current) => current + 1); };
    const restore = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      checkoutInFlight.current = false;
      setCheckoutState({ busy: false });
      restoringCheckout.current = true;
      setReloadToken(current => current + 1);
    };
    window.addEventListener(AUTH_EVENT, reload);
    window.addEventListener("focus", reload);
    window.addEventListener("pageshow", restore);
    return () => {
      window.removeEventListener(AUTH_EVENT, reload);
      window.removeEventListener("focus", reload);
      window.removeEventListener("pageshow", restore);
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (authLoading) return;

    async function loadCart() {
      try {
        setLoading(true);
        const resolvedCart = await loadResolvedCart();
        if (!active) return;
        const bankReturnId = checkoutRequested && !resolvedCart.items.length ? loadBankReturnOrder(resolvedCart.cartId) : null;
        if (bankReturnId) {
          const payment = await apiFetch(`${API_URL}/api/payments/order/${bankReturnId}/group-last`).catch(() => null);
          if (!active) return;
          if (payment?.ok && (await payment.json()).status === "SUCCEEDED") {
            clearSucceededPendingPayment(resolvedCart.cartId, bankReturnId, "SUCCEEDED");
            router.replace(`/account?tab=orders&orderId=${bankReturnId}`);
            return;
          }
        }
        setCartId(resolvedCart.cartId);
        setItems(resolvedCart.items);
        setRowErrors({});
        setStockLimits({});
        setActionError(null);
        setCheckoutOrderId(resolvedCart.checkoutOrderId ?? null);
        if (restoringCheckout.current) {
          restoringCheckout.current = false;
          setReturnVersion(current => current + 1);
        }
        setCartError(null);
      } catch {
        if (!active) return;
        setCartId("");
        setItems([]);
        setCartError("Не удалось подключиться к корзине");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCart();

    return () => {
      active = false;
    };
  }, [authLoading, isAuth, reloadToken, checkoutRequested, router]);

  function setVariantPending(variantId: number, pending: boolean) {
    setPendingVariantIds((current) => {
      const next = new Set(current);
      if (pending) next.add(variantId);
      else next.delete(variantId);
      return next;
    });
  }

  async function handleQty(variantId: number, qty: number) {
    if (!cartId || mutationInFlight.current || checkoutInFlight.current) return;
    mutationInFlight.current = true;

    setVariantPending(variantId, true);
    setRowErrors(current => ({ ...current, [variantId]: "" }));

    try {
      const data = await updateQuantity(cartId, variantId, qty);

      setItems(Array.isArray(data) ? data : []);
      setCheckoutOrderId(null);
      setRowErrors({});
      setStockLimits({});
      setActionError(null);
      emitCartChanged();
    } catch (error) {
      setRowErrors(current => ({ ...current, [variantId]: error instanceof CartActionError ? error.message : "Не удалось изменить количество — попробуйте ещё раз" }));
      if (error instanceof CartActionError && error.availableQuantity !== undefined) {
        setStockLimits(current => ({ ...current, [variantId]: error.availableQuantity! }));
      }
    } finally {
      mutationInFlight.current = false;
      setVariantPending(variantId, false);
    }
  }

  async function handleRemove(variantId: number) {
    if (!cartId || mutationInFlight.current || checkoutInFlight.current) return;
    mutationInFlight.current = true;

    setVariantPending(variantId, true);
    setRowErrors(current => ({ ...current, [variantId]: "" }));

    try {
      const data = await removeItem(cartId, variantId);

      setItems(Array.isArray(data) ? data : []);
      setCheckoutOrderId(null);
      setRowErrors({});
      setStockLimits({});
      setActionError(null);
      emitCartChanged();
      toast.success("Товар удалён из корзины");
    } catch (error) {
      setRowErrors(current => ({ ...current, [variantId]: error instanceof CartActionError ? error.message : "Не удалось удалить товар — попробуйте ещё раз" }));
    } finally {
      mutationInFlight.current = false;
      setVariantPending(variantId, false);
    }
  }

  async function handleClear() {
    if (!cartId || mutationInFlight.current || checkoutInFlight.current) return;
    mutationInFlight.current = true;
    setClearing(true);
    setActionError(null);
    try {
      for (const item of items) {
        const remaining = await removeItem(cartId, item.variantId);
        setItems(remaining);
        setRowErrors({});
        setStockLimits({});
        setCheckoutOrderId(null);
        emitCartChanged();
      }
    } catch {
      setActionError("Не удалось очистить всю корзину — попробуйте ещё раз");
      try { setItems(await getCart(cartId)); } catch { /* Preserve the last confirmed contents. */ }
    } finally {
      mutationInFlight.current = false;
      setClearing(false);
    }
  }

  const visibleItems = items;
  const cartLoading = authLoading || (loading && !items.length);
  const cartChanging = clearing || pendingVariantIds.size > 0;
  const busy = cartChanging || authBusy || loading || checkoutBusy;
  const checkoutCart = useMemo(() => ({ cartId, items, checkoutOrderId }), [cartId, items, checkoutOrderId]);
  const productQuantities = countProducts(items);
  const overLimit = [...productQuantities.values()].some(quantity => quantity > MAX_PRODUCT_QUANTITY);
  const unavailable = !checkoutOrderId && items.some(item => (stockLimits[item.variantId] ?? item.availableQuantity ?? Infinity) < item.quantity);

  useEffect(() => {
    if (checkoutRequested && cartId && !loading && !authLoading && !items.length && !checkoutBusy) {
      router.replace("/cart", { scroll: false });
    }
  }, [checkoutRequested, cartId, loading, authLoading, items.length, checkoutBusy, router]);

  const subtotal = useMemo(() => {
    return visibleItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [visibleItems]);

  const totalQuantity = useMemo(() => {
    return visibleItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [visibleItems]);

  function goCheckout() {
    if (authLoading || busy || !visibleItems.length || overLimit || unavailable) return;

    if (!isAuth) setInlineAuth(true);
    router.push("/cart?checkout=1", { scroll: false });
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
          {!cartLoading && visibleItems.length > 0 && <ConfirmActionButton className={styles.clearBtn}
            confirmTitle="Очистить корзину?" confirmText="Все товары будут удалены из корзины"
            confirmLabel="Очистить" disabled={busy} onConfirm={handleClear}>Очистить</ConfirmActionButton>}
        </div>
        {actionError && <p className={styles.cartNotice} role="alert">{actionError}</p>}
        {overLimit && <p className={styles.cartNotice} role="alert">{PRODUCT_QUANTITY_LIMIT_MESSAGE}</p>}

        {cartLoading ? (
          <CartContentSkeleton />
        ) : cartError ? (
          <div className={styles.errorState} role="alert">
            <h2>Не удалось загрузить корзину</h2>
            <p>{cartError} — попробуйте ещё раз</p>
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
          <EmptyCart />
        ) : (
          <div className={styles.grid}>
            <div className={styles.items}>
              {visibleItems.map((item) => (
                <CartItemRow
                  key={item.variantId}
                  item={item}
                  pending={busy}
                  maxQuantity={checkoutOrderId ? Math.max(item.quantity, maxLineQuantity(item, productQuantities.get(item.productId) ?? 0, stockLimits[item.variantId])) : maxLineQuantity(item, productQuantities.get(item.productId) ?? 0, stockLimits[item.variantId])}
                  error={rowErrors[item.variantId]}
                  onChangeQty={handleQty}
                  onRemove={handleRemove}
                />
              ))}
            </div>

            {visibleItems.length > 0 && <CartSummary
              hideAction
              subtotal={subtotal}
              itemCount={totalQuantity}
              onCheckout={goCheckout}
              disabled={
                !visibleItems.length || authLoading || busy || overLimit || unavailable
              }
            />}
            <div className={styles.checkoutFlow}>
              {checkoutOpen ? <CheckoutPageClient key={`${cartId}:${returnVersion}`} embedded initialCart={null} initialMe={null}
                cartSnapshot={checkoutCart} cartUpdating={cartChanging} cartBlocked={loading || overLimit || unavailable}
                cartMutationRef={mutationInFlight} onSubmitBusyChange={handleSubmitBusyChange} /> : checkoutRequested ? <div className={styles.inlineAuth}>
                <AuthForm next="/cart?checkout=1" disabled={cartChanging || overLimit || unavailable || loading}
                  onBusyChange={setAuthBusy} onBack={() => {
                    setInlineAuth(false); router.replace("/cart", { scroll: false });
                    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>("[data-checkout-trigger]")?.focus());
                  }}
                  onAuthenticated={() => { setInlineAuth(false); }} />
              </div> : <Button type="button" variant="primary" className={styles.checkoutBtn}
                disabled={authLoading || busy || !visibleItems.length || overLimit || unavailable}
                onClick={goCheckout} data-checkout-trigger>Перейти к оформлению</Button>}
            </div>
          </div>
        )}


      </div>
    </div>
  );
}

export default function CartPage() {
  return <Suspense fallback={<CartContentSkeleton />}><CartPageContent /></Suspense>;
}
