"use client";

import { useId, useState } from "react";
import { Button } from "../../../../../components/ui/Button";
import { parseDescription, serializeDescription, type TextBlock } from "../../../../../lib/productDescription";
import { ProductDescriptionText } from "../../../../../product/[id]/components/ProductDescriptionText";
import styles from "../ProductEditPage.module.css";

type Props = {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  errorId?: string;
  fieldName?: string;
  maxLength?: number;
  emptyText?: string;
};
export function ProductDescriptionEditor({ value, onChange, invalid, errorId,
  fieldName = "Описание", maxLength = 2000, emptyText = "" }: Props) {
  const lengthErrorId = useId();
  const overLimit = value.length > maxLength;
  const hasError = invalid || overLimit;
  const describedBy = [errorId, overLimit ? lengthErrorId : undefined].filter(Boolean).join(" ") || undefined;
  const initialBlocks = () => { const parsed = parseDescription(value); return parsed.length ? parsed : [{ type: "paragraph" as const, text: "" }]; };
  const [draftBlocks, setDraftBlocks] = useState<TextBlock[]>(initialBlocks);
  const [emittedValue, setEmittedValue] = useState(value);
  if (value !== emittedValue) {
    setEmittedValue(value);
    const parsed = parseDescription(value);
    setDraftBlocks(parsed.length ? parsed : [{ type: "paragraph", text: "" }]);
  }
  function update(next: TextBlock[]) {
    const text = serializeDescription(next);
    setDraftBlocks(next); setEmittedValue(text); onChange(text);
  }
  return <div className={styles.descriptionEditor} role="group" aria-label={fieldName} data-validation-error={hasError || undefined} tabIndex={-1}>
    <div className={styles.descriptionEditorToolbar}>
      <Button variant="utility" type="button" onClick={() => update([...draftBlocks, { type: "paragraph", text: "" }])}>Добавить абзац</Button>
      <Button variant="utility" type="button" onClick={() => update([...draftBlocks, { type: "square", items: [""] }])}>▪ Добавить список</Button>
    </div>
    <div className={styles.descriptionEditorFields}>
    {draftBlocks.map((block, index) => <div key={index} className={styles.descriptionEditorBlock}>
      <div className={styles.descriptionBlockHeading}>
        <span>{block.type === "paragraph" ? "Абзац" : "Список"}</span>
        <Button variant="utility" type="button" aria-label={`Удалить блок ${index + 1}`} onClick={() => update(draftBlocks.filter((_, i) => i !== index))}>Удалить</Button>
      </div>
      {block.type === "paragraph" ? <textarea aria-label={`Абзац ${index + 1}`} aria-invalid={hasError || undefined} aria-describedby={describedBy}
        rows={4} className={styles.textarea} value={block.text} onChange={event => update(draftBlocks.map((item,i) => i === index ? {type:"paragraph",text:event.target.value} : item))} /> : <>
        <div className={styles.descriptionItems}>
          {block.items.map((text, itemIndex) => <div key={itemIndex} className={styles.descriptionItemRow}>
            <span aria-hidden="true">{block.type === "ol" ? itemIndex + 1 : block.type === "dash" ? "—" : "▪"}</span>
            <input className={styles.input} aria-label={`Пункт ${itemIndex + 1} списка ${index + 1}`} aria-invalid={hasError || undefined} aria-describedby={describedBy} value={text}
              onChange={event => update(draftBlocks.map((item,i) => i === index ? {...block, items:block.items.map((t,j) => j === itemIndex ? event.target.value : t)} : item))} />
            <Button variant="utility" type="button" disabled={itemIndex === 0} aria-label={`Поднять пункт ${itemIndex + 1}`} onClick={() => {
              const items=[...block.items]; [items[itemIndex-1],items[itemIndex]]=[items[itemIndex],items[itemIndex-1]];
              update(draftBlocks.map((item,i) => i === index ? {...block,items} : item));
            }}>↑</Button>
            <Button variant="utility" type="button" disabled={itemIndex === block.items.length - 1} aria-label={`Опустить пункт ${itemIndex + 1}`} onClick={() => { const items=[...block.items]; [items[itemIndex],items[itemIndex+1]]=[items[itemIndex+1],items[itemIndex]]; update(draftBlocks.map((item,i)=>i === index ? {...block,items} : item)); }}>↓</Button>
            <Button variant="utility" type="button" aria-label={`Удалить пункт ${itemIndex + 1}`} onClick={() => update(draftBlocks.map((item,i) => i === index ? {...block,items:block.items.filter((_,j)=>j !== itemIndex)} : item))}>×</Button>
          </div>)}
        </div>
        <Button variant="utility" type="button" className={styles.descriptionAddItem} onClick={() => update(draftBlocks.map((item,i) => i === index ? {...block,items:[...block.items,""]} : item))}>Добавить пункт</Button>
      </>}
    </div>)}
    <span className={styles.descriptionCharacterCount}>{value.length} / {maxLength}</span>
    </div>
    {overLimit && <p className="fieldError" role="alert" id={lengthErrorId}>{fieldName} превышает лимит на {value.length - maxLength} символов. Сократите текст перед сохранением.</p>}
    <details className={styles.descriptionPreview}><summary>Предпросмотр в карточке товара</summary><ProductDescriptionText text={value} fallback={emptyText} /></details>
  </div>;
}
