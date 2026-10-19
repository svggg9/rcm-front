import type { HTMLAttributes, ReactNode } from "react";
import { DesignSystemIcon } from "./DesignSystemIcon";
import type { IconName } from "./Icon";
import styles from "./Banner.module.css";

export type BannerTone = "info" | "warning" | "success" | "danger";

const tones: Record<BannerTone, { className: string; icon: IconName }> = {
  info: { className: "alert", icon: "info" },
  warning: { className: "alertWarning", icon: "alert" },
  success: { className: "alertSuccess", icon: "check-circle" },
  danger: { className: "alertDanger", icon: "alert" },
};

type Props = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  children: ReactNode;
  tone?: BannerTone;
  title?: ReactNode;
  titleAs?: "strong" | "h2" | "h3";
  icon?: IconName;
  actions?: ReactNode;
};

export function Banner({ children, tone = "info", title, titleAs: Title = "strong", icon,
  actions, className = "", role, ...props }: Props) {
  const variant = tones[tone];
  return <div {...props} className={`${variant.className} ${styles.banner} ${className}`.trim()}
    data-tone={tone} role={role ?? (tone === "danger" ? "alert" : "note")}>
    <DesignSystemIcon name={icon ?? variant.icon} role="utility" className={styles.icon} />
    <div className={styles.content}>
      {title ? <Title className={styles.title}>{title}</Title> : null}
      <div className={styles.body}>{children}</div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  </div>;
}
