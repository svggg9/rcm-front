"use client";
import { PHOTO_FILE_ACCEPT } from "../../../../../lib/imageUploadPolicy";
import { useId, useRef, useState } from "react";
import Image from "next/image";
import { ConfirmActionButton } from "../../../../../components/ui/ConfirmActionButton";
import { Button } from "../../../../../components/ui/Button";
import { Banner } from "../../../../../components/ui/Banner";
import { DesignSystemIcon } from "../../../../../components/ui/DesignSystemIcon";
import type { ProductImageItem } from "../types";
import styles from "./ProductPhotoEditor.module.css";
import { hasLowResolutionPhoto } from "../../../../../lib/productPhotos";

export type ProductPhotoEditorProps = {
  images: ProductImageItem[];
  colorways?: { id:number; color:string }[];
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

export function ProductPhotoEditor({ images, colorways = [], invalidImages = false, uploading, reordering, mediaDisabled,
  mediaDisabledHint, dragImageId, uploadProgress, onFilesChange, onUploadImages,
  onDragImageStart, onDragImageEnd, onMoveImage, onDeleteImage, onMoveImageByIndex }: ProductPhotoEditorProps) {
  const fieldId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadColorwayId, setUploadColorwayId] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = images.find(image => image.id === selectedId) ?? images[0];
  const selectedIndex = selected ? images.indexOf(selected) : -1;
  const locked = mediaDisabled || uploading || reordering;
  const lowResolutionCount = images.filter(hasLowResolutionPhoto).length;
  const invalidCount = images.length < 3 || images.length > 10;
  const invalid = invalidImages && invalidCount;

  function uploadFiles(files: File[]) {
    setDragActive(false);
    if (locked) return;
    const imageFiles = files;
    if (!imageFiles.length) return;
    onFilesChange(imageFiles);
    onUploadImages(imageFiles, uploadColorwayId);
  }

  return <section id="product-photos" className={styles.editor} aria-label="Фото товара" aria-busy={uploading || undefined}>
    <h2 className={styles.title}>Фото товара</h2>
    <p className={styles.hint}>Главное фото — товар целиком на белом фоне, остальные — в свободном формате</p>
    <div className={`${styles.media} ${dragActive ? styles.dragActive : ""} ${invalid ? styles.invalid : ""}`}
      data-validation-error={invalid || undefined}
      onDragOver={event => { event.preventDefault(); if (!locked && event.dataTransfer.types.includes("Files")) setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={event => { event.preventDefault(); uploadFiles(Array.from(event.dataTransfer.files)); }}>
      {selected ? <Image src={selected.url} alt={`Фото товара ${selectedIndex + 1}`} fill sizes="(max-width: 700px) 100vw, 560px" className={styles.image} />
        : <button type="button" className={styles.empty} disabled={locked}
          aria-label="Добавить фотографии товара"
          onClick={() => fileInputRef.current?.click()}>
          <DesignSystemIcon name="package" role="empty" />
          <span className={styles.emptyTitle}>Добавьте фотографии товара</span>
          <span>Перетащите сюда или выберите файлы</span>
        </button>}
      {selectedIndex === 0 && <span className={styles.mainBadge}>Главное фото</span>}
      {images.length > 0 && <span className={styles.photoCount} aria-label={`Фото ${selectedIndex + 1} из ${images.length}`}>{selectedIndex + 1} / {images.length}</span>}
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
    {colorways.length > 0 && <>
      <label>Фото для цвета (необязательно)<select value={uploadColorwayId ?? ""} disabled={locked} onChange={event=>setUploadColorwayId(event.target.value ? Number(event.target.value) : null)}><option value="">Общие фотографии</option>{colorways.map(c=><option key={c.id} value={c.id}>{c.color || "Без цвета"}</option>)}</select></label>
      <p className={styles.hint}>Нового цвета нет в списке? Сохраните товар, чтобы он появился</p>
    </>}
    <input ref={fileInputRef} hidden type="file" accept={PHOTO_FILE_ACCEPT} multiple disabled={locked} aria-label="Файлы фотографий товара"
      onChange={event => { uploadFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
    <Button type="button" variant="secondary" className={styles.uploadButton} loading={uploading} disabled={locked}
      aria-describedby={invalid ? `${fieldId}-images-error` : undefined} onClick={() => fileInputRef.current?.click()}>Выбрать фото</Button>
    <p className={styles.hint}>JPEG, PNG или WebP · до 10 МБ на файл · до 10 фото</p>
    <p className={styles.hint}>Для модерации — 3–10 фото, включая крупные исходники 4К и выше</p>
    {mediaDisabled && mediaDisabledHint && <Banner tone="warning" role="status">{mediaDisabledHint}</Banner>}
    {invalid && <span className="fieldError" id={`${fieldId}-images-error`}>Для модерации нужно от 3 до 10 фото товара</span>}
    {lowResolutionCount > 0 && <Banner tone="warning" role="status">Фото с низким разрешением: {lowResolutionCount}. При увеличении они могут выглядеть нечётко. Рекомендуем загрузить более качественные исходники</Banner>}
    {selected?.width != null && selected.height != null && <p className={styles.hint}>Размер выбранного фото: {selected.width} × {selected.height} px</p>}
    <details className={styles.photoRequirements}>
      <summary>Требования к фотографиям</summary>
      <ul>
        <li>Черновик можно сохранить без полного комплекта фото</li>
        <li>Крупные исходники сохраняются, для показа подбирается оптимизированный размер</li>
        <li>На главном фото — белый фон, товар по центру с небольшими полями. Мягкая естественная тень допустима.</li>
        <li>Фото должны точно передавать цвет и комплектацию товара, без рекламных надписей, водяных знаков, рамок и коллажей.</li>
        <li>Используйте фотографии, на которые у вас есть права.</li>
      </ul>
      {images.length > 1 && <p>Первое фото — главное. Перетащите миниатюры или используйте стрелки, чтобы изменить порядок.</p>}
    </details>
    <p className={styles.hint}>Фото сохраняются сразу и не отменяются при закрытии редактора</p>
    {uploading && <div className={styles.progress} role="status" aria-label={`Загружено фото: ${uploadProgress.done} из ${uploadProgress.total}`}>
      <span style={{width: `${uploadProgress.total ? uploadProgress.done / uploadProgress.total * 100 : 0}%`}} />
    </div>}
  </section>;
}
