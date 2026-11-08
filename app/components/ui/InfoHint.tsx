"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "./Button";
import { DesignSystemIcon } from "./DesignSystemIcon";
import { PopoverPanel } from "./PopoverPanel";
import styles from "./InfoHint.module.css";

export function InfoHint({ label, text, className = "" }: { label: string; text: string; className?: string }) {
  const id = useId();
  const anchor = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const open = hovered || focused || pinned;
  function cancelClose() { if (closeTimer.current !== null) clearTimeout(closeTimer.current); closeTimer.current = null; }
  function close() { cancelClose(); setHovered(false); setFocused(false); setPinned(false); }
  useEffect(() => () => { if (closeTimer.current !== null) clearTimeout(closeTimer.current); }, []);
  return <div className={`${styles.root} ${className}`}
    onFocus={() => setFocused(true)}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
    onPointerEnter={event => { if (event.pointerType === "mouse") { cancelClose(); setHovered(true); } }}
    onPointerLeave={event => { if (event.pointerType === "mouse") { cancelClose(); closeTimer.current = setTimeout(() => setHovered(false), 150); } }}>
    <Button ref={anchor} type="button" variant="ghost" iconOnly className={styles.trigger} aria-label={label}
      aria-expanded={open} aria-controls={id} aria-describedby={open ? id : undefined} onClick={() => { if (pinned) close(); else setPinned(true); }}>
      <DesignSystemIcon name="info" role="utility" />
    </Button>
    <PopoverPanel id={id} title={label} variant="hint" anchorRef={anchor} open={open} focusOnOpen={false} onClose={close}>
      <p>{text}</p>
    </PopoverPanel>
  </div>;
}
