import styles from "../ProductEditPage.module.css";

type Props = {
  label: string;
  value: number | "";
  onChange: (value: number | "") => void;
  step?: string;
};

export function NumberField({ label, value, onChange, step = "1" }: Props) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(event) =>
          onChange(event.target.value === "" ? "" : Number(event.target.value))
        }
        className={styles.input}
      />
    </label>
  );
}