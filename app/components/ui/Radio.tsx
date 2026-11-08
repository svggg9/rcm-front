import type { ComponentPropsWithRef } from "react";
import styles from "./ChoiceInput.module.css";

type Props = Omit<ComponentPropsWithRef<"input">, "type" | "size"> & { size?: 16 | 17 | 18 | 20 };

export function Radio({ size = 18, className = "", ...props }: Props) {
  return <input {...props} type="radio" data-ui="radio" data-size={size}
    className={`${styles.radio} ${className}`.trim()} />;
}
