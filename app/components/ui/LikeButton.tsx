"use client";

import { useRef, useState, type ButtonHTMLAttributes, type MouseEvent } from "react";
import styles from "./LikeButton.module.css";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "children" | "aria-pressed"> & {
  liked: boolean;
  pending?: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void | Promise<unknown>;
};

export function LikeButton({ liked, pending = false, disabled = false, className = "", onClick, ...props }: Props) {
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [hoverFillSuppressed, setHoverFillSuppressed] = useState(false);
  const inFlight = useRef(false);
  const busy = pending || optimistic !== null;

  async function click(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (disabled || pending || inFlight.current) return;
    inFlight.current = true;
    setHoverFillSuppressed(liked);
    setOptimistic(!liked);
    try {
      // The caller owns persistence and error reporting. Reconcile with its
      // controlled value afterwards, including a failed save/rollback.
      await onClick(event);
    } finally {
      setOptimistic(null);
      inFlight.current = false;
    }
  }

  return <button
    {...props}
    type="button"
    className={`${styles.button} ${className}`.trim()}
    disabled={disabled || busy}
    aria-label={props["aria-label"] ?? (liked ? "Убрать из избранного" : "Добавить в избранное")}
    aria-pressed={optimistic ?? liked}
    aria-busy={busy || undefined}
    data-hover-fill-suppressed={hoverFillSuppressed || undefined}
    onPointerEnter={event => { setHoverFillSuppressed(false); props.onPointerEnter?.(event); }}
    onPointerLeave={event => { setHoverFillSuppressed(false); props.onPointerLeave?.(event); }}
    onClick={click}
  >
    <span className={styles.icon} aria-hidden="true" />
  </button>;
}
