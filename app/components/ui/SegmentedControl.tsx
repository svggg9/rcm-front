"use client";

import { useEffect, useRef } from "react";
import styles from "./SegmentedControl.module.css";

export type SegmentedControlItem<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
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
  const enabledItems = items.filter(item => !item.disabled);
  const focusValue = enabledItems.some(item => item.value === value) ? value : enabledItems[0]?.value;

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
        {items.map(item => (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={item.value === value}
            disabled={disabled || item.disabled}
            tabIndex={!disabled && !item.disabled && item.value === focusValue ? 0 : -1}
            className={styles.item}
            ref={button => {
              if (button) buttonRefs.current.set(item.value, button);
              else buttonRefs.current.delete(item.value);
            }}
            onClick={() => {
              if (!disabled && !item.disabled && item.value !== value) onChange(item.value);
            }}
            onKeyDown={event => {
              if (disabled || item.disabled || !enabledItems.length) return;
              const index = enabledItems.findIndex(option => option.value === item.value);
              let nextIndex: number;
              if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % enabledItems.length;
              else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + enabledItems.length) % enabledItems.length;
              else if (event.key === "Home") nextIndex = 0;
              else if (event.key === "End") nextIndex = enabledItems.length - 1;
              else return;

              event.preventDefault();
              const next = enabledItems[nextIndex];
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
