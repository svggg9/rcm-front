"use client";

import { useEffect, useRef, useState } from "react";
import { DesignSystemIcon } from "../../../../../components/ui/DesignSystemIcon";
import styles from "./ProductEditableTitle.module.css";

type Props = {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
};

export function ProductEditableTitle({ value, disabled, onChange }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const editingRef = useRef(false);
  const restoreFocusRef = useRef(false);
  const editing = draft !== null;

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus({ preventScroll: true });
      inputRef.current?.select();
    } else if (restoreFocusRef.current) {
      restoreFocusRef.current = false;
      triggerRef.current?.focus({ preventScroll: true });
    }
  }, [editing]);

  function finish(commit: boolean, restoreFocus = false) {
    if (!editingRef.current) return;
    editingRef.current = false;
    restoreFocusRef.current = restoreFocus;
    if (commit && !disabled && draft !== null && draft !== value) onChange(draft);
    setDraft(null);
  }

  if (editing) {
    return <input ref={inputRef} className={styles.input} aria-label="Название товара"
      value={draft} disabled={disabled} onChange={event => setDraft(event.target.value)}
      onBlur={() => finish(true)} onKeyDown={event => {
        if (event.nativeEvent.isComposing || !["Enter", "Escape"].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        finish(event.key === "Enter", true);
      }} />;
  }

  const label = value.trim() || "Название товара";
  const labelClass = `${styles.text} ${value.trim() ? "" : styles.placeholder}`.trim();
  if (disabled) return <span className={labelClass} title={label}>{label}</span>;

  return <button ref={triggerRef} type="button" className={styles.trigger}
    aria-label={`Изменить название товара: ${label}`} title="Нажмите, чтобы изменить название"
    onClick={() => { editingRef.current = true; setDraft(value); }}>
    <span className={labelClass}>{label}</span>
    <DesignSystemIcon name="pencil" role="utility" className={styles.icon} />
  </button>;
}
