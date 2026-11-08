"use client";

import { useState, type ReactNode } from "react";
import { Textarea } from "../../../../../components/ui/Textarea";
import { TextInput } from "../../../../../components/ui/TextInput";
import { ProductDescriptionEditor } from "./ProductDescriptionEditor";
import { PRODUCT_DETAILS_FIELDS, productMeasurementHint, type ProductDetailsDraft } from "../../../../../lib/productDetails";
import styles from "../ProductEditPage.module.css";

type Errors = Partial<Record<keyof ProductDetailsDraft, string>>;

function OptionalSection({ title, filled, invalid = false, children }: {
  title: string; filled: boolean; invalid?: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(filled);
  return <details className={`${styles.fieldFull} ${styles.optionalSection}`} open={open || invalid}
    onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>{title}</summary>
    {children}
  </details>;
}

export function ProductOptionalDetails({ composition, details, category, compositionError, errors,
  onCompositionChange, onChange }: {
  composition: string; details: ProductDetailsDraft; category: string;
  compositionError?: boolean; errors: Errors;
  onCompositionChange: (value: string) => void;
  onChange: (key: keyof ProductDetailsDraft, value: string) => void;
}) {
  return <>
    <p className={`${styles.optionalDetailsHint} textHint`}>Дополнительные сведения — заполните подходящие вашему товару поля</p>
    <OptionalSection title="Состав" filled={Boolean(composition.trim())} invalid={compositionError}>
      <ProductDescriptionEditor value={composition} onChange={onCompositionChange} fieldName="Состав"
        maxLength={1000} invalid={compositionError} />
      {compositionError && <span className="fieldError">Не больше 1000 символов</span>}
    </OptionalSection>
    {PRODUCT_DETAILS_FIELDS.map(({ key, label, limit }) => <OptionalSection key={key} title={label}
      filled={Boolean(details[key].trim())} invalid={Boolean(errors[key])}>
      {key === "cityOfOrigin" ? <TextInput label={label} hideLabel value={details[key]}
        maxLength={Math.max(limit, details[key].length)} placeholder="Например, Россия"
        error={errors[key]} onChange={event => onChange(key, event.target.value)} />
        : <Textarea label={label} hideLabel value={details[key]} rows={key === "features" ? 5 : 4}
          maxLength={Math.max(limit, details[key].length)} error={errors[key]}
          hint={key === "features" ? "Каждая особенность с новой строки" : key === "measurements"
            ? productMeasurementHint(category) : "Рекомендации по стирке, чистке и хранению"}
          placeholder={key === "features" ? "Посадка, застёжка, карманы, отделка" : key === "measurements"
            ? "Размер образца и замеры самого изделия" : "Укажите подходящие рекомендации"}
          onChange={event => onChange(key, event.target.value)} />}
    </OptionalSection>)}
  </>;
}
