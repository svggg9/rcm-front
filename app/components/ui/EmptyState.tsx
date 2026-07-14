import type { ReactNode } from "react";

import { Icon, type IconName } from "./Icon";

type Props = {
  title: string;
  text?: string;
  actions?: ReactNode;
  icon?: IconName;
  tone?: "default" | "gold" | "danger";
};

export function EmptyState({
  title,
  text,
  actions,
  icon = "info",
  tone = "default",
}: Props) {
  return (
    <div className="emptyStateLarge" data-tone={tone}>
      <div className="emptyStateIcon" aria-hidden="true">
        <Icon name={icon} size={26} />
      </div>
      <div className="emptyStateTitle">{title}</div>
      {text ? <div className="emptyStateText">{text}</div> : null}
      {actions ? <div className="mt20">{actions}</div> : null}
    </div>
  );
}
