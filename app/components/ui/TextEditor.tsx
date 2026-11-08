"use client";

import { useId, useRef } from "react";
import { Button } from "./Button";
import { DesignSystemIcon } from "./DesignSystemIcon";
import { toggleTextEditorFormat, type TextEditorFormat } from "../../lib/textEditorFormatting";
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
  function toggleFormat(format: TextEditorFormat) {
    const field = input.current;
    if (!field) return;
    const start = field.selectionStart, end = field.selectionEnd, direction = field.selectionDirection;
    const next = toggleTextEditorFormat(value, start, end, format, maxLength);
    if (next) onChange(next.value);
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(next?.selectionStart ?? start, next?.selectionEnd ?? end, direction);
    });
  }
  return <div className={`${styles.editor} ${invalid || tooLong ? styles.invalid : ""}`}>
    <div className={styles.toolbar}>
      <div className={styles.tools} role="group" aria-label={`Форматирование: ${label}`}>
        <Button type="button" variant="ghost" reserveLabelSpace={false} onMouseDown={event => event.preventDefault()} onClick={() => toggleFormat("list")} aria-label={`Список: ${label}`}><DesignSystemIcon name="list" role="utility" />Список</Button>
        <Button type="button" variant="ghost" reserveLabelSpace={false} onMouseDown={event => event.preventDefault()} onClick={() => toggleFormat("heading")} aria-label={`Подзаголовок: ${label}`}>Подзаголовок</Button>
      </div>
      <span id={`${id}-count`} className={styles.count}>{value.length} / {maxLength}</span>
    </div>
    <textarea ref={input} value={value} onChange={event => onChange(event.target.value)}
      aria-label={label} aria-invalid={invalid || tooLong || undefined} aria-describedby={[`${id}-count`, errorId, tooLong ? `${id}-limit` : null].filter(Boolean).join(" ")}
      maxLength={Math.max(maxLength, value.length)} placeholder={placeholder} rows={6} />
    {tooLong && <p id={`${id}-limit`} className="fieldError">Не больше {maxLength} символов</p>}
  </div>;
}
