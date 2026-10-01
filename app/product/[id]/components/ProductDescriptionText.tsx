import styles from "../ProductPage.module.css";

import { parseDescription } from "../../../lib/productDescription";

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

        const ListTag = block.type === "ol" ? "ol" : "ul";

        return (
          <ListTag
            key={index}
            style={block.type === "square" ? { gridTemplateRows: `repeat(${Math.ceil(block.items.length / 2)}, auto)` } : undefined}
            className={`${styles.list} ${
              block.type === "dash" ? styles.dashList : block.type === "square" ? styles.squareList : ""
            }`.trim()}
          >
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{item}</li>
            ))}
          </ListTag>
        );
      })}
    </div>
  );
}
