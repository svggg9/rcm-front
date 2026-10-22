import type { ReactNode } from "react";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { Icon } from "./Icon";
import styles from "./RequestError.module.css";

type Props = {
  message: string;
  text?: ReactNode;
  variant?: "section" | "inline";
  onRetry?: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  secondaryAction?: ReactNode;
};

/** Message is already safe UI copy; transport details are handled by apiErrors. */
export function RequestError({ message, text, variant = "section", onRetry, loading = false, disabled, secondaryAction }: Props) {
  const retry = onRetry ? <Button variant="primary" className="feedbackAction" loading={loading} disabled={disabled}
    onClick={() => void onRetry()}>Повторить</Button> : null;
  if (variant === "inline") return <div className={styles.inline} role="alert" aria-busy={loading || undefined}>
    <Icon name="alert" size={20} className={styles.icon} />
    <div className={styles.content}><p>{message}</p>{text ? <div className={styles.text}>{text}</div> : null}
      {retry || secondaryAction ? <div className={styles.actions}>{retry}{secondaryAction}</div> : null}
    </div>
  </div>;
  return <div role="alert" aria-busy={loading || undefined}>
    <EmptyState tone="danger" title={message} text={text} actions={retry || secondaryAction ? <>{retry}{secondaryAction}</> : undefined} />
  </div>;
}
