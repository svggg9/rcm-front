"use client";

import { useEffect, useRef } from "react";
import styles from "./SegmentedControl.module.css";

export type SegmentedControlItem<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  items: readonly SegmentedControlItem<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
};

export function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  disabled = false,
}: Props<T>) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef(new Map<T, HTMLButtonElement>());
  const focusValue = items.some(item => item.value === value) ? value : items[0]?.value;

  function revealButton(button: HTMLButtonElement) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const viewport = scroller.getBoundingClientRect();
    const target = button.getBoundingClientRect();
    if (target.left < viewport.left) scroller.scrollLeft -= viewport.left - target.left;
    else if (target.right > viewport.right) scroller.scrollLeft += target.right - viewport.right;
  }

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const revealSelected = () => {
      const button = buttonRefs.current.get(value);
      if (button) revealButton(button);
    };
    revealSelected();
    const observer = new ResizeObserver(revealSelected);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [value, items]);

  return (
    <div className={styles.scroller} ref={scrollerRef}>
      <div className={styles.group} role="radiogroup" aria-label={ariaLabel} aria-disabled={disabled || undefined}>
        {items.map((item, index) => (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={item.value === value}
            disabled={disabled}
            tabIndex={!disabled && item.value === focusValue ? 0 : -1}
            className={styles.item}
            ref={button => {
              if (button) buttonRefs.current.set(item.value, button);
              else buttonRefs.current.delete(item.value);
            }}
            onClick={() => {
              if (!disabled && item.value !== value) onChange(item.value);
            }}
            onKeyDown={event => {
              if (disabled || !items.length) return;
              let nextIndex: number;
              if (event.key === "ArrowRight") nextIndex = (index + 1) % items.length;
              else if (event.key === "ArrowLeft") nextIndex = (index - 1 + items.length) % items.length;
              else if (event.key === "Home") nextIndex = 0;
              else if (event.key === "End") nextIndex = items.length - 1;
              else return;

              event.preventDefault();
              const next = items[nextIndex];
              const button = buttonRefs.current.get(next.value);
              if (button) {
                button.focus({ preventScroll: true });
                revealButton(button);
              }
              if (next.value !== value) onChange(next.value);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
