"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";
import { FormSelect } from "../../components/ui/FormSelect";
import { TextInput } from "../../components/ui/TextInput";
import { Textarea } from "../../components/ui/Textarea";
import { scrollToFirstValidationError } from "../../lib/formValidation";
import type { SellerReturnListItem, inspectSellerReturn } from "../../lib/returns";
import styles from "./SellerReturnsTab.module.css";

type Inspection = Parameters<typeof inspectSellerReturn>[1];
type Props = {
  request: SellerReturnListItem;
  loading: boolean;
  disabled: boolean;
  onInspect: (values: Inspection) => Promise<void>;
};

export function parseInspectionAmount(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null; // An empty amount is not an explicit zero refund.
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export function ReturnInspectionForm({ request, loading, disabled, onInspect }: Props) {
  const [amount, setAmount] = useState(String(request.approvedRefundAmount ?? request.requestedAmount ?? ""));
  const [comment, setComment] = useState(request.sellerComment ?? "");
  const [resellable, setResellable] = useState(request.resellable ?? true);
  const [amountError, setAmountError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inFlight = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || loading || inFlight.current) return;
    const parsed = parseInspectionAmount(amount);
    if (parsed === null) {
      setAmountError("Укажите корректную сумму возврата");
      scrollToFirstValidationError({ root: formRef.current });
      return;
    }
    setAmountError(null);
    inFlight.current = true;
    try {
      await onInspect({ resellable, acceptedRefundAmount: parsed, comment });
    } finally {
      inFlight.current = false;
    }
  }

  return <form ref={formRef} className={styles.inspection} noValidate onSubmit={submit}
    aria-label={`Проверка возврата №${request.id}`}>
    <FormSelect<"yes" | "no">
      label="Состояние товара" value={resellable ? "yes" : "no"} disabled={disabled || loading}
      options={[{ value: "yes", label: "Можно вернуть в продажу" }, { value: "no", label: "Нельзя вернуть в продажу" }]}
      onChange={value => setResellable(value === "yes")} />
    <TextInput label="Сумма к возврату" inputMode="decimal" value={amount}
      disabled={disabled || loading} error={amountError}
      onChange={event => { setAmount(event.target.value); setAmountError(null); }} />
    <div className={styles.fullWidth}>
      <Textarea label="Комментарий по проверке" maxLength={1000} value={comment}
        disabled={disabled || loading} onChange={event => setComment(event.target.value)} />
    </div>
    <div className={`${styles.actions} ${styles.fullWidth}`}>
      <Button type="submit" variant="primary" loading={loading} disabled={disabled}>
        Завершить проверку
      </Button>
    </div>
  </form>;
}
