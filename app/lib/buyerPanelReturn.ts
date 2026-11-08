import { safeReturnPath } from "./safeReturnPath";

export const BUYER_PANEL_RETURN_KEY = "rcmBuyerPanelReturn";

export type BuyerReturnTarget = { href: string; x: number; y: number };
export type BuyerPanelEntry = {
  version: 1;
  href: string;
  back: BuyerReturnTarget;
  close: BuyerReturnTarget;
};
export type BuyerPanelSnapshot = { target: BuyerReturnTarget; entry: BuyerPanelEntry | null };

const fallbackTarget = (): BuyerReturnTarget => ({ href: "/catalog", x: 0, y: 0 });

export function isBuyerPanelPath(href: string) {
  const path = href.split(/[?#]/, 1)[0];
  return path === "/cart" || path === "/favorites";
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readTarget(value: unknown): BuyerReturnTarget | null {
  if (!record(value) || typeof value.href !== "string" || !value.href || safeReturnPath(value.href, "") !== value.href ||
    typeof value.x !== "number" || !Number.isFinite(value.x) || value.x < 0 ||
    typeof value.y !== "number" || !Number.isFinite(value.y) || value.y < 0) return null;
  return { href: value.href, x: value.x, y: value.y };
}

/** The marker belongs to this history entry; a copied marker for another URL is ignored. */
export function readBuyerPanelEntry(state: unknown, href: string): BuyerPanelEntry | null {
  if (!record(state)) return null;
  const value = state[BUYER_PANEL_RETURN_KEY];
  if (!record(value) || value.version !== 1 || value.href !== href) return null;
  const back = readTarget(value.back);
  const close = readTarget(value.close);
  if (!back || !close || back.href === href || isBuyerPanelPath(close.href)) return null;
  return { version: 1, href, back, close };
}

export function createBuyerPanelEntry(
  href: string,
  previous: BuyerPanelSnapshot | null,
  historyNavigation: boolean,
): BuyerPanelEntry {
  // A pop without our marker has no trustworthy predecessor. It may come from the bank.
  const previousTarget = previous && readTarget(previous.target);
  if (!previousTarget || historyNavigation) return { version: 1, href, back: fallbackTarget(), close: fallbackTarget() };
  const previousEntry = previous.entry && readBuyerPanelEntry({ [BUYER_PANEL_RETURN_KEY]: previous.entry }, previousTarget.href);
  const samePanel = href.split(/[?#]/, 1)[0] === previousTarget.href.split(/[?#]/, 1)[0];
  if (samePanel && previousEntry) return { ...previousEntry, href };
  return {
    version: 1,
    href,
    back: previousTarget.href === href ? fallbackTarget() : previousTarget,
    close: previousEntry?.close ?? (isBuyerPanelPath(previousTarget.href) ? fallbackTarget() : previousTarget),
  };
}

let pendingScroll: { target: BuyerReturnTarget; at: number } | null = null;

export function requestBuyerPanelScroll(target: BuyerReturnTarget) {
  pendingScroll = { target, at: Date.now() };
}

/** Consume after the destination route commits, before the normal scroll reset. */
export function consumeBuyerPanelScroll(href: string): BuyerReturnTarget | null {
  const pending = pendingScroll;
  pendingScroll = null;
  return pending && pending.target.href === href && Date.now() - pending.at < 15_000 ? pending.target : null;
}

/** Wait briefly for async page content, without taking scroll control away from the user. */
export function restoreBuyerPanelScroll(target: Pick<BuyerReturnTarget, "x" | "y">): () => void {
  let stopped = false;
  let frame = 0;
  let observer: ResizeObserver | null = null;
  let timeout = 0;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    window.clearTimeout(timeout);
    observer?.disconnect();
    window.removeEventListener("wheel", stop);
    window.removeEventListener("touchstart", stop);
    window.removeEventListener("pointerdown", stop);
    window.removeEventListener("keydown", key);
  };
  const key = (event: KeyboardEvent) => {
    if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) stop();
  };
  const restore = () => {
    frame = 0;
    if (stopped) return;
    const root = document.documentElement;
    const enoughHeight = Math.max(0, root.scrollHeight - window.innerHeight) >= target.y;
    const enoughWidth = Math.max(0, root.scrollWidth - window.innerWidth) >= target.x;
    window.scrollTo({ left: target.x, top: target.y, behavior: "instant" });
    if (enoughHeight && enoughWidth) stop();
  };
  const schedule = () => { if (!stopped && !frame) frame = requestAnimationFrame(restore); };
  window.addEventListener("wheel", stop, { passive: true });
  window.addEventListener("touchstart", stop, { passive: true });
  window.addEventListener("pointerdown", stop, { passive: true });
  window.addEventListener("keydown", key);
  if (typeof ResizeObserver !== "undefined") {
    observer = new ResizeObserver(schedule);
    observer.observe(document.documentElement);
    observer.observe(document.body);
  }
  timeout = window.setTimeout(stop, 4_000);
  schedule();
  return stop;
}
