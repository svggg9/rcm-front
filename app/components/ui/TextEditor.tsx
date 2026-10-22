"use client";

import { useId, useRef } from "react";
import { Button } from "./Button";
import { DesignSystemIcon } from "./DesignSystemIcon";
import styles from "./TextEditor.module.css";

type Props = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  maxLength?: number;
  invalid?: boolean;
  errorId?: string;
  placeholder?: string;
};

/** Plain text remains portable to public product descriptions and email. */
export function TextEditor({ value, onChange, label, maxLength = 2000, invalid, errorId, placeholder }: Props) {
  const id = useId();
  const input = useRef<HTMLTextAreaElement>(null);
  const tooLong = value.length > maxLength;
  function toggleList() {
    const field = input.current;
    if (!field) return;
    const start = field.selectionStart === 0 ? 0 : value.lastIndexOf("\n", field.selectionStart - 1) + 1;
    const endOfLine = value.indexOf("\n", field.selectionEnd);
    const end = endOfLine < 0 ? value.length : endOfLine;
    const lines = value.slice(start, end).split("\n");
    const remove = lines.every(line => /^▪\s/.test(line));
    const replacement = lines.map(line => remove ? line.replace(/^▪\s/, "") : `▪ ${line}`).join("\n");
    const next = value.slice(0, start) + replacement + value.slice(end);
    if (next.length > maxLength) return;
    onChange(next);
    requestAnimationFrame(() => { field.focus(); field.setSelectionRange(start, start + replacement.length); });
  }
  return <div className={`${styles.editor} ${invalid || tooLong ? styles.invalid : ""}`}>
    <div className={styles.toolbar}>
      <Button type="button" variant="ghost" reserveLabelSpace={false} onMouseDown={event => event.preventDefault()} onClick={toggleList} aria-label={`Список: ${label}`}><DesignSystemIcon name="list" role="utility" />Список</Button>
      <span id={`${id}-count`} className={styles.count}>{value.length} / {maxLength}</span>
    </div>
    <textarea ref={input} value={value} onChange={event => onChange(event.target.value)}
      aria-label={label} aria-invalid={invalid || tooLong || undefined} aria-describedby={[`${id}-count`, errorId, tooLong ? `${id}-limit` : null].filter(Boolean).join(" ")}
      maxLength={Math.max(maxLength, value.length)} placeholder={placeholder} rows={6} />
    {tooLong && <p id={`${id}-limit`} className="fieldError">Не больше {maxLength} символов</p>}
  </div>;
}
