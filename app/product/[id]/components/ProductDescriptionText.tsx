import styles from "../ProductPage.module.css";

import { parseDescription, type TextBlock } from "../../../lib/productDescription";

type Props = {
  text?: string;
  fallback: string;
  blocks?: TextBlock[];
  headingLevel?: 3 | 4;
};

export function ProductDescriptionText({ text = "", fallback, blocks: suppliedBlocks, headingLevel = 4 }: Props) {
  const blocks = suppliedBlocks ?? parseDescription(text.trim());
  const Heading = headingLevel === 3 ? "h3" : "h4";

  if (blocks.length === 0) {
    return <p className={styles.text}>{fallback}</p>;
  }

  return (
    <div className={styles.richText}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return <Heading key={index} className={styles.descriptionHeading}>{block.text}</Heading>;
        }
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
