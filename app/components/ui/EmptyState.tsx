import type { ReactNode } from "react";

import { Icon, type IconName } from "./Icon";

type Props = {
  title: string;
  text?: ReactNode;
  actions?: ReactNode;
  /** Only failure states display an icon; empty lists use text and an action. */
  icon?: IconName;
  tone?: "default" | "gold" | "danger";
};

export function EmptyState({
  title,
  text,
  actions,
  icon,
  tone = "default",
}: Props) {
  return (
    <div className="emptyStateLarge" data-tone={tone}>
      {tone === "danger" ? <div className="emptyStateIcon" aria-hidden="true">
        <Icon name={icon ?? "alert"} size={24} />
      </div> : null}
      <h2 className="emptyStateTitle">{title}</h2>
      {text ? <div className="emptyStateText">{text}</div> : null}
      {actions ? <div className="emptyStateActions">{actions}</div> : null}
    </div>
  );
}
