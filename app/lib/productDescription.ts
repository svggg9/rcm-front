export type TextBlock =
  | { type: "paragraph"; text: string }
  | { type: "ul" | "ol" | "dash" | "square"; items: string[] };

export function parseDescription(value: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  let paragraph: string[] = [];
  let listType: "ul" | "ol" | "dash" | "square" | null = null;
  let listItems: string[] = [];

  function flushParagraph() {
    const text = paragraph.join("\n").trim();

    if (text) {
      blocks.push({ type: "paragraph", text });
    }

    paragraph = [];
  }

  function flushList() {
    if (listType && listItems.length > 0) {
      blocks.push({ type: listType, items: listItems });
    }

    listType = null;
    listItems = [];
  }

  const normalizedValue = value.replace(/\s+•\s*/g, "\n• ");

  for (const rawLine of normalizedValue.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const squareMatch = line.match(/^▪\s*(.*)$/);
    const bulletMatch = line.match(/^[-*•]\s*(.+)$/);
    const dashMatch = line.match(/^—\s*(.+)$/);
    const orderedMatch = line.match(/^\d+[.)]\s+(.+)$/);

    if (squareMatch || bulletMatch || dashMatch || orderedMatch) {
      flushParagraph();

      const nextType = squareMatch ? "square" : bulletMatch ? "ul" : dashMatch ? "dash" : "ol";
      const itemText = (
        squareMatch?.[1] ?? bulletMatch?.[1] ?? dashMatch?.[1] ?? orderedMatch?.[1] ?? ""
      ).trim();

      if (listType && listType !== nextType) {
        flushList();
      }

      listType = nextType;

      if (itemText) {
        listItems.push(itemText);
      }

      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}


export function serializeDescription(blocks: TextBlock[]): string {
 return blocks.map(block=>block.type === "paragraph" ? block.text.trim() : block.items.filter(item=>item.trim()).map((item,i)=>`${block.type === "square" ? "▪" : block.type === "ol" ? `${i+1}.` : block.type === "dash" ? "—" : "•"} ${item.trim()}`).join("\n")).filter(Boolean).join("\n\n");
}
export function hasDescriptionContent(value: string): boolean { return parseDescription(value).some(b=>b.type === "paragraph" ? Boolean(b.text.replace(/^[▪•*—-]\s*$/gm, "").trim()) : b.items.some(t=>t.trim())); }
