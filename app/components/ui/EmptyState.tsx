import type { ReactNode } from "react";

import { Icon, type IconName } from "./Icon";

type Props = {
  title: string;
  text?: ReactNode;
  actions?: ReactNode;
  /** Failure icon; empty illustrations are explicitly chosen by the screen. */
  icon?: IconName;
  illustration?: ReactNode;
  tone?: "default" | "gold" | "danger";
};

export function EmptyState({
  title,
  text,
  actions,
  icon,
  illustration,
  tone = "default",
}: Props) {
  return (
    <div className="emptyStateLarge" data-tone={tone} data-illustrated={tone !== "danger" && illustration ? true : undefined}>
      {tone === "danger" ? <div className="emptyStateIcon" aria-hidden="true">
        <Icon name={icon ?? "alert"} size={20} />
      </div> : illustration ? <div className="emptyStateIllustration" aria-hidden="true">{illustration}</div> : null}
      <h2 className="emptyStateTitle">{title}</h2>
      {text ? <div className="emptyStateText">{text}</div> : null}
      {actions ? <div className="emptyStateActions">{actions}</div> : null}
    </div>
  );
}
