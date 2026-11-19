"use client";

import { useRef, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import styles from "./InsideLabelInput.module.css";

/** Shared outline and label for controls using an inside-label presentation. */
export function InsideLabelFrame({ controlId, label, required, invalid, mode = "fixed", appearance = "default", children, className = "", style, ref, side }: {
  controlId: string; label: string; required?: boolean; invalid?: boolean; mode?: "fixed" | "floating";
  appearance?: "default" | "warm"; children: ReactNode; className?: string; style?: CSSProperties;
  ref?: Ref<HTMLDivElement>; side?: "top" | "bottom";
}) {
  const [pointerFocus, setPointerFocus] = useState(false);
  const pointerDown = useRef(false);
  return <div ref={ref} style={style} data-side={side} data-pointer-focus={pointerFocus || undefined}
    onPointerDownCapture={event => {
      if (!(event.target instanceof Element) || !event.target.closest("input, label, button")) return;
      pointerDown.current = true;
      if (event.currentTarget.contains(document.activeElement)) setPointerFocus(true);
      // A click on a disabled control or a prevented pointer event may never focus it.
      // Clear the pending flag after the native pointerdown focus opportunity.
      window.setTimeout(() => { pointerDown.current = false; }, 0);
    }}
    onClickCapture={event => {
      // Labels and touch controls can transfer focus on click, after pointerdown has ended.
      if (event.detail > 0 && event.target instanceof Element && event.target.closest("input, label, button")) {
        pointerDown.current = true;
        if (event.currentTarget.contains(document.activeElement)) setPointerFocus(true);
        window.setTimeout(() => { pointerDown.current = false; }, 0);
      }
    }}
    onFocusCapture={() => { setPointerFocus(pointerDown.current); pointerDown.current = false; }}
    onKeyDownCapture={event => {
      if (["Tab", "ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End", "Escape"].includes(event.key)) {
        pointerDown.current = false;
        setPointerFocus(false);
      }
    }}
    onBlurCapture={event => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPointerFocus(false);
    }}
    className={`${styles.shell} ${mode === "floating" ? styles.floating : styles.fixed} ${appearance === "warm" ? styles.warm : ""} ${invalid ? styles.invalid : ""} ${className}`}>
    <label id={`${controlId}-label`} htmlFor={controlId} className={`${styles.label} ${required ? "required" : ""}`}>{label}</label>
    {children}
  </div>;
}
