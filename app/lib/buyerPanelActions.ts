export type BuyerPanelAction = "back" | "close";
type Handler = { priority: number; handle: (action: BuyerPanelAction) => boolean };
const handlers = new Set<Handler>();

/** Active purchase steps may handle Back or keep an in-flight request on screen. */
export function registerBuyerPanelActions(handle: Handler["handle"], priority = 0) {
  const handler = { priority, handle };
  handlers.add(handler);
  return () => { handlers.delete(handler); };
}

export function handleBuyerPanelAction(action: BuyerPanelAction) {
  return [...handlers].sort((a, b) => b.priority - a.priority).some(handler => handler.handle(action));
}
