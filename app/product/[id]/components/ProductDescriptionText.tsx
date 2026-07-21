import styles from "../ProductPage.module.css";

type TextBlock =
  | { type: "paragraph"; text: string }
  | { type: "ul" | "ol"; items: string[] };

function parseDescription(value: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  let paragraph: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];

  function flushParagraph() {
    const text = paragraph.join(" ").trim();

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

  for (const rawLine of value.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    const orderedMatch = line.match(/^\d+[.)]\s+(.+)$/);

    if (bulletMatch || orderedMatch) {
      flushParagraph();

      const nextType = bulletMatch ? "ul" : "ol";
      const itemText = (bulletMatch?.[1] ?? orderedMatch?.[1] ?? "").trim();

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

type Props = {
  text: string;
  fallback: string;
};

export function ProductDescriptionText({ text, fallback }: Props) {
  const blocks = parseDescription(text.trim());

  if (blocks.length === 0) {
    return <p className={styles.text}>{fallback}</p>;
  }

  return (
    <div className={styles.richText}>
      {blocks.map((block, index) => {
        if (block.type === "paragraph") {
          return (
            <p key={index} className={styles.text}>
              {block.text}
            </p>
          );
        }

        const ListTag = block.type;

        return (
          <ListTag key={index} className={styles.list}>
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{item}</li>
            ))}
          </ListTag>
        );
      })}
    </div>
  );
}
