import { useId } from "react";
import { useFieldValidation } from "../../../../../lib/useFieldValidation";
import { NumericInput } from "../../../../../components/ui/NumericInput";
import { INTEGER_RULES, WEIGHT_RULES } from "../../../../../lib/numericInput";
import styles from "../ProductEditPage.module.css";

type Props = {
  label: string;
  value: number | "";
  invalid?: boolean;
  decimal?: boolean;
  onChange: (value: number | "") => void;
};

export function NumberField({ label, value, invalid = false, decimal = false, onChange }: Props) {
  const validation = useFieldValidation({ value }, values => values.value === "" || !Number.isFinite(values.value) || values.value <= 0 ? { value: "Укажите значение больше нуля" } : {});
  const externalInvalid = invalid;
  invalid = invalid || !!validation.errors.value;
  const errorId = useId();
  return <label className={styles.field} data-ui="field">
    <span className={styles.required}>{label}</span>
    <NumericInput {...(decimal ? WEIGHT_RULES : { ...INTEGER_RULES, min: 1 })}
      value={value === "" ? null : value} onBlur={() => validation.touch("value")}
      aria-label={label}
      onValueChange={next => { if (externalInvalid) validation.touch("value"); onChange(next ?? ""); }}
      aria-invalid={invalid || undefined} aria-required="true" aria-describedby={invalid ? errorId : undefined}
      className={[styles.input, invalid ? "inputError" : "", value === "" ? styles.requiredEmpty : ""].join(" ")} />
    {invalid ? <span className="fieldError" id={errorId}>Укажите значение больше нуля</span> : null}
  </label>;
}
