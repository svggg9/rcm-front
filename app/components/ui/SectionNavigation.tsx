"use client";

import { useEffect, useRef } from "react";
import styles from "./SectionNavigation.module.css";

export type SectionNavigationGroup = {
  title: string;
  links: readonly (readonly [id: string, label: string])[];
};

export function SectionNavigation({ groups, activeSection, onNavigate, ariaLabel }: {
  groups: readonly SectionNavigationGroup[];
  activeSection: string;
  onNavigate?: (id: string) => void;
  ariaLabel: string;
}) {
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || nav.scrollWidth <= nav.clientWidth) return;
    const active = nav.querySelector<HTMLElement>('[aria-current="location"]');
    if (!active) return;
    const bounds = nav.getBoundingClientRect();
    const item = active.getBoundingClientRect();
    if (item.left < bounds.left) nav.scrollLeft -= bounds.left - item.left;
    else if (item.right > bounds.right) nav.scrollLeft += item.right - bounds.right;
  }, [activeSection]);

  return <aside className={styles.sidebar}>
    <nav ref={navRef} className={styles.navigation} aria-label={ariaLabel}>
      <p className={styles.title}>Разделы</p>
      <div className={styles.groups}>
        {groups.map(group => <div className={styles.group} key={group.title}>
          <p className={styles.groupTitle}>{group.title}</p>
          <ul>{group.links.map(([id, label]) => <li key={id}>
            <a href={`#${id}`} aria-current={activeSection === id ? "location" : undefined}
              onClick={() => onNavigate?.(id)}>{label}</a>
          </li>)}</ul>
        </div>)}
      </div>
    </nav>
  </aside>;
}
