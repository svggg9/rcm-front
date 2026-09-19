"use client";
import { useId, useRef, useState } from "react";
import Image from "next/image";
import { ConfirmActionButton } from "../../../../../components/ui/ConfirmActionButton";
import { Button } from "../../../../../components/ui/Button";
import { DesignSystemIcon } from "../../../../../components/ui/DesignSystemIcon";
import type { ProductImageItem } from "../types";
import styles from "./ProductPhotoEditor.module.css";

export type ProductPhotoEditorProps = {
  images: ProductImageItem[];
  invalidImages?: boolean;
  uploading: boolean;
  reordering: boolean;
  mediaDisabled: boolean;
  mediaDisabledHint?: string;
  dragImageId: number | null;
  uploadProgress: { done: number; total: number };
  onFilesChange: (files: File[]) => void;
  onUploadImages: (files: File[], colorwayId?: number | null) => void;
  onDragImageStart: (imageId: number) => void;
  onDragImageEnd: () => void;
  onMoveImage: (imageId: number) => void;
  onDeleteImage: (imageId: number) => void;
  onMoveImageByIndex: (fromIndex: number, toIndex: number) => void;
};

export function ProductPhotoEditor({ images, invalidImages = false, uploading, reordering, mediaDisabled,
  mediaDisabledHint, dragImageId, uploadProgress, onFilesChange, onUploadImages,
  onDragImageStart, onDragImageEnd, onMoveImage, onDeleteImage, onMoveImageByIndex }: ProductPhotoEditorProps) {
  const fieldId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = images.find(image => image.id === selectedId) ?? images[0];
  const selectedIndex = selected ? images.indexOf(selected) : -1;
  const locked = mediaDisabled || uploading || reordering;
  const invalid = invalidImages && images.length === 0;

  function uploadFiles(files: File[]) {
    setDragActive(false);
    if (locked) return;
    const imageFiles = files.filter(file => file.type.startsWith("image/"));
    if (!imageFiles.length) return;
    onFilesChange(imageFiles);
    onUploadImages(imageFiles);
  }

  return <section className={styles.editor} aria-label="Фото товара" aria-busy={uploading || undefined}>
    <div className={styles.heading}><h2>Фото товара</h2><span>{images.length ? `${selectedIndex + 1} / ${images.length}` : ""}</span></div>
    <div className={`${styles.media} ${dragActive ? styles.dragActive : ""} ${invalid ? styles.invalid : ""}`}
      data-validation-error={invalid || undefined}
      onDragOver={event => { event.preventDefault(); if (!locked && event.dataTransfer.types.includes("Files")) setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={event => { event.preventDefault(); uploadFiles(Array.from(event.dataTransfer.files)); }}>
      {selected ? <Image src={selected.url} alt={`Фото товара ${selectedIndex + 1}`} fill sizes="(max-width: 1100px) 90vw, 420px" className={styles.image} />
        : <div className={styles.empty}>
          <DesignSystemIcon name="package" role="empty" />
          <p>Добавьте фотографии товара</p>
          <span>Перетащите сюда или выберите файлы</span>
        </div>}
      {selectedIndex === 0 && <span className={styles.mainBadge}>Главное фото</span>}
    </div>
    {images.length > 0 && <>
      <div className={styles.thumbnails} aria-label="Фотографии товара">
        {images.map((image, index) => <button key={image.id} type="button"
          className={`${styles.thumbnail} ${image.id === selected.id ? styles.selected : ""} ${dragImageId === image.id ? styles.dragging : ""}`}
          aria-label={`Показать фото ${index + 1}${index === 0 ? ", главное" : ""}`} aria-pressed={image.id === selected.id}
          onClick={() => setSelectedId(image.id)} draggable={!locked}
          onDragStart={() => { if (!locked) onDragImageStart(image.id); }}
          onDragOver={event => event.preventDefault()}
          onDrop={event => { event.preventDefault(); if (!locked && dragImageId !== null) onMoveImage(image.id); }} onDragEnd={onDragImageEnd}>
          <Image src={image.url} alt="" fill sizes="64px" className={styles.image} />
        </button>)}
      </div>
      <div className={styles.toolbar}>
        <div className={styles.orderControls}>
          <Button variant="ghost" className={styles.iconButton} disabled={locked || selectedIndex === 0}
            aria-label="Переместить фото раньше" onClick={() => onMoveImageByIndex(selectedIndex, selectedIndex - 1)}><DesignSystemIcon name="chevron-left" role="utility" /></Button>
          <Button variant="ghost" className={styles.iconButton} disabled={locked || selectedIndex === images.length - 1}
            aria-label="Переместить фото позже" onClick={() => onMoveImageByIndex(selectedIndex, selectedIndex + 1)}><DesignSystemIcon name="chevron-right" role="utility" /></Button>
        </div>
        {selectedIndex > 0 && <Button variant="ghost" className={styles.textButton} disabled={locked}
          onClick={() => onMoveImageByIndex(selectedIndex, 0)}>Сделать главным</Button>}
        <ConfirmActionButton variant="ghost" className={styles.iconButton} disabled={locked}
          confirmTitle="Удалить фото товара?" confirmText="Чтобы вернуть фотографию, её потребуется загрузить заново"
          aria-label="Удалить выбранное фото" onConfirm={() => onDeleteImage(selected.id)}><DesignSystemIcon name="trash" role="utility" /></ConfirmActionButton>
      </div>
    </>}
    <input ref={fileInputRef} hidden type="file" accept="image/*" multiple disabled={locked} aria-label="Файлы фотографий товара"
      onChange={event => { uploadFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
    <Button type="button" variant="secondary" className={styles.uploadButton} loading={uploading} disabled={locked}
      aria-describedby={invalid ? `${fieldId}-images-error` : undefined} onClick={() => fileInputRef.current?.click()}>Выбрать фото</Button>
    {invalid && <span className="fieldError" id={`${fieldId}-images-error`}>Добавьте хотя бы одно фото товара</span>}
    <p className={styles.hint}>{mediaDisabled && mediaDisabledHint ? mediaDisabledHint : "JPG, PNG, WEBP. Первое фото — главное. Перетащите миниатюры, чтобы изменить порядок."}</p>
    {uploading && <div className={styles.progress} role="status" aria-label={`Загружено фото: ${uploadProgress.done} из ${uploadProgress.total}`}>
      <span style={{width: `${uploadProgress.total ? uploadProgress.done / uploadProgress.total * 100 : 0}%`}} />
    </div>}
  </section>;
}
