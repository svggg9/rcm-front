import styles from "./ChoiceMark.module.css";

type Props = {
  checked: boolean;
};

export function ChoiceMark({ checked }: Props) {
  return (
    <span
      className={styles.mark}
      aria-hidden="true"
      data-checked={checked}
    >
      {checked ? (
        <svg viewBox="0 0 16 16" focusable="false">
          <path d="M4.8 6.8 8 10 11.2 6.8" />
        </svg>
      ) : null}
    </span>
  );
}
