import styles from "../ProductEditPage.module.css";

type Props = {
  label: string;
  value: number | "";
  invalid?: boolean;
  onChange: (value: number | "") => void;
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function NumberField({
  label,
  value,
  invalid = false,
  onChange,
}: Props) {
  return (
    <label className={styles.field}>
      <span className={styles.required}>{label}</span>

      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(event) => {
          const nextValue = digitsOnly(event.target.value);
          onChange(nextValue === "" ? "" : Number(nextValue));
        }}
        className={`${styles.input} ${
          invalid ? styles.inputInvalid : ""
        } ${value === "" ? styles.requiredEmpty : ""}`}
      />
    </label>
  );
}
