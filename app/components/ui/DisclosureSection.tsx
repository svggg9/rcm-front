"use client";

import { useId, type ReactNode } from "react";
import styles from "./DisclosureSection.module.css";

export type DisclosureVariant = "default" | "plain" | "flat" | "grouped" | "separate";
export type DisclosureTitleStyle = "default" | "uppercase-16" | "uppercase-14" | "uppercase-14-medium";

type Props = {
  id?: string;
  title: ReactNode;
  summary?: ReactNode;
  status?: ReactNode;
  statusTone?: "default" | "error";
  variant?: DisclosureVariant;
  titleStyle?: DisclosureTitleStyle;
  animated?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
};

/** A controlled section whose contents stay mounted while closed. */
export function DisclosureSection({ id, title, summary, status, statusTone = "default", variant = "default", titleStyle = "default", animated = false, open, onOpenChange, children, className }: Props) {
  const contentId = useId();
  const classes = [styles.section, variant !== "default" && styles[variant], animated && styles.animated, className].filter(Boolean).join(" ");
  const heading = <>
    <span className={styles.headingText}>
      <span className={[styles.title, titleStyle !== "default" && styles[titleStyle]].filter(Boolean).join(" ")}>{title}</span>
      {summary && <span className={styles.summary}>{summary}</span>}
    </span>
    {status && <span className={`${styles.status} ${statusTone === "error" ? styles.error : ""}`}>{status}</span>}
    <span className={styles.indicator} aria-hidden="true" />
  </>;

  if (animated) return <div id={id} className={classes}>
    <button type="button" className={`${styles.heading} ${styles.headingButton}`} aria-expanded={open} aria-controls={contentId}
      onClick={() => onOpenChange(!open)}>{heading}</button>
    <div id={contentId} className={styles.animatedContent} data-open={open} aria-hidden={!open} inert={!open}>
      <div className={styles.animatedInner}><div className={styles.content}>{children}</div></div>
    </div>
  </div>;

  return <details id={id} className={classes} open={open}
    onToggle={event => {
      if (event.currentTarget.open !== open) onOpenChange(event.currentTarget.open);
    }}>
    <summary className={styles.heading}>{heading}</summary>
    <div className={styles.content}>{children}</div>
  </details>;
}

export function DisclosureGroup({ variant = "default", children }: { variant?: DisclosureVariant; children: ReactNode }) {
  return <div className={styles[`group-${variant}`]}>{children}</div>;
}
