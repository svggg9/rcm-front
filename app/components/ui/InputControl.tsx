"use client";

import type { ComponentPropsWithRef, ChangeEvent } from "react";
import { insertInputText, removeInputWhitespace, resolveInputSpacePolicy, stripInputWhitespace,
  type InputSpacePolicy } from "../../lib/inputWhitespace";

export type InputControlProps = ComponentPropsWithRef<"input"> & { spacePolicy?: InputSpacePolicy };

/** Shared native input behavior; visual fields keep their existing wrappers. */
export function InputControl({ spacePolicy = "auto", onChange, onKeyDown, onBeforeInput, onPaste,
  onCompositionEnd, ...props }: InputControlProps) {
  const policy = resolveInputSpacePolicy({ spacePolicy, type: props.type, inputMode: props.inputMode, autoComplete: props.autoComplete });
  const strictText = props.type === "email" || props.type === "url";
  const restricted = policy !== "allow" && !props.readOnly && !props.disabled;
  function change(event: ChangeEvent<HTMLInputElement>) {
    if (restricted && policy === "remove" && !(event.nativeEvent as InputEvent).isComposing) removeInputWhitespace(event.currentTarget);
    onChange?.(event);
  }
  return <input {...props}
    autoCapitalize={props.autoCapitalize ?? (strictText ? "none" : undefined)}
    autoCorrect={props.autoCorrect ?? (strictText ? "off" : undefined)}
    spellCheck={props.spellCheck ?? (strictText ? false : undefined)}
    onChange={change}
    onKeyDown={event => {
      onKeyDown?.(event);
      if (restricted && !event.defaultPrevented && !event.ctrlKey && !event.metaKey && !event.altKey &&
        !event.nativeEvent.isComposing && event.key.length === 1 && !stripInputWhitespace(event.key)) event.preventDefault();
    }}
    onBeforeInput={event => {
      onBeforeInput?.(event);
      const native = event.nativeEvent as InputEvent;
      if (restricted && !event.defaultPrevented && !native.isComposing && native.data && !stripInputWhitespace(native.data)) event.preventDefault();
    }}
    onPaste={event => {
      onPaste?.(event);
      if (!restricted || event.defaultPrevented) return;
      const raw = event.clipboardData.getData("text");
      const clean = stripInputWhitespace(raw);
      if (clean === raw) return;
      event.preventDefault();
      if (clean) insertInputText(event.currentTarget, clean);
    }}
    onCompositionEnd={event => {
      onCompositionEnd?.(event);
      if (!restricted || policy !== "remove") return;
      const input = event.currentTarget;
      if (stripInputWhitespace(input.value) !== input.value) {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const raw = input.value;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        setter?.call(input, stripInputWhitespace(raw));
        if (start !== null && end !== null) input.setSelectionRange(stripInputWhitespace(raw.slice(0, start)).length, stripInputWhitespace(raw.slice(0, end)).length);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }} />;
}
