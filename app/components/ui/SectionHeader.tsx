import type { ReactNode } from "react";

type Props = {
  title: string;
  hint?: string;
  actions?: ReactNode;
  large?: boolean;
  className?: string;
};

export function SectionHeader({ title, hint, actions, large = false, className = "" }: Props) {
  return (
    <div className={`${actions ? "sectionHeaderRow" : "sectionHeader"} ${className}`.trim()}>
      <div>
        <h1 className={large ? "sectionTitleLarge" : "sectionTitle"}>
          {title}
        </h1>

        {hint ? <p className="sectionHint">{hint}</p> : null}
      </div>

      {actions}
    </div>
  );
}
