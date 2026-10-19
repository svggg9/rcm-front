import Image from "next/image";
import type { SellerProduct } from "../types";
import styles from "../ProductEditPage.module.css";

type Content = Pick<SellerProduct, "title" | "description" | "composition" | "category" | "audience" | "packageWidthCm" | "packageHeightCm" | "packageLengthCm" | "packageWeightKg"> & { variantSummary: string; photos: string[] };

export function ProductRevisionReview({ source, current }: { source: SellerProduct; current: Content }) {
  const audience = { MEN: "Для мужчин", WOMEN: "Для женщин", UNISEX: "Для всех" };
  const variants = source.variants.map(v => `${v.color || "Без цвета"} · ${v.size || "Без размера"}`).sort().join("\n");
  const rows: [string, string | number | null, string | number | null][] = [
    ["Название", source.title, current.title],
    ["Категория", source.suggestedCategoryName || source.category, current.category],
    ["Кому подходит", audience[source.audience], audience[current.audience]],
    ["Описание", source.description, current.description],
    ["Состав", source.composition, current.composition],
    ["Варианты", variants, current.variantSummary],
    ["Длина упаковки, см", source.packageLengthCm, current.packageLengthCm],
    ["Ширина упаковки, см", source.packageWidthCm, current.packageWidthCm],
    ["Высота упаковки, см", source.packageHeightCm, current.packageHeightCm],
    ["Вес упаковки, кг", source.packageWeightKg, current.packageWeightKg],
  ];
  const changes = rows.filter(([, before, after]) => String(before ?? "").trim() !== String(after ?? "").trim());
  const oldPhotos = source.imageItems?.length ? [...source.imageItems].sort((a,b) => a.sortOrder-b.sortOrder).map(i => i.url) : source.images;
  const photosChanged = JSON.stringify(oldPhotos) !== JSON.stringify(current.photos);
  return <div className={styles.revisionReview}>
    <p>После одобрения эти изменения заменят опубликованную карточку. До этого покупатели видят прежнюю версию.</p>
    <p>Цена, остаток и артикул существующих вариантов применяются при сохранении и не ждут модерации</p>
    {!changes.length && !photosChanged && <p>Изменений в содержимом карточки нет</p>}
    {changes.map(([label,before,after]) => <section key={label}>
      <h3>{label}</h3><div className={styles.comparisonColumns}>
        <div><span>Сейчас на витрине</span><p>{before ?? "Не указано"}</p></div>
        <div><span>После одобрения</span><p>{after ?? "Не указано"}</p></div>
      </div>
    </section>)}
    {photosChanged && <section><h3>Фото и их порядок</h3><div className={styles.comparisonColumns}>
      {[oldPhotos, current.photos].map((photos,index) => <div key={index}><span>{index ? "После одобрения" : "Сейчас на витрине"}</span><div className={styles.comparisonPhotos}>
        {photos.map((url,i) => <Image key={`${i}-${url}`} src={url} width={80} height={100} alt={`Фото ${i+1}`} />)}
      </div></div>)}
    </div></section>}
  </div>;
}
