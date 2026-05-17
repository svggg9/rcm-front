import type { ReactNode } from "react";

type Props = {
  title: string;
  hint?: string;
  actions?: ReactNode;
  large?: boolean;
};

export function SectionHeader({ title, hint, actions, large = false }: Props) {
  return (
    <div className={actions ? "sectionHeaderRow" : "sectionHeader"}>
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