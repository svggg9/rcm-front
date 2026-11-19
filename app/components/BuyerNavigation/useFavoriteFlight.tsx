"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { createPortal } from "react-dom";
import styles from "./FavoriteFlight.module.css";

type Flight = { key: number; id: number; revision: number; x: number; y: number; dx: number; dy: number };
let nextFlightKey = 0;

function visible(element: HTMLElement | null): element is HTMLElement {
  if (!element || !element.isConnected) return false;
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0 &&
    rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
}

/** Coordinates the visual confirmation only; favorite state remains authoritative. */
export function useFavoriteFlight(ids: number[], revision: number, targetRef?: RefObject<HTMLElement | null>) {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [pulseKey, setPulseKey] = useState(0);
  const [pulseTarget, setPulseTarget] = useState<string | null>(null);
  const nextPulse = useRef(0);
  const pulseTimer = useRef<number | null>(null);
  const timers = useRef(new Map<number, { id: number; timer: number; target: HTMLElement }>());
  const currentRevision = useRef(revision);
  const currentIds = useRef(ids);
  currentRevision.current = revision;
  currentIds.current = ids;

  const clearTimers = useCallback(() => {
    timers.current.forEach(item => window.clearTimeout(item.timer));
    timers.current.clear();
    if (pulseTimer.current !== null) window.clearTimeout(pulseTimer.current);
    pulseTimer.current = null;
  }, []);
  const cancelFlight = useCallback((id: number) => {
    timers.current.forEach((item, key) => {
      if (item.id === id) { window.clearTimeout(item.timer); timers.current.delete(key); }
    });
    setFlights(current => current.filter(item => item.id !== id));
  }, []);
  const finish = useCallback((key: number, flightRevision: number) => {
    const item = timers.current.get(key);
    if (!item) return;
    window.clearTimeout(item.timer);
    timers.current.delete(key);
    setFlights(current => current.filter(flight => flight.key !== key));
    if (flightRevision === currentRevision.current && currentIds.current.includes(item.id) && visible(item.target)) {
      if (pulseTimer.current !== null) window.clearTimeout(pulseTimer.current);
      setPulseTarget(item.target.getAttribute("data-favorite-flight-target"));
      setPulseKey(++nextPulse.current);
      pulseTimer.current = window.setTimeout(() => { setPulseKey(0); setPulseTarget(null); pulseTimer.current = null; }, 450);
    }
  }, []);
  useEffect(() => { clearTimers(); setFlights([]); setPulseKey(0); setPulseTarget(null); }, [revision, clearTimers]);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const flush = () => { if (motion.matches || document.visibilityState !== "visible") { clearTimers(); setFlights([]); setPulseKey(0); setPulseTarget(null); } };
    motion.addEventListener("change", flush);
    document.addEventListener("visibilitychange", flush);
    return () => { motion.removeEventListener("change", flush); document.removeEventListener("visibilitychange", flush); clearTimers(); };
  }, [clearTimers]);
  const startFlight = useCallback((id: number, origin: HTMLElement | null) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.visibilityState !== "visible" || !visible(origin)) return;
    const target = targetRef ? targetRef.current : Array.from(document.querySelectorAll<HTMLElement>("[data-favorite-flight-target]")).find(visible) ?? null;
    if (!visible(target)) return;
    const from = origin.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const x = from.left + from.width / 2;
    const y = from.top + from.height / 2;
    const flight: Flight = { key: ++nextFlightKey, id, revision, x, y, dx: to.right - x, dy: to.top + 4 - y };
    cancelFlight(id);
    const timer = window.setTimeout(() => finish(flight.key, flight.revision), 650);
    timers.current.set(flight.key, { id, timer, target });
    setFlights(current => [...current.filter(item => item.id !== id), flight]);
  }, [revision, targetRef, cancelFlight, finish]);
  const displayedCount = useMemo(() => {
    const confirmed = new Set(ids);
    return Math.max(0, ids.length - flights.filter(item => item.revision === revision && confirmed.has(item.id)).length);
  }, [ids, flights, revision]);

  const flightLayer = typeof document === "undefined" ? null : createPortal(
    flights.filter(item => item.revision === revision && ids.includes(item.id)).map(item => <svg key={item.key} className={styles.heart}
      style={{ "--flight-x": `${item.x}px`, "--flight-y": `${item.y}px`, "--flight-dx": `${item.dx}px`, "--flight-dy": `${item.dy}px` } as CSSProperties}
      viewBox="0 0 24 24" aria-hidden="true" focusable="false" onAnimationEnd={() => finish(item.key, item.revision)}>
      <path d="M12 20.4 4.5 13.3C.4 9.4 3 3.6 7.6 3.6c1.9 0 3.4.9 4.4 2.2 1-1.3 2.5-2.2 4.4-2.2 4.6 0 7.2 5.8 3.1 9.7L12 20.4Z" />
    </svg>), document.body);
  return { displayCount: displayedCount, pulseKey, pulseTarget, startFlight, cancelFlight, flightLayer };
}
