"use client";
import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { ConfirmActionButton } from "../../../../../components/ui/ConfirmActionButton";
import { Button } from "../../../../../components/ui/Button";
import { Banner } from "../../../../../components/ui/Banner";
import { DesignSystemIcon } from "../../../../../components/ui/DesignSystemIcon";
import { FormSelect } from "../../../../../components/ui/FormSelect";
import { InfoHint } from "../../../../../components/ui/InfoHint";
import type { ProductImageItem } from "../types";
import styles from "./ProductPhotoEditor.module.css";
import { hasLowResolutionPhoto } from "../../../../../lib/productPhotos";
import { PHOTO_FILE_ACCEPT } from "../../../../../lib/imageUploadPolicy";

export type ProductPhotoEditorProps = {
  images: ProductImageItem[];
  colorways?: { id:number; color:string }[];
  shadeGroups?: { key: string; color: string }[];
  selectedGroupKey?: string;
  onGroupChange?: (key: string) => void;
  imageLabels?: Record<number, string>;
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

export function ProductPhotoEditor({ images, colorways = [], shadeGroups, selectedGroupKey, onGroupChange, imageLabels, invalidImages = false, uploading, reordering, mediaDisabled,
  mediaDisabledHint, dragImageId, uploadProgress, onFilesChange, onUploadImages,
  onDragImageStart, onDragImageEnd, onMoveImage, onDeleteImage, onMoveImageByIndex }: ProductPhotoEditorProps) {
  const fieldId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadColorwayId, setUploadColorwayId] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const selected = images.find(image => image.id === selectedId) ?? images[0];
  const selectedIndex = selected ? images.indexOf(selected) : -1;
  const locked = mediaDisabled || uploading || reordering;
  const lowResolutionCount = images.filter(hasLowResolutionPhoto).length;
  const invalidCount = images.length < 3 || images.length > 10;
  const invalid = invalidImages && invalidCount;

  useEffect(() => {
    const strip = thumbnailsRef.current;
    const item = strip?.querySelector<HTMLElement>('[data-selected="true"]');
    if (!strip || !item) return;
    if (item.offsetLeft < strip.scrollLeft) strip.scrollLeft = item.offsetLeft;
    else if (item.offsetLeft + item.offsetWidth > strip.scrollLeft + strip.clientWidth)
      strip.scrollLeft = item.offsetLeft + item.offsetWidth - strip.clientWidth;
  }, [selected?.id, selectedIndex]);

  function browse(direction: number) {
    if (images.length > 1) setSelectedId(images[(selectedIndex + direction + images.length) % images.length].id);
  }

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
    {shadeGroups && shadeGroups.length > 1 && <FormSelect label="Добавить фото к оттенку" value={selectedGroupKey ?? shadeGroups[0].key} disabled={locked}
      options={shadeGroups.map(group => ({ value: group.key, label: group.color }))} onChange={value => { if (value) onGroupChange?.(value); }} />}
    <div className={`${styles.media} ${dragActive ? styles.dragActive : ""} ${invalid ? styles.invalid : ""}`}
      role="region" aria-label="Просмотр фотографий товара" tabIndex={images.length > 1 ? 0 : undefined}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); browse(event.key === "ArrowLeft" ? -1 : 1); }
      }}
      onTouchStart={event => { const touch = event.touches[0]; touchStart.current = event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null; }}
      onTouchCancel={() => { touchStart.current = null; }}
      onTouchEnd={event => {
        const start = touchStart.current; touchStart.current = null;
        const touch = event.changedTouches[0];
        if (!start || !touch) return;
        const dx = touch.clientX - start.x, dy = touch.clientY - start.y;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) browse(dx > 0 ? -1 : 1);
      }}
      data-validation-error={invalid || undefined}
      onDragOver={event => { event.preventDefault(); if (!locked && event.dataTransfer.types.includes("Files")) setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={event => { event.preventDefault(); uploadFiles(Array.from(event.dataTransfer.files)); }}>
      {selected ? <Image src={selected.url} unoptimized={selected.url.startsWith("blob:")} alt={`Фото товара ${selectedIndex + 1}`} fill sizes="(max-width: 700px) 100vw, 560px" className={styles.image} />
        : <button type="button" className={styles.empty} disabled={locked}
          aria-label="Добавить фотографии товара"
          onClick={() => fileInputRef.current?.click()}>
          <DesignSystemIcon name="package" role="empty" />
          <span className={styles.emptyTitle}>Добавьте фотографии товара</span>
          <span>Перетащите сюда или выберите файлы</span>
        </button>}
      {images.length > 1 && <>
        <Button variant="ghost" className={`${styles.browseButton} ${styles.previous}`} aria-label="Предыдущее фото" onClick={() => browse(-1)}><DesignSystemIcon name="chevron-left" /></Button>
        <Button variant="ghost" className={`${styles.browseButton} ${styles.next}`} aria-label="Следующее фото" onClick={() => browse(1)}><DesignSystemIcon name="chevron-right" /></Button>
      </>}
      {images.length > 0 && <span className={styles.photoCount} aria-label={`Фото ${selectedIndex + 1} из ${images.length}`}>{selectedIndex + 1} / {images.length}</span>}
    </div>
    {images.length > 0 && <>
      <div ref={thumbnailsRef} className={styles.thumbnails} aria-label="Фотографии товара">
        {images.map((image, index) => <div key={image.id} className={styles.thumbnailItem} data-selected={image.id === selected.id}>
          <div className={styles.thumbnailFrame}><button type="button"
          className={`${styles.thumbnail} ${index === 0 ? styles.mainThumbnail : ""} ${image.id === selected.id ? styles.selected : ""} ${dragImageId === image.id ? styles.dragging : ""}`}
          aria-label={`Показать фото ${index + 1}${index === 0 ? ", главное" : ""}`} aria-pressed={image.id === selected.id}
          onClick={() => setSelectedId(image.id)} draggable={!locked}
          onDragStart={() => { if (!locked) onDragImageStart(image.id); }}
          onDragOver={event => event.preventDefault()}
          onDrop={event => { event.preventDefault(); if (!locked && dragImageId !== null) onMoveImage(image.id); }} onDragEnd={onDragImageEnd}>
          <Image src={image.url} unoptimized={image.url.startsWith("blob:")} alt="" fill sizes="132px" className={styles.image} />
        </button>
          {index === 0 && <InfoHint className={styles.mainInfo} label="Требования к главному фото"
            text="Первое фото — главное, оно показывается в каталоге. Товар должен быть целиком на белом фоне." />}
          </div>
          <div className={styles.thumbnailControls}>
          {image.id === selected.id && <>
            <Button variant="ghost" className={styles.iconButton} disabled={locked || index === 0}
              aria-label="Переместить фото раньше" onClick={() => onMoveImageByIndex(index, index - 1)}><DesignSystemIcon name="chevron-left" role="utility" /></Button>
            <ConfirmActionButton variant="ghost" confirmVariant="danger" className={styles.iconButton} disabled={locked}
              confirmTitle="Удалить фото товара?" confirmText="Фото будет удалено при автосохранении черновика"
              aria-label="Удалить выбранное фото" onConfirm={() => onDeleteImage(image.id)}><DesignSystemIcon name="trash" role="utility" /></ConfirmActionButton>
            <Button variant="ghost" className={styles.iconButton} disabled={locked || index === images.length - 1}
              aria-label="Переместить фото позже" onClick={() => onMoveImageByIndex(index, index + 1)}><DesignSystemIcon name="chevron-right" role="utility" /></Button>
          </>}
          </div>
        </div>)}
      </div>
    </>}
    {!shadeGroups && colorways.length > 0 && <>
      <label>Фото для цвета (необязательно)<select value={uploadColorwayId ?? ""} disabled={locked} onChange={event=>setUploadColorwayId(event.target.value ? Number(event.target.value) : null)}><option value="">Общие фотографии</option>{colorways.map(c=><option key={c.id} value={c.id}>{c.color || "Без цвета"}</option>)}</select></label>
      <p className={styles.hint}>Нового цвета нет в списке? Сохраните товар, чтобы он появился</p>
    </>}
    {selected && imageLabels?.[selected.id] && <p className={styles.hint}>Оттенок: {imageLabels[selected.id]}</p>}
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
        <li>На главном фото — белый фон, товар по центру с небольшими полями, мягкая естественная тень допустима</li>
        <li>Фото должны точно передавать цвет и комплектацию товара, без рекламных надписей, водяных знаков, рамок и коллажей</li>
        <li>Используйте фотографии, на которые у вас есть права</li>
      </ul>
      {images.length > 1 && <p>Первое фото — главное. Перетащите миниатюры или используйте стрелки, чтобы изменить порядок</p>}
    </details>
    <p className={styles.hint}>Фото сохраняются автоматически вместе с черновиком</p>
    {uploading && <div className={styles.progress} role="status" aria-label={`Загружено фото: ${uploadProgress.done} из ${uploadProgress.total}`}>
      <span style={{width: `${uploadProgress.total ? uploadProgress.done / uploadProgress.total * 100 : 0}%`}} />
    </div>}
  </section>;
}
