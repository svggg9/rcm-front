"use client";

import { useId, useState } from "react";
import { Button } from "../../../../../components/ui/Button";
import { DesignSystemIcon } from "../../../../../components/ui/DesignSystemIcon";
import { parseDescription, serializeDescription, type TextBlock } from "../../../../../lib/productDescription";
import { ProductDescriptionText } from "../../../../../product/[id]/components/ProductDescriptionText";
import styles from "../ProductEditPage.module.css";
import controls from "./ProductDescriptionEditor.module.css";

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
    <div className={controls.toolbar}>
      <Button variant="secondary" type="button" className={controls.action} reserveLabelSpace={false}
        onClick={() => update([...draftBlocks, { type: "paragraph", text: "" }])}>
        <DesignSystemIcon name="plus" role="utility" />Добавить абзац
      </Button>
      <Button variant="secondary" type="button" className={controls.action} reserveLabelSpace={false}
        onClick={() => update([...draftBlocks, { type: "square", items: [""] }])}>
        <DesignSystemIcon name="list" role="utility" />Добавить список
      </Button>
    </div>
    <div className={styles.descriptionEditorFields}>
    {draftBlocks.map((block, index) => <div key={index} className={styles.descriptionEditorBlock}>
      <div className={styles.descriptionBlockHeading}>
        <span>{block.type === "paragraph" ? "Абзац" : "Список"}</span>
        <Button variant="ghost" type="button" className={controls.action} reserveLabelSpace={false}
          aria-label={`Удалить блок ${index + 1}`} onClick={() => update(draftBlocks.filter((_, i) => i !== index))}>
          <DesignSystemIcon name="trash" role="utility" />Удалить
        </Button>
      </div>
      {block.type === "paragraph" ? <textarea aria-label={`Абзац ${index + 1}`} aria-invalid={hasError || undefined} aria-describedby={describedBy}
        rows={4} className={styles.textarea} value={block.text} onChange={event => update(draftBlocks.map((item,i) => i === index ? {type:"paragraph",text:event.target.value} : item))} /> : <>
        <div className={styles.descriptionItems}>
          {block.items.map((text, itemIndex) => <div key={itemIndex} className={controls.itemRow}>
            <span className={controls.marker} aria-hidden="true">{block.type === "ol" ? itemIndex + 1 : block.type === "dash" ? "—" : "▪"}</span>
            <input className={styles.input} aria-label={`Пункт ${itemIndex + 1} списка ${index + 1}`} aria-invalid={hasError || undefined} aria-describedby={describedBy} value={text}
              onChange={event => update(draftBlocks.map((item,i) => i === index ? {...block, items:block.items.map((t,j) => j === itemIndex ? event.target.value : t)} : item))} />
            <div className={controls.itemActions}>
            <Button variant="ghost" type="button" className={controls.iconAction} disabled={itemIndex === 0}
              title="Поднять пункт" aria-label={`Поднять пункт ${itemIndex + 1}`} onClick={() => {
              const items=[...block.items]; [items[itemIndex-1],items[itemIndex]]=[items[itemIndex],items[itemIndex-1]];
              update(draftBlocks.map((item,i) => i === index ? {...block,items} : item));
            }}><DesignSystemIcon name="chevron-up" role="utility" /></Button>
            <Button variant="ghost" type="button" className={controls.iconAction} disabled={itemIndex === block.items.length - 1}
              title="Опустить пункт" aria-label={`Опустить пункт ${itemIndex + 1}`} onClick={() => { const items=[...block.items]; [items[itemIndex],items[itemIndex+1]]=[items[itemIndex+1],items[itemIndex]]; update(draftBlocks.map((item,i)=>i === index ? {...block,items} : item)); }}>
              <DesignSystemIcon name="chevron-down" role="utility" />
            </Button>
            <Button variant="ghost" type="button" className={controls.iconAction} title="Удалить пункт" aria-label={`Удалить пункт ${itemIndex + 1}`}
              onClick={() => update(draftBlocks.map((item,i) => i === index ? {...block,items:block.items.filter((_,j)=>j !== itemIndex)} : item))}>
              <DesignSystemIcon name="trash" role="utility" />
            </Button>
            </div>
          </div>)}
        </div>
        <Button variant="secondary" type="button" className={`${controls.action} ${styles.descriptionAddItem}`} reserveLabelSpace={false}
          onClick={() => update(draftBlocks.map((item,i) => i === index ? {...block,items:[...block.items,""]} : item))}>
          <DesignSystemIcon name="plus" role="utility" />Добавить пункт
        </Button>
      </>}
    </div>)}
    <span className={styles.descriptionCharacterCount}>{value.length} / {maxLength}</span>
    </div>
    {overLimit && <p className="fieldError" role="alert" id={lengthErrorId}>{fieldName} превышает лимит на {value.length - maxLength} символов. Сократите текст перед сохранением.</p>}
    <details className={styles.descriptionPreview}><summary>Предпросмотр в карточке товара</summary><ProductDescriptionText text={value} fallback={emptyText} /></details>
  </div>;
}
