import type { ReactNode } from "react";

type Props = {
  title: string;
  text?: string;
  actions?: ReactNode;
};

export function EmptyState({ title, text, actions }: Props) {
  return (
    <div className="emptyStateLarge">
      <div className="emptyStateTitle">{title}</div>
      {text ? <div className="emptyStateText">{text}</div> : null}
      {actions ? <div className="mt20">{actions}</div> : null}
    </div>
  );
}