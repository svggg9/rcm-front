"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "../components/ui/Button";
import { DisclosureSection } from "../components/ui/DisclosureSection";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { normalizeProductDetails, type ProductDetailsDraft } from "../lib/productDetails";
import type { CategoryOption } from "../lib/categories";
import { ProductGeneralCard } from "../seller/products/[id]/edit/components/ProductGeneralCard";
import { ProductPhotoEditor } from "../seller/products/[id]/edit/components/ProductPhotoEditor";
import { ProductDraftPreview } from "../seller/products/[id]/edit/components/ProductDraftPreview";
import { ProductShippingCard } from "../seller/products/[id]/edit/components/ProductShippingCard";
import { ProductVariantsCard } from "../seller/products/[id]/edit/components/ProductVariantsCard";
import type { Audience, ProductImageItem, ProductVariant } from "../seller/products/[id]/edit/types";
import styles from "./ProductEditorExample.module.css";

const categories: CategoryOption[] = [
  { id: 1, name: "Рубашки", label: "Рубашки", parentId: null, slug: "shirts", sortOrder: 1, isActive: true, effectiveActive: true, productCount: 0, subtreeProductCount: 0 },
  { id: 2, name: "Футболки", label: "Футболки", parentId: null, slug: "t-shirts", sortOrder: 2, isActive: true, effectiveActive: true, productCount: 0, subtreeProductCount: 0 },
];
const examples = [
  { value: "filled", label: "Заполненный" },
  { value: "empty", label: "Пустой" },
  { value: "locked", label: "Недоступен" },
] as const;
type Mode = (typeof examples)[number]["value"];
type Section = "general" | "photos" | "description" | "variants" | "shipping";
const sampleVariant: ProductVariant = { id: null, clientKey: "demo-one", groupKey: "demo-milk", sizeId: "", size: "M", colorId: "", color: "Молочный", price: 5900, availableQuantity: 6, sku: "", stockTrackingEnabled: true };
const sampleImages: ProductImageItem[] = [
  { id: 1, url: "/examples/demo-shirt-front.svg", sortOrder: 0, draftGroupKey: "demo-milk" },
  { id: 2, url: "/examples/demo-shirt-back.svg", sortOrder: 1, draftGroupKey: "demo-milk" },
];

/** Демонстрация настоящих блоков редактора, без сохранения и запросов. */
export function ProductEditorExample() {
  const [mode, setMode] = useState<Mode>("filled");
  return <div className={styles.example}>
    <p>Рабочие разделы редактора с условными данными. Все изменения остаются в примере</p>
    <p className="textHint">Проверка примера упрощена: она показывает ошибки нескольких обязательных полей и не проверяет все требования к публикации или загруженным файлам</p>
    <SegmentedControl items={examples} value={mode} onChange={setMode} ariaLabel="Состояние редактора товара" />
    <EditorDemo key={mode} filled={mode !== "empty"} locked={mode === "locked"} />
  </div>;
}

function EditorDemo({ filled, locked }: { filled: boolean; locked: boolean }) {
  const [title, setTitle] = useState(filled ? "Рубашка из хлопка" : "");
  const [description, setDescription] = useState(filled ? "Рубашка свободного кроя из хлопка" : "");
  const [composition, setComposition] = useState(filled ? "Хлопок 100%" : "");
  const [details, setDetails] = useState<ProductDetailsDraft>(() => normalizeProductDetails());
  const [category, setCategory] = useState<number | "">(filled ? 1 : "");
  const [suggestedCategory, setSuggestedCategory] = useState("");
  const [audience, setAudience] = useState<Audience>("UNISEX");
  const [variants, setVariants] = useState<ProductVariant[]>(() => [{ ...sampleVariant, ...(filled ? {} : { color: "", size: "", price: 0, availableQuantity: 0 }) }]);
  const [images, setImages] = useState<ProductImageItem[]>(() => filled ? sampleImages : []);
  const [dragImageId, setDragImageId] = useState<number | null>(null);
  const [width, setWidth] = useState<number | "">(filled ? 25 : "");
  const [height, setHeight] = useState<number | "">(filled ? 5 : "");
  const [length, setLength] = useState<number | "">(filled ? 30 : "");
  const [weight, setWeight] = useState<number | "">(filled ? 0.5 : "");
  const [open, setOpen] = useState<Record<Section, boolean>>({ general: true, photos: false, description: false, variants: false, shipping: false });
  const [checked, setChecked] = useState(false);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState("");
  const blobs = useRef<string[]>([]);
  const nextImageId = useRef(-1);
  useEffect(() => () => { blobs.current.forEach(url => URL.revokeObjectURL(url)); }, []);

  const toggle = (name: Section, value: boolean) => setOpen(current => ({ ...current, [name]: value }));
  const moveImage = (from: number, to: number) => setImages(current => {
    if (from < 0 || to < 0 || from >= current.length || to >= current.length) return current;
    const next = [...current]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next;
  });
  const missingGeneral = !title.trim() || (!category && !suggestedCategory.trim());
  const missingPhotos = images.length < 3 || images.length > 10;
  const missingDescription = !description.trim();
  const missingPrice = variants.length === 0 || variants.some(variant => variant.price <= 0);
  const missingShipping = [width, height, length, weight].some(value => value === "" || value <= 0);
  const generalProps = {
    validationErrors: { title: checked && !title.trim(), categoryId: checked && !category && !suggestedCategory.trim(), description: checked && missingDescription },
    title, description, composition, details, categoryId: category, suggestedCategoryName: suggestedCategory, audience, categories,
    onTitleChange: setTitle, onDescriptionChange: setDescription, onCompositionChange: setComposition,
    onDetailsChange: (key: keyof ProductDetailsDraft, value: string) => setDetails(current => ({ ...current, [key]: value })),
    onCategoryIdChange: setCategory, onSuggestedCategoryNameChange: setSuggestedCategory, onAudienceChange: setAudience,
  };
  return <div className={styles.editor}>
    {locked && <p className="textHint">Пример недоступного редактирования: изменение данных и фото отключено</p>}
    <DisclosureSection title="Основные данные" summary={category ? categories.find(item => item.id === category)?.name : "Категория и кому подходит"}
      status={checked && missingGeneral ? "Проверьте данные" : undefined} statusTone={checked && missingGeneral ? "error" : "default"}
      open={open.general} onOpenChange={value => toggle("general", value)}>
      <fieldset className={styles.fieldset} disabled={locked}><ProductGeneralCard section="general" {...generalProps} /></fieldset>
    </DisclosureSection>
    <DisclosureSection title="Фото" summary={`Фотографий: ${images.length}`} status={checked && missingPhotos ? "Проверьте фото" : undefined}
      statusTone={checked && missingPhotos ? "error" : "default"} open={open.photos} onOpenChange={value => toggle("photos", value)}>
      <ProductPhotoEditor showTitle={false} images={images} invalidImages={checked && missingPhotos} uploading={false} reordering={false} mediaDisabled={locked}
        mediaDisabledHint="Изменение фото недоступно в этом примере"
        dragImageId={dragImageId} uploadProgress={{ done: 0, total: 0 }} onFilesChange={() => {}}
        onUploadImages={files => { const selected = files.filter(file => file.type.startsWith("image/")).slice(0, Math.max(0, 10 - images.length));
          const added = selected.map(file => { const url = URL.createObjectURL(file); blobs.current.push(url); return { id: nextImageId.current--, url, sortOrder: 0 }; });
          setImages(current => [...current, ...added]); setMessage("Фотографии добавлены только в пример"); }}
        onDragImageStart={setDragImageId} onDragImageEnd={() => setDragImageId(null)}
        onMoveImage={id => { if (dragImageId !== null) moveImage(images.findIndex(image => image.id === dragImageId), images.findIndex(image => image.id === id)); setDragImageId(null); }}
        onMoveImageByIndex={moveImage} onDeleteImage={id => {
          const url = images.find(image => image.id === id)?.url;
          if (url?.startsWith("blob:")) { URL.revokeObjectURL(url); blobs.current = blobs.current.filter(item => item !== url); }
          setImages(current => current.filter(image => image.id !== id));
        }} />
    </DisclosureSection>
    <DisclosureSection title="Описание" summary={description || "Описание и дополнительные сведения"} status={checked && missingDescription ? "Проверьте описание" : undefined}
      statusTone={checked && missingDescription ? "error" : "default"} open={open.description} onOpenChange={value => toggle("description", value)}>
      <fieldset className={styles.fieldset} disabled={locked}><ProductGeneralCard section="description" {...generalProps} /></fieldset>
    </DisclosureSection>
    <DisclosureSection title="Цена и варианты" summary={variants[0]?.price ? `Цена ${new Intl.NumberFormat("ru-RU").format(variants[0].price)} ₽, вариантов: ${variants.length}` : "Общая цена, оттенки и размеры"}
      status={checked && missingPrice ? "Проверьте цену" : undefined} statusTone={checked && missingPrice ? "error" : "default"}
      open={open.variants} onOpenChange={value => toggle("variants", value)}>
      <ProductVariantsCard variants={variants} countInvalid={checked && variants.length === 0}
        validationErrors={checked && missingPrice ? Object.fromEntries(variants.map((_, index) => [index, { price: true }])) : {}}
        variantStructureDisabled={locked} operationalDisabled={locked}
        onUpdateVariant={(index, patch) => setVariants(current => current.map((variant, position) => position === index ? { ...variant, ...patch } : variant))}
        onAddVariant={base => setVariants(current => [...current, { ...sampleVariant, ...base, id: null, clientKey: crypto.randomUUID() }])}
        onRemoveVariant={index => setVariants(current => current.filter((_, position) => position !== index))}
        onOpenPhotos={() => toggle("photos", true)} />
    </DisclosureSection>
    <DisclosureSection title="Упаковка" summary="Размеры и вес в упаковке" status={checked && missingShipping ? "Проверьте упаковку" : undefined}
      statusTone={checked && missingShipping ? "error" : "default"} open={open.shipping} onOpenChange={value => toggle("shipping", value)}>
      <fieldset className={styles.fieldset} disabled={locked}><ProductShippingCard validationErrors={{ packageWidthCm: checked && !width, packageHeightCm: checked && !height, packageLengthCm: checked && !length, packageWeightKg: checked && !weight }}
        packageWidthCm={width} packageHeightCm={height} packageLengthCm={length} packageWeightKg={weight}
        onPackageWidthCmChange={setWidth} onPackageHeightCmChange={setHeight} onPackageLengthCmChange={setLength} onPackageWeightKgChange={setWeight} /></fieldset>
    </DisclosureSection>
    <div className={styles.actions}>
      <Button type="button" onClick={() => { setChecked(true); setOpen({ general: missingGeneral, photos: missingPhotos, description: missingDescription, variants: missingPrice, shipping: missingShipping }); setMessage("Упрощённая проверка примера выполнена"); }}>Проверить поля примера</Button>
      <Button type="button" variant="secondary" aria-expanded={preview} onClick={() => setPreview(value => !value)}>{preview ? "Закрыть предпросмотр" : "Предпросмотр товара"}</Button>
    </div>
    {preview && <ProductDraftPreview title={title} brand="Демонстрационный бренд" description={description} composition={composition} details={details}
      category={categories.find(item => item.id === category)?.name || suggestedCategory} audience={audience} variants={variants} images={images} />}
    <p className="textHint" role="status">{message || "Данные не отправляются и не сохраняются"}</p>
  </div>;
}
