"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../../../components/ui/Icon";
import { Loader } from "../../../components/ui/Loader";
import { productImageBounds } from "../../../lib/productImageFrame";
import styles from "../ProductPage.module.css";

type Props = {
  open: boolean;
  title: string;
  images: string[];
  currentIndex: number;
  progress: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

function centerZoomedPhoto(node: HTMLDivElement | null, src: string) {
  if (!node) return;
  const image = node.querySelector("img");
  const bounds = image ? productImageBounds(image, src) : null;
  if (!image?.naturalWidth || !bounds) {
    node.scrollTo({ left: (node.scrollWidth - node.clientWidth) / 2, top: (node.scrollHeight - node.clientHeight) / 2 });
    return;
  }
  const fit = Math.min(image.clientWidth / image.naturalWidth, image.clientHeight / image.naturalHeight);
  node.scrollTo({
    left: (image.clientWidth - image.naturalWidth * fit) / 2 + (bounds.x + bounds.width / 2) * image.naturalWidth * fit - node.clientWidth / 2,
    top: (image.clientHeight - image.naturalHeight * fit) / 2 + (bounds.y + bounds.height / 2) * image.naturalHeight * fit - node.clientHeight / 2,
  });
}

export function ProductImageViewer({
  open,
  title,
  images,
  currentIndex,
  progress,
  onClose,
  onPrev,
  onNext,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const imageWrapRef = useRef<HTMLDivElement | null>(null);
  const [zoomedIndex, setZoomedIndex] = useState<number | null>(null);
  const zoomed = zoomedIndex === currentIndex;
  const [loadedImages, setLoadedImages] = useState<Set<string>>(() => new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const imageKey = `${images[currentIndex]}:${zoomed ? "zoom" : "original"}`;
  function markLoaded(key: string) { setLoadedImages(previous => previous.has(key) ? previous : new Set(previous).add(key)); }
  function markFailed(key: string) { setFailedImages(previous => previous.has(key) ? previous : new Set(previous).add(key)); }

  useEffect(() => {
    if (!zoomed) return;
    const frame = requestAnimationFrame(() => {
      centerZoomedPhoto(imageWrapRef.current, images[currentIndex]);
    });
    return () => cancelAnimationFrame(frame);
  }, [zoomed, images, currentIndex]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.showModal();
    closeButtonRef.current?.focus();

    return () => {
      dialog?.close();
      previousFocusRef.current?.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open || !images.length) return null;

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];

    touchStartRef.current = null;

    if (!start || images.length <= 1 || zoomed) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (Math.abs(deltaX) < 42 || Math.abs(deltaX) < Math.abs(deltaY)) return;

    if (deltaX < 0) {
      onNext();
    } else {
      onPrev();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.viewer}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — просмотр фотографий`}
    >
      <button
        ref={closeButtonRef}
        type="button"
        className={styles.viewerClose}
        onClick={onClose}
        aria-label="Закрыть просмотр"
      >
        <Icon name="x" size={24} strokeWidth={1.35} />
      </button>
      <button type="button" className={styles.viewerZoom} aria-label={zoomed ? "Уменьшить фото" : "Увеличить фото"}
        aria-pressed={zoomed} onClick={event => {
          event.stopPropagation(); setZoomedIndex(zoomed ? null : currentIndex);
          if (!zoomed) requestAnimationFrame(() => imageWrapRef.current?.focus({ preventScroll: true }));
        }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
          <circle cx="10" cy="10" r="6.5" /><path d="m15 15 6 6M7 10h6" />{!zoomed && <path d="M10 7v6" />}
        </svg>
      </button>

      <div
        className={styles.viewerBody}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.viewerStage}>
          {!loadedImages.has(imageKey) && !failedImages.has(imageKey) && <Loader inline label="Загрузка фото" className={styles.viewerLoader} />}
          {failedImages.has(imageKey) && <p className={styles.viewerError} role="status">Не удалось загрузить фото</p>}
          {images.length > 1 ? (
            <button
              type="button"
              className={`${styles.viewerArrow} ${styles.viewerArrowLeft}`}
              onClick={(event) => {
                event.stopPropagation();
                setZoomedIndex(null);
                onPrev();
              }}
              aria-label="Предыдущее фото"
            >
              <Icon name="chevron-left" size={28} strokeWidth={1.25} />
            </button>
          ) : (
            <span className={styles.viewerArrowSpacer} aria-hidden="true" />
          )}

          <div
            ref={imageWrapRef}
            className={styles.viewerImageWrap}
            data-zoomed={zoomed || undefined}
            tabIndex={zoomed ? 0 : undefined}
            aria-label={zoomed ? "Увеличенное фото, используйте прокрутку для просмотра" : undefined}
            onKeyDown={event => { if (zoomed && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) event.stopPropagation(); }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {zoomed ? <div className={styles.viewerZoomCanvas}>
              <Image src={images[currentIndex]} alt={`${title} ${currentIndex + 1} — увеличенное фото`} fill sizes="200vw" className={styles.viewerImage}
                onLoad={() => { markLoaded(imageKey); centerZoomedPhoto(imageWrapRef.current, images[currentIndex]); }} onError={() => markFailed(imageKey)} />
            </div> : <div
              className={styles.viewerImageSlider}
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {images.map((image, index) => (
                <div className={styles.viewerImageSlide} key={`${image}-${index}`}>
                  <Image
                    src={image}
                    alt={`${title} ${index + 1}`}
                    fill
                    sizes="100vw"
                    className={styles.viewerImage}
                    priority={index === currentIndex}
                    onLoad={() => markLoaded(`${image}:original`)}
                    onError={() => markFailed(`${image}:original`)}
                  />
                </div>
              ))}
            </div>}
          </div>

          {images.length > 1 ? (
            <button
              type="button"
              className={`${styles.viewerArrow} ${styles.viewerArrowRight}`}
              onClick={(event) => {
                event.stopPropagation();
                setZoomedIndex(null);
                onNext();
              }}
              aria-label="Следующее фото"
            >
              <Icon name="chevron-right" size={28} strokeWidth={1.25} />
            </button>
          ) : (
            <span className={styles.viewerArrowSpacer} aria-hidden="true" />
          )}
        </div>

        <div className={styles.viewerFooter}>
          <div className={styles.viewerTrack}>
            <div
              className={styles.viewerProgress}
              style={{
                width: `${100 / images.length}%`,
                maxWidth: `${100 / images.length}%`,
                transform: `translateX(${progress * (images.length - 1)}%)`,
              }}
            />
          </div>
        </div>
      </div>
    </dialog>
  );
}
