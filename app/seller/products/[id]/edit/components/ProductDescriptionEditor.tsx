"use client";

import { useState } from "react";
import { parseDescription, serializeDescription, type TextBlock } from "../../../../../lib/productDescription";
import { ProductDescriptionText } from "../../../../../product/[id]/components/ProductDescriptionText";
import styles from "../ProductEditPage.module.css";

type Props = { value: string; onChange: (value: string) => void; invalid?: boolean; errorId?: string };
export function ProductDescriptionEditor({ value, onChange, invalid, errorId }: Props) {
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
  return <div className={styles.descriptionEditor} data-validation-error={invalid || value.length > 2000 || undefined} tabIndex={-1}>
    <div className={styles.descriptionEditorToolbar}>
      <button type="button" onClick={() => update([...draftBlocks, { type: "paragraph", text: "" }])}>Добавить абзац</button>
      <button type="button" onClick={() => update([...draftBlocks, { type: "square", items: [""] }])}>▪ Добавить список</button>
    </div>
    {draftBlocks.map((block, index) => <div key={index} className={styles.descriptionEditorBlock}>
      <div className={styles.descriptionBlockHeading}>
        <span>{block.type === "paragraph" ? "Абзац" : "Список"}</span>
        <button type="button" aria-label={`Удалить блок ${index + 1}`} onClick={() => update(draftBlocks.filter((_, i) => i !== index))}>Удалить</button>
      </div>
      {block.type === "paragraph" ? <textarea aria-label={`Абзац ${index + 1}`} aria-invalid={invalid || undefined} aria-describedby={errorId}
        rows={4} className={styles.textarea} value={block.text} onChange={event => update(draftBlocks.map((item,i) => i === index ? {type:"paragraph",text:event.target.value} : item))} /> : <>
        <div className={styles.descriptionItems}>
          {block.items.map((text, itemIndex) => <div key={itemIndex} className={styles.descriptionItemRow}>
            <span aria-hidden="true">{block.type === "ol" ? itemIndex + 1 : block.type === "dash" ? "—" : "▪"}</span>
            <input className={styles.input} aria-label={`Пункт ${itemIndex + 1} списка ${index + 1}`} value={text}
              onChange={event => update(draftBlocks.map((item,i) => i === index ? {...block, items:block.items.map((t,j) => j === itemIndex ? event.target.value : t)} : item))} />
            <button type="button" disabled={itemIndex === 0} aria-label={`Поднять пункт ${itemIndex + 1}`} onClick={() => {
              const items=[...block.items]; [items[itemIndex-1],items[itemIndex]]=[items[itemIndex],items[itemIndex-1]];
              update(draftBlocks.map((item,i) => i === index ? {...block,items} : item));
            }}>↑</button>
            <button type="button" disabled={itemIndex === block.items.length - 1} aria-label={`Опустить пункт ${itemIndex + 1}`} onClick={() => { const items=[...block.items]; [items[itemIndex],items[itemIndex+1]]=[items[itemIndex+1],items[itemIndex]]; update(draftBlocks.map((item,i)=>i === index ? {...block,items} : item)); }}>↓</button>
            <button type="button" aria-label={`Удалить пункт ${itemIndex + 1}`} onClick={() => update(draftBlocks.map((item,i) => i === index ? {...block,items:block.items.filter((_,j)=>j !== itemIndex)} : item))}>×</button>
          </div>)}
        </div>
        <button type="button" className={styles.descriptionAddItem} onClick={() => update(draftBlocks.map((item,i) => i === index ? {...block,items:[...block.items,""]} : item))}>Добавить пункт</button>
      </>}
    </div>)}
    {value.length > 2000 && <p className="fieldError" role="alert">Описание превышает лимит на {value.length - 2000} символов. Сократите текст перед сохранением.</p>}
    <span className={styles.descriptionCharacterCount}>{value.length} / 2000</span>
    <details className={styles.descriptionPreview}><summary>Предпросмотр в карточке товара</summary><ProductDescriptionText text={value} fallback="Описание пока пустое" /></details>
  </div>;
}
