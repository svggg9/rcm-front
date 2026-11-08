import { useFieldValidation } from "../../../../../lib/useFieldValidation";
import { NumericField } from "../../../../../components/ui/NumericField";
import { INTEGER_RULES, WEIGHT_RULES } from "../../../../../lib/numericInput";

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
  return <NumericField {...(decimal ? WEIGHT_RULES : { ...INTEGER_RULES, min: 1 })}
      label={label} required
      value={value === "" ? null : value} onBlur={() => validation.touch("value")}
      aria-label={label}
      onValueChange={next => { if (externalInvalid) validation.touch("value"); onChange(next ?? ""); }}
      error={invalid ? "Укажите значение больше нуля" : undefined} />;
}
