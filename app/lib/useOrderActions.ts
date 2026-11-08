"use client";
import { useEffect, useState } from "react";
import { orderAction, type OrderAction, type OrderWorkflow } from "./order-contract";

export function useOrderActions(order: { workflow?: OrderWorkflow | null }) {
  const [now, setNow] = useState(() => Date.now());
  const workflow = order.workflow;
  useEffect(() => {
    const next = workflow?.actions.filter(action => action.allowed && action.availableUntil)
      .map(action => Date.parse(action.availableUntil!)).filter(at => at > Date.now()).sort((a, b) => a - b)[0];
    if (next === undefined) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(next - Date.now() + 20, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [workflow, now]);
  return (code: OrderAction) => orderAction(order, code);
}
