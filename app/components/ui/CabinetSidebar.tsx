import Link from "next/link";
import type { ReactNode } from "react";

type SidebarItem = {
  href: string;
  label: string;
  active?: boolean;
  count?: number;
};

type Props = {
  title?: string;
  subtitle?: string;
  items: SidebarItem[];
  footer?: ReactNode;
};

export function CabinetSidebar({ title, subtitle, items, footer }: Props) {
  return (
    <aside className="stickyTop stack24">
      {title || subtitle ? (
        <div className="borderBottom pb18">
          {subtitle ? <div className="uppercaseLabel mb8">{subtitle}</div> : null}
          {title ? <strong>{title}</strong> : null}
        </div>
      ) : null}

      <nav className="sidebarNav">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebarNavItem ${
              item.active ? "sidebarNavItemActive" : ""
            }`}
          >
            <span>{item.label}</span>
            {typeof item.count === "number" ? (
              <span className="sidebarNavCount">{item.count}</span>
            ) : null}
          </Link>
        ))}
      </nav>

      {footer}
    </aside>
  );
}