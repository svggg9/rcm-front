"use client";

import { NumericInput, type NumericInputProps } from "../../../../../components/ui/NumericInput";
import { INTEGER_RULES, MONEY_RULES, parseNumericInput } from "../../../../../lib/numericInput";

export function parseVariantNumber(raw: string, integer = false): number | null {
  return parseNumericInput(raw, integer ? INTEGER_RULES : MONEY_RULES);
}

export function VariantNumberInput({ value, integer = false, onValue, ...props }:
  Omit<NumericInputProps, "value" | "onChange" | "onValueChange"> & {
    value: number | null; integer?: boolean; onValue: (value: number | null) => void;
  }) {
  return <NumericInput {...props} {...(integer ? INTEGER_RULES : MONEY_RULES)}
    value={value} emptyZero={!integer} onValueChange={onValue} />;
}
