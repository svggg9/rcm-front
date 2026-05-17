
import { SectionHeader } from "./SectionHeader";
import type { ProductImageItem } from "../types";
import styles from "../ProductEditPage.module.css";
import Image from "next/image";

type Props = {
  images: ProductImageItem[];
  selectedFiles: File[];
  uploading: boolean;
  reordering: boolean;
  dragImageId: number | null;
  onFilesChange: (files: File[]) => void;
  onUploadImages: () => void;
  onDragImageStart: (imageId: number) => void;
  onDragImageEnd: () => void;
  onMoveImage: (imageId: number) => void;
  onDeleteImage: (imageId: number) => void;
};

export function ProductImagesCard({
  images,
  selectedFiles,
  uploading,
  reordering,
  dragImageId,
  onFilesChange,
  onUploadImages,
  onDragImageStart,
  onDragImageEnd,
  onMoveImage,
  onDeleteImage,
}: Props) {
  return (
    <section className={styles.card}>
      <SectionHeader
        title="Изображения"
        hint="Первое фото будет главным. Перетащи фото, чтобы поменять порядок."
      />

      <div className={styles.uploadPanel}>
        <label className={styles.filePicker}>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => onFilesChange(Array.from(event.target.files ?? []))}
          />
          <span>
            {selectedFiles.length
              ? `Выбрано файлов: ${selectedFiles.length}`
              : "Выбрать фото"}
          </span>
        </label>

        <button
          type="button"
          onClick={onUploadImages}
          disabled={uploading || selectedFiles.length === 0}
          className={styles.primaryBtn}
        >
          {uploading ? "Загружаем…" : "Загрузить"}
        </button>

        {reordering ? <span className={styles.muted}>Сохраняем порядок…</span> : null}
      </div>

      {images.length === 0 ? (
        <div className={styles.emptyBox}>Фото пока нет.</div>
      ) : (
        <div className={styles.imageGrid}>
          {images.map((image, index) => (
            <div
              key={image.id}
              draggable
              onDragStart={() => onDragImageStart(image.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => onMoveImage(image.id)}
              onDragEnd={onDragImageEnd}
              className={`${styles.imageCard} ${
                dragImageId === image.id ? styles.imageCardDragging : ""
              }`}
            >
              <Image src={image.url} alt="" className={styles.image} />

              <div className={styles.imageMeta}>
                <span>{index === 0 ? "Главное фото" : `Фото ${index + 1}`}</span>

                <button
                  type="button"
                  onClick={() => onDeleteImage(image.id)}
                  className={styles.dangerTextBtn}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}