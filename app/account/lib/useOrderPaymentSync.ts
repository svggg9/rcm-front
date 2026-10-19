"use client";

import { useEffect, useRef, useState } from "react";
import { API_URL, apiFetch } from "../../lib/api";
import { clearSucceededPendingPayment } from "../../checkout/lib/pendingPayment";
import type { Order } from "../types";

/** The bank return and subsequent visits share the same order screen. */
export function useOrderPaymentSync(order: Order, onUpdated: (order: Order) => void) {
  const latest = useRef({ order, onUpdated });
  useEffect(() => { latest.current = { order, onUpdated }; }, [order, onUpdated]);
  const [checking, setChecking] = useState(order.paymentStatus === "PENDING");
  const [paymentPending, setPaymentPending] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (order.paymentStatus !== "PENDING") {
      if (order.paymentStatus === "PAID") clearSucceededPendingPayment(localStorage.getItem("user_cart_id") ?? "", order.id, "SUCCEEDED");
      setChecking(false);
      setPaymentPending(false);
      setError(false);
      return;
    }
    const controller = new AbortController();
    let running = false;
    let settled = false;
    const check = async () => {
      if (running || settled || document.hidden) return;
      running = true;
      try {
        const response = await apiFetch(`${API_URL}/api/payments/order/${order.id}/group-last`, { signal: controller.signal });
        if (!response.ok && response.status !== 404) throw new Error("payment");
        let payment = response.status === 404
          ? { status: "NOT_STARTED" } as { status: string; externalId?: string }
          : await response.json() as { status: string; externalId?: string };
        if (payment.status === "PENDING" && payment.externalId) {
          const sync = await apiFetch(`${API_URL}/api/payments/${encodeURIComponent(payment.externalId)}/sync`, {
            method: "POST", signal: controller.signal,
          });
          if (!sync.ok) throw new Error("sync");
          payment = await sync.json() as typeof payment;
        }
        const refreshed = await apiFetch(`${API_URL}/api/orders/${order.id}`, { signal: controller.signal });
        if (!refreshed.ok) throw new Error("order");
        const updated = await refreshed.json() as Order;
        if (controller.signal.aborted || updated.id !== order.id) return;
        clearSucceededPendingPayment(localStorage.getItem("user_cart_id") ?? "", order.id, payment.status);
        setError(false);
        setChecking(false);
        setPaymentPending(payment.status === "PENDING");
        settled = payment.status !== "PENDING";
        if (JSON.stringify(updated) !== JSON.stringify(latest.current.order)) latest.current.onUpdated(updated);
      } catch {
        if (!controller.signal.aborted) { setError(true); setChecking(false); }
      } finally { running = false; }
    };
    setChecking(true);
    void check();
    const timer = window.setInterval(() => { void check(); }, 15000);
    const onVisible = () => { if (!document.hidden) void check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [order.id, order.paymentStatus]);
  return { checkingPayment: checking, paymentPending, paymentSyncError: error };
}
