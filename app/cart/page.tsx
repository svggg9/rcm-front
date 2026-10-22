"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/app/components/ui/toast";

import { loadResolvedCart } from "../lib/cartAuthority";
import { emitCartChanged } from "../lib/cartEvents";
import { AUTH_EVENT } from "../lib/authEvents";
import { isRequestCancelled } from "../lib/apiErrors";
import { getClientSessionRevision } from "../lib/client-session";
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
import { RequestError } from "../components/ui/RequestError";
import { Button } from "../components/ui/Button";

import styles from "./Cart.module.css";

function CartPageContent() {
  const router = useRouter();
  const checkoutRequested = useSearchParams().get("checkout") === "1";
  const { isAuthenticated: isAuth, loading: authLoading, error: sessionError, revision: sessionRevision, reload: reloadSession } = useCurrentUser();

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartId, setCartId] = useState("");
  const [cartRevision, setCartRevision] = useState<number | null>(null);
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
    const reload = () => { if (!checkoutInFlight.current && !mutationInFlight.current) setReloadToken((current) => current + 1); };
    const identityChanged = () => {
      setItems([]); setCartId(""); setCheckoutOrderId(null); setCartError(null); setLoading(true);
      setCartRevision(null);
      setInlineAuth(false); setRowErrors({}); setStockLimits({}); setActionError(null);
      setReloadToken(current => current + 1);
    };
    const restore = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      checkoutInFlight.current = false;
      setCheckoutState({ busy: false });
      restoringCheckout.current = true;
      setReloadToken(current => current + 1);
    };
    window.addEventListener(AUTH_EVENT, identityChanged);
    window.addEventListener("focus", reload);
    window.addEventListener("pageshow", restore);
    return () => {
      window.removeEventListener(AUTH_EVENT, identityChanged);
      window.removeEventListener("focus", reload);
      window.removeEventListener("pageshow", restore);
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (authLoading) return;
    if (sessionError) { setLoading(false); return; }

    async function loadCart() {
      try {
        setLoading(true);
        const resolvedCart = await loadResolvedCart();
        if (!active) return;
        const bankReturnId = checkoutRequested && !resolvedCart.items.length ? loadBankReturnOrder(resolvedCart.cartId) : null;
        if (bankReturnId) {
          const payment = await apiFetch(`${API_URL}/api/payments/order/${bankReturnId}/group-last`).catch(() => null);
          if (!active) return;
          const paymentStatus = payment?.ok ? (await payment.json()).status : null;
          if (!active) return;
          if (paymentStatus === "SUCCEEDED") {
            clearSucceededPendingPayment(resolvedCart.cartId, bankReturnId, "SUCCEEDED");
            router.replace(`/account?tab=orders&orderId=${bankReturnId}`);
            return;
          }
        }
        setCartId(resolvedCart.cartId);
        setCartRevision(sessionRevision);
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
      } catch (failure) {
        if (!active || isRequestCancelled(failure)) return;
        setCartError("Не удалось подключиться к корзине");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCart();

    return () => {
      active = false;
    };
  }, [authLoading, isAuth, sessionError, sessionRevision, reloadToken, checkoutRequested, router]);

  function setVariantPending(variantId: number, pending: boolean) {
    setPendingVariantIds((current) => {
      const next = new Set(current);
      if (pending) next.add(variantId);
      else next.delete(variantId);
      return next;
    });
  }

  async function handleQty(variantId: number, qty: number) {
    if (!cartId || cartError || sessionError || loading || authLoading || mutationInFlight.current || checkoutInFlight.current) return;
    mutationInFlight.current = true;
    const revision = getClientSessionRevision();

    setVariantPending(variantId, true);
    setRowErrors(current => ({ ...current, [variantId]: "" }));

    try {
      const data = await updateQuantity(cartId, variantId, qty);
      if (revision !== getClientSessionRevision()) return;

      setItems(Array.isArray(data) ? data : []);
      setCheckoutOrderId(null);
      setRowErrors({});
      setStockLimits({});
      setActionError(null);
      emitCartChanged();
    } catch (error) {
      if (revision !== getClientSessionRevision()) return;
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
    if (!cartId || cartError || sessionError || loading || authLoading || mutationInFlight.current || checkoutInFlight.current) return;
    mutationInFlight.current = true;
    const revision = getClientSessionRevision();

    setVariantPending(variantId, true);
    setRowErrors(current => ({ ...current, [variantId]: "" }));

    try {
      const data = await removeItem(cartId, variantId);
      if (revision !== getClientSessionRevision()) return;

      setItems(Array.isArray(data) ? data : []);
      setCheckoutOrderId(null);
      setRowErrors({});
      setStockLimits({});
      setActionError(null);
      emitCartChanged();
      toast.success("Товар удалён из корзины");
    } catch (error) {
      if (revision !== getClientSessionRevision()) return;
      setRowErrors(current => ({ ...current, [variantId]: error instanceof CartActionError ? error.message : "Не удалось удалить товар — попробуйте ещё раз" }));
    } finally {
      mutationInFlight.current = false;
      setVariantPending(variantId, false);
    }
  }

  async function handleClear() {
    if (!cartId || cartError || sessionError || loading || authLoading || mutationInFlight.current || checkoutInFlight.current) return;
    mutationInFlight.current = true;
    const revision = getClientSessionRevision();
    setClearing(true);
    setActionError(null);
    try {
      for (const item of items) {
        const remaining = await removeItem(cartId, item.variantId);
        if (revision !== getClientSessionRevision()) return;
        setItems(remaining);
        setRowErrors({});
        setStockLimits({});
        setCheckoutOrderId(null);
        emitCartChanged();
      }
    } catch {
      if (revision !== getClientSessionRevision()) return;
      setActionError("Не удалось очистить всю корзину — попробуйте ещё раз");
      try { const remaining = await getCart(cartId); if (revision === getClientSessionRevision()) setItems(remaining); } catch { /* Preserve the last confirmed contents. */ }
    } finally {
      mutationInFlight.current = false;
      setClearing(false);
    }
  }

  const visibleItems = useMemo(() => cartRevision === sessionRevision ? items : [], [cartRevision, sessionRevision, items]);
  const loadError = sessionError?.message ?? cartError;
  const cartLoading = !visibleItems.length && (authLoading || loading);
  const cartChanging = clearing || pendingVariantIds.size > 0;
  const busy = cartChanging || authBusy || loading || authLoading || checkoutBusy || Boolean(loadError);
  const checkoutCart = useMemo(() => ({ cartId, items: visibleItems, checkoutOrderId }), [cartId, visibleItems, checkoutOrderId]);
  const productQuantities = countProducts(visibleItems);
  const overLimit = [...productQuantities.values()].some(quantity => quantity > MAX_PRODUCT_QUANTITY);
  const unavailable = !checkoutOrderId && visibleItems.some(item => (stockLimits[item.variantId] ?? item.availableQuantity ?? Infinity) < item.quantity);

  useEffect(() => {
    if (checkoutRequested && cartId && !loadError && !loading && !authLoading && !items.length && !checkoutBusy) {
      router.replace("/cart", { scroll: false });
    }
  }, [checkoutRequested, cartId, loadError, loading, authLoading, items.length, checkoutBusy, router]);

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
    if (sessionError) { void reloadSession(); return; }
    setLoading(true);
    setReloadToken((current) => current + 1);
  }

  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <div className={styles.top}>
          <h1 className={styles.title}>Корзина</h1>
          {!cartLoading && visibleItems.length > 0 && <ConfirmActionButton className={styles.clearBtn}
            confirmTitle="Вы уверены, что хотите очистить корзину?"
            confirmText={`При очистке корзины все добавленные ранее товары (${totalQuantity}) будут удалены`}
            confirmLabel="Очистить корзину" showCancel={false} disabled={busy} onConfirm={handleClear}>Очистить</ConfirmActionButton>}
        </div>
        {actionError && <p className={styles.cartNotice} role="alert">{actionError}</p>}
        {overLimit && <p className={styles.cartNotice} role="alert">{PRODUCT_QUANTITY_LIMIT_MESSAGE}</p>}

        {loadError && visibleItems.length > 0 ? <RequestError variant="inline" message={sessionError ? "Не удалось проверить вход" : "Не удалось обновить корзину"}
          text="Показаны последние загруженные данные" loading={loading || authLoading} onRetry={retryCart} /> : null}

        {cartLoading && !loadError ? (
          <CartContentSkeleton />
        ) : loadError && visibleItems.length === 0 ? (
          <RequestError message={sessionError ? "Не удалось проверить вход" : "Не удалось загрузить корзину"} text="Попробуйте ещё раз" loading={loading || authLoading}
            onRetry={retryCart} secondaryAction={<Link href="/catalog" className="buttonSecondary">Каталог</Link>} />
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
                cartSnapshot={checkoutCart} cartUpdating={cartChanging} cartBlocked={loading || authLoading || Boolean(loadError) || overLimit || unavailable}
                cartMutationRef={mutationInFlight} onSubmitBusyChange={handleSubmitBusyChange} /> : checkoutRequested ? <div className={styles.inlineAuth}>
                <AuthForm next="/cart?checkout=1" disabled={cartChanging || overLimit || unavailable || loading || authLoading || Boolean(loadError)}
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
