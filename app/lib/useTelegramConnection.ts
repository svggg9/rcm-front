"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createTelegramLink, getTelegramStatus, mergeTelegramStatus, telegramLinkPending, unlinkTelegram, type TelegramStatus } from "./telegram";

export function useTelegramConnection(enabled = true) {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [action, setAction] = useState<"link" | "unlink" | null>(null);
  const currentStatus = useRef<TelegramStatus | null>(null);
  const readController = useRef<AbortController | null>(null);
  const mutationController = useRef<AbortController | null>(null);
  const generation = useRef({ value: 0 });

  const applyStatus = useCallback((next: TelegramStatus, replace = false) => {
    const merged = mergeTelegramStatus(replace ? null : currentStatus.current, next);
    currentStatus.current = merged;
    setStatus(merged);
    return merged;
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled || readController.current || mutationController.current || document.visibilityState === "hidden") return;
    const controller = new AbortController();
    readController.current = controller;
    const version = generation.current.value;
    try {
      const next = await getTelegramStatus(controller.signal);
      if (controller.signal.aborted || version !== generation.current.value) return;
      applyStatus(next);
      setError(null);
    } catch (reason) {
      if (!controller.signal.aborted && version === generation.current.value) setError(reason instanceof Error ? reason.message : "Не удалось проверить Telegram");
    } finally {
      if (readController.current === controller) readController.current = null;
      if (!controller.signal.aborted && version === generation.current.value) setLoading(false);
    }
  }, [applyStatus, enabled]);

  useEffect(() => {
    if (!enabled) {
      currentStatus.current = null;
      setStatus(null);
      setLoading(false);
      setAction(null);
      setError(null);
      return;
    }
    const requestGeneration = generation.current;
    setLoading(true);
    void refresh();
    const onReturn = () => { void refresh(); };
    window.addEventListener("focus", onReturn);
    window.addEventListener("pageshow", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      ++requestGeneration.value;
      readController.current?.abort();
      readController.current = null;
      mutationController.current?.abort();
      mutationController.current = null;
      window.removeEventListener("focus", onReturn);
      window.removeEventListener("pageshow", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, [enabled, refresh]);

  useEffect(() => {
    if (!telegramLinkPending(status)) return;
    const interval = window.setInterval(() => void refresh(), 5000);
    const expiry = window.setTimeout(() => {
      const latest = currentStatus.current;
      if (latest && latest.expiresAt === status?.expiresAt && !telegramLinkPending(latest)) {
        applyStatus({ ...latest, url: null, status: "EXPIRED" }, true);
        void refresh();
      }
    }, Math.max(0, Date.parse(status!.expiresAt!) - Date.now()) + 50);
    return () => { window.clearInterval(interval); window.clearTimeout(expiry); };
  }, [applyStatus, refresh, status]);

  const mutate = useCallback(async (kind: "link" | "unlink") => {
    if (!enabled || mutationController.current) return null;
    ++generation.current.value;
    readController.current?.abort();
    readController.current = null;
    const controller = new AbortController();
    mutationController.current = controller;
    setAction(kind);
    setError(null);
    try {
      const next = await (kind === "link" ? createTelegramLink(controller.signal) : unlinkTelegram(controller.signal));
      if (controller.signal.aborted) return null;
      return applyStatus(next, true);
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Не удалось изменить подключение Telegram");
      return null;
    } finally {
      if (mutationController.current === controller) mutationController.current = null;
      if (!controller.signal.aborted) { setAction(null); setLoading(false); }
    }
  }, [applyStatus, enabled]);

  return { status, error, loading, action, busy: action !== null, pending: telegramLinkPending(status), refresh,
    connect: () => mutate("link"), disconnect: () => mutate("unlink") };
}

export type TelegramConnectionController = ReturnType<typeof useTelegramConnection>;
