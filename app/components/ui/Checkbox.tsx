import type { ComponentPropsWithRef } from "react";
import styles from "./ChoiceInput.module.css";

type Props = Omit<ComponentPropsWithRef<"input">, "type" | "size"> & {
  size?: 16 | 17 | 18 | 20;
  appearance?: "control" | "hidden";
};

/** Native checkbox semantics, form behavior and refs (including indeterminate) stay intact. */
export function Checkbox({ size = 20, appearance = "control", className = "", ...props }: Props) {
  return <input {...props} type="checkbox" data-ui="checkbox" data-size={size}
    className={`${styles.checkbox} ${appearance === "hidden" ? styles.hidden : ""} ${className}`.trim()} />;
}
