"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent,
} from "react";

import { Button } from "../../components/ui/Button";
import {
  getAdminStorefrontHome,
  updateAdminStorefrontHeroPosition,
  uploadAdminStorefrontHero,
} from "../lib/adminApi";
import type { AdminStorefrontHome } from "../types";

import styles from "./AdminStorefrontTab.module.css";
import { AdminStorefrontCollections } from "./AdminStorefrontCollections";

const FALLBACK_HERO_IMAGE = "/kazansky.jpg";
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type Props = {
  initialHome?: AdminStorefrontHome | null;
  onHomeChange?: (home: AdminStorefrontHome) => void;
  onInvalidate?: () => void;
};

export function AdminStorefrontTab({
  initialHome = null,
  onHomeChange,
  onInvalidate,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const positionFrameRef = useRef<number | null>(null);
  const pendingPositionRef = useRef<{ x: number; y: number } | null>(null);
  const positionDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    positionX: number;
    positionY: number;
  } | null>(null);
  const [storefront, setStorefront] = useState<AdminStorefrontHome | null>(initialHome);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialHome);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const initialPosition = {
    x: initialHome?.heroPositionX ?? 50,
    y: initialHome?.heroPositionY ?? 50,
  };
  const [position, setPosition] = useState(initialPosition);
  const [savedPosition, setSavedPosition] = useState(initialPosition);
  const [positionSaving, setPositionSaving] = useState(false);
  const [positionDragging, setPositionDragging] = useState(false);
  const handleCollectionsChange = useCallback(
    (collections: AdminStorefrontHome["collections"]) => {
      setStorefront((current) =>
        current ? { ...current, collections } : current
      );
    },
    []
  );
  const invalidateParentStorefront = useCallback(() => {
    onInvalidate?.();
  }, [onInvalidate]);

  useEffect(() => {
    if (initialHome) {
      setStorefront(initialHome);
      const nextPosition = {
        x: initialHome.heroPositionX,
        y: initialHome.heroPositionY,
      };
      setPosition(nextPosition);
      setSavedPosition(nextPosition);
      setLoading(false);
      return;
    }

    let active = true;

    void getAdminStorefrontHome()
      .then((data) => {
        if (active) {
          setStorefront(data);
          const nextPosition = {
            x: data.heroPositionX,
            y: data.heroPositionY,
          };
          setPosition(nextPosition);
          setSavedPosition(nextPosition);
        }
      })
      .catch((caught) => {
        if (!active) return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Не удалось загрузить настройки витрины"
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [initialHome]);

  useEffect(() => {
    if (storefront) onHomeChange?.(storefront);
  }, [onHomeChange, storefront]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      if (positionFrameRef.current !== null) {
        window.cancelAnimationFrame(positionFrameRef.current);
      }
    };
  }, [initialHome]);

  function selectFile(file: File | null) {
    setSuccess(false);
    setError(null);

    if (!file) return;

    if (!ALLOWED_FILE_TYPES.has(file.type)) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setError("Выберите изображение в формате JPEG, PNG или WebP");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setError("Размер изображения не должен превышать 8 МБ");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setFailedImageUrl(null);
  }

  async function save() {
    if (!selectedFile || saving) return;

    setSaving(true);
    setSuccess(false);
    setError(null);

    try {
      const updated = await uploadAdminStorefrontHero(selectedFile);
      setStorefront((current) => ({
        ...updated,
        collections: current?.collections ?? updated.collections,
      }));
      onHomeChange?.(updated);
      setPosition({ x: updated.heroPositionX, y: updated.heroPositionY });
      setSavedPosition({ x: updated.heroPositionX, y: updated.heroPositionY });
      setSelectedFile(null);
      setPreviewUrl(null);
      setSuccess(true);

      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSuccess(false), 1600);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Не удалось сохранить изображение"
      );
    } finally {
      setSaving(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);

    if (loading || saving) return;
    selectFile(event.dataTransfer.files[0] ?? null);
  }

  function startPositionDrag(event: PointerEvent<HTMLDivElement>) {
    if (loading || saving || positionSaving) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    positionDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      positionX: position.x,
      positionY: position.y,
    };
    setPositionDragging(true);
  }

  function movePosition(event: PointerEvent<HTMLDivElement>) {
    const drag = positionDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const deltaX = ((event.clientX - drag.startX) / rect.width) * 100;
    const deltaY = ((event.clientY - drag.startY) / rect.height) * 100;
    pendingPositionRef.current = {
      x: clampPosition(drag.positionX - deltaX),
      y: clampPosition(drag.positionY - deltaY),
    };
    if (positionFrameRef.current !== null) return;
    positionFrameRef.current = window.requestAnimationFrame(() => {
      positionFrameRef.current = null;
      if (pendingPositionRef.current) {
        setPosition(pendingPositionRef.current);
        pendingPositionRef.current = null;
      }
    });
  }

  function finishPositionDrag(event: PointerEvent<HTMLDivElement>) {
    if (positionDragRef.current?.pointerId !== event.pointerId) return;
    positionDragRef.current = null;
    if (positionFrameRef.current !== null) {
      window.cancelAnimationFrame(positionFrameRef.current);
      positionFrameRef.current = null;
    }
    if (pendingPositionRef.current) {
      setPosition(pendingPositionRef.current);
      pendingPositionRef.current = null;
    }
    setPositionDragging(false);
  }

  async function savePosition() {
    if (positionSaving) return;
    setPositionSaving(true);
    setError(null);
    try {
      const updated = await updateAdminStorefrontHeroPosition(position.x, position.y);
      setStorefront((current) => ({
        ...updated,
        collections: current?.collections ?? updated.collections,
      }));
      onHomeChange?.(updated);
      const nextPosition = {
        x: updated.heroPositionX,
        y: updated.heroPositionY,
      };
      setPosition(nextPosition);
      setSavedPosition(nextPosition);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Не удалось сохранить позицию"
      );
    } finally {
      setPositionSaving(false);
    }
  }

  const versionedImageUrl = storefront?.heroImageUrl
    ? `${storefront.heroImageUrl}${
        storefront.heroImageUrl.includes("?") ? "&" : "?"
      }v=${encodeURIComponent(storefront.updatedAt ?? "current")}`
    : null;
  const imageUrl = previewUrl || versionedImageUrl || FALLBACK_HERO_IMAGE;
  const displayedImageUrl =
    failedImageUrl === imageUrl ? FALLBACK_HERO_IMAGE : imageUrl;

  return (
    <section className={styles.page} aria-busy={loading || saving}>
      <div className={styles.header}>
        <h1>Витрина</h1>
      </div>

      <div className={styles.form}>
        <div className={styles.fieldHead}>
          <span className={styles.label}>Главное изображение</span>
          <span className={styles.requirements}>JPEG, PNG или WebP, до 8 МБ</span>
        </div>

        <div
          className={`${styles.dropZone} ${styles.positionEditor} ${
            dragActive ? styles.dropZoneActive : ""
          } ${loading ? styles.dropZoneLoading : ""} ${
            positionDragging ? styles.positionDragging : ""
          }`}
          onDragEnter={(event) => {
            event.preventDefault();
            if (!loading && !saving) setDragActive(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            event.preventDefault();
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setDragActive(false);
            }
          }}
          onDrop={handleDrop}
          onPointerDown={startPositionDrag}
          onPointerMove={movePosition}
          onPointerUp={finishPositionDrag}
          onPointerCancel={finishPositionDrag}
        >
          <div className={styles.preview}>
            <Image
              src={displayedImageUrl}
              alt="Главное изображение витрины"
              fill
              sizes="(max-width: 900px) 100vw, 960px"
              className={styles.image}
              style={{ objectPosition: `${position.x}% ${position.y}%` }}
              unoptimized={displayedImageUrl.startsWith("blob:")}
              onError={() => {
                if (displayedImageUrl !== FALLBACK_HERO_IMAGE) {
                  setFailedImageUrl(imageUrl);
                }
              }}
            />
          </div>

          <div className={styles.dropOverlay} aria-hidden="true">
            Перетащите изображение сюда
          </div>
          <span className={styles.positionHint}>
            Зажмите и двигайте изображение
          </span>
        </div>

        <div className={styles.positionControls}>
          <span>
            Позиция: {Math.round(position.x)}% / {Math.round(position.y)}%
          </span>
          <button
            type="button"
            disabled={loading || saving || positionSaving}
            onClick={() => setPosition({ x: 50, y: 50 })}
          >
            По центру
          </button>
          <button
            type="button"
            disabled={
              loading ||
              saving ||
              positionSaving ||
              (Math.round(position.x) === Math.round(savedPosition.x) &&
                Math.round(position.y) === Math.round(savedPosition.y))
            }
            onClick={() => void savePosition()}
          >
            {positionSaving ? "Сохранение…" : "Сохранить позицию"}
          </button>
        </div>

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <div className={styles.actions}>
          <Button
            type="button"
            variant="secondary"
            disabled={loading || saving}
            onClick={() => inputRef.current?.click()}
          >
            Выбрать изображение
          </Button>

          <Button
            type="button"
            variant="primary"
            disabled={!selectedFile || loading || saving || success}
            loading={saving}
            success={success}
            onClick={() => void save()}
          >
            Сохранить
          </Button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          className={styles.fileInput}
          onChange={(event) => {
            selectFile(event.target.files?.[0] ?? null);
            event.currentTarget.value = "";
          }}
        />
      </div>

      <AdminStorefrontCollections
        initialCollections={storefront?.collections ?? []}
        loading={loading}
        onCollectionsChange={handleCollectionsChange}
        onMutationComplete={invalidateParentStorefront}
      />
    </section>
  );
}

function clampPosition(value: number) {
  return Math.max(0, Math.min(100, value));
}
