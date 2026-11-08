export type TextEditorFormat = "heading" | "list";

type FormattingResult = { value: string; selectionStart: number; selectionEnd: number };

/** Format whole selected lines while keeping the caret/selection on their content. */
export function toggleTextEditorFormat(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  format: TextEditorFormat,
  maxLength: number,
): FormattingResult | null {
  const start = Math.max(0, Math.min(selectionStart, value.length));
  const end = Math.max(start, Math.min(selectionEnd, value.length));
  const lineStart = start === 0 ? 0 : value.lastIndexOf("\n", start - 1) + 1;
  // A selection ending just after a newline does not include the next line.
  const lastSelected = end > start && value[end - 1] === "\n" ? end - 1 : end;
  const nextNewline = value.indexOf("\n", lastSelected);
  const lineEnd = nextNewline < 0 ? value.length : nextNewline;
  const lines = value.slice(lineStart, lineEnd).split("\n");
  const ownMarker = format === "heading" ? /^###[ \t]*(?:\r)?$/ : /^▪[ \t]*(?:\r)?$/;
  const ownContent = format === "heading" ? /^###[ \t]+/ : /^▪[ \t]*/;
  const active = lines.filter(line => lines.length === 1 || line.trim());
  const remove = active.length > 0 && active.every(line => ownMarker.test(line.trimStart()) || ownContent.test(line.trimStart()));
  const marker = remove ? "" : format === "heading" ? "### " : "▪ ";
  const previousMarker = /^(?:###(?:[ \t]+|$)|[▪•*—-][ \t]*|\d+[.)][ \t]+)/;
  const edits: { start: number; removed: number; inserted: string }[] = [];
  let at = lineStart;
  for (const line of lines) {
    if (lines.length === 1 || line.trim()) {
      const indentation = line.match(/^[ \t]*/)?.[0].length ?? 0;
      let content = line.slice(indentation);
      let match: RegExpMatchArray | null;
      while ((match = content.match(previousMarker))) content = content.slice(match[0].length);
      edits.push({ start: at + indentation, removed: line.length - indentation - content.length, inserted: marker });
    }
    at += line.length + 1;
  }
  let next = value;
  for (const edit of [...edits].reverse()) next = next.slice(0, edit.start) + edit.inserted + next.slice(edit.start + edit.removed);
  if (next === value || (next.length > maxLength && next.length >= value.length)) return null;
  function shift(position: number) {
    let difference = 0;
    for (const edit of edits) {
      if (position < edit.start) break;
      if (position <= edit.start + edit.removed) return edit.start + difference + edit.inserted.length;
      difference += edit.inserted.length - edit.removed;
    }
    return position + difference;
  }
  return { value: next, selectionStart: shift(start), selectionEnd: shift(end) };
}
