"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Brief visual feedback for an actual failed action; the caller owns the error message. */
export function useTransientFailure() {
  const [failure, setFailure] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; if (timer.current) clearTimeout(timer.current); };
  }, []);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (mounted.current) setFailure(false);
  }, []);
  const show = useCallback(() => {
    if (!mounted.current) return;
    if (timer.current) clearTimeout(timer.current);
    setFailure(true);
    timer.current = setTimeout(() => { timer.current = null; if (mounted.current) setFailure(false); }, 1800);
  }, []);
  return { failure, show, clear };
}
