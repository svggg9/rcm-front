import styles from "./ChoiceMark.module.css";
import { Icon } from "./Icon";

type Props = {
  checked: boolean;
  appearance?: "filled" | "outline-check";
};

export function ChoiceMark({ checked, appearance = "filled" }: Props) {
  return (
    <span
      className={styles.mark}
      aria-hidden="true"
      data-checked={checked}
      data-appearance={appearance}
    >
      {checked && appearance === "outline-check" ? (
        <Icon name="check" size={12} strokeWidth={2.2} />
      ) : checked ? (
        <svg viewBox="0 0 16 16" focusable="false">
          <path d="M4.8 6.8 8 10 11.2 6.8" />
        </svg>
      ) : null}
    </span>
  );
}
