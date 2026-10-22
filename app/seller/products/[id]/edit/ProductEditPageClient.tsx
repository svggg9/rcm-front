"use client";
import { Loader } from "../../../../components/ui/Loader";
import { PRODUCT_PHOTO_COUNT_ERROR, validProductPhotoCount, validateProductPhotoUpload } from "../../../../lib/productPhotos";

import { hasDescriptionContent } from "../../../../lib/productDescription";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { apiFetch, API_URL } from "../../../../lib/api";
import { createAutosaveQueue, hasOperationalChanges, reconcileSavedVariants } from "./productAutosave";
import { normalizeCategories, type CategoryOption } from "../../../../lib/categories";
import { isRequestCancelled, toApiError } from "../../../../lib/apiErrors";
import { subscribeCategoriesChanged } from "../../../../lib/categoryEvents";
import { Button } from "../../../../components/ui/Button";
import { Banner } from "../../../../components/ui/Banner";
import { Dialog } from "../../../../components/ui/Dialog";
import { Icon } from "../../../../components/ui/Icon";
import {
  scrollToFirstValidationError as scrollToFirstValidationErrorShared,
} from "../../../../lib/formValidation";

import { ProductDraftPreview } from "./components/ProductDraftPreview";
import { ProductRevisionReview } from "./components/ProductRevisionReview";
import { ProductGeneralCard } from "./components/ProductGeneralCard";
import { ProductEditableTitle } from "./components/ProductEditableTitle";
import { ProductVariantsCard } from "./components/ProductVariantsCard";
import { ProductShippingCard } from "./components/ProductShippingCard";
import { ProductPhotoEditor } from "./components/ProductPhotoEditor";
import { commitProductMedia, readSavedProduct, type PendingPhoto } from "./productMediaDraft";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { PRODUCT_EDITOR_STEPS, getProductEditorErrorStep, type ProductEditorStep } from "./editorSteps";
import { EditorSurface, requestEditorNavigation } from "../../../../components/ui/EditorSurface";
import { productActionBlockedReason, productActionResponseError } from "../../../lib/sellerProductActions";
import { emitSellerNavigationChanged } from "../../../lib/sellerNavigationEvents";
import {
  getSellerOnboardingStatus,
  type SellerOnboardingStatus,
} from "../../../lib/sellerOnboardingApi";
import { toast as globalToast, type ExternalToast } from "@/app/components/ui/toast";

import type {
  Audience,
  Option,
  ProductImageItem,
  ProductVariant,
  SellerProduct,
} from "./types";
import { numberOrNull, formatProductStatus, getProductStatusTone, inconsistentColorPriceIndexes, variantColorGroupKey } from "./utils";

import styles from "./ProductEditPage.module.css";

const toast = {
  dismiss: globalToast.dismiss,
  error: (message: string, options?: ExternalToast) => globalToast.error(message, { ...options, toasterId: "product-editor" }),
  success: (message: string, options?: ExternalToast) => globalToast.success(message, { ...options, toasterId: "product-editor" }),
  info: (message: string, options?: ExternalToast) => globalToast.info(message, { ...options, toasterId: "product-editor" }),
  warning: (message: string, options?: ExternalToast) => globalToast.warning(message, { ...options, toasterId: "product-editor" }),
};

const MODAL_FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

type Props = {
  intercepted?: boolean;
  presentation?: "dialog" | "page";
  productId: number;
  initialProduct: SellerProduct;
  initialCategories: CategoryOption[];
  initialCategoryError?: boolean;
  initialBrands: Option[];
};

type ValidationErrors = {
  variantCount?: boolean;
  title?: boolean;
  description?: boolean;
  composition?: boolean;
  categoryId?: boolean;
  brandId?: boolean;
  images?: boolean;
  packageWidthCm?: boolean;
  packageHeightCm?: boolean;
  packageLengthCm?: boolean;
  packageWeightKg?: boolean;
  variants?: Record<
    number,
    {
      sku?: boolean;
      sizeId?: boolean;
      colorId?: boolean;
      price?: boolean;
      availableQuantity?: boolean;
    }
  >;
};

function createVariantClientKey() {
  return `variant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyVariant(): ProductVariant {
  const clientKey = createVariantClientKey();

  return {
    id: null,
    clientKey,
    groupKey: clientKey,
    size: "",
    sizeId: "",
    colorId: "",
    color: "",
    colorHex: null,
    price: 0,
    availableQuantity: 0,
    sku: `draft-${crypto.randomUUID()}`,
    sellerArticle: "",
    stockTrackingEnabled: true,
  };
}

function mapProductVariants(productData: SellerProduct): ProductVariant[] {
  return Array.isArray(productData.variants) && productData.variants.length
    ? productData.variants.map((variant) => ({
        id: variant.id,
        clientKey: variant.id ? `saved-${variant.id}` : createVariantClientKey(),
        colorwayId: variant.colorwayId ?? null,
        sizeId: variant.sizeId ?? "",
        size: variant.size ?? "",
        colorId: variant.colorId ?? "",
        color: variant.color ?? "",
        colorHex: variant.colorHex ?? null,
        price: Number(variant.price ?? 0),
        availableQuantity: variant.stockTrackingEnabled ? (variant.stockQuantity ?? variant.availableQuantity ?? 0) : null,
        initialQuantity: variant.stockTrackingEnabled ? (variant.stockQuantity ?? variant.availableQuantity ?? 0) : null,
        initialStockTrackingEnabled: variant.stockTrackingEnabled,
        reservedQuantity: variant.reservedQuantity ?? 0,
        initialPrice: Number(variant.price ?? 0),
        initialSellerArticle: variant.sellerArticle ?? "",
        sku: variant.sku ?? "",
        sellerArticle: variant.sellerArticle ?? "",
        stockTrackingEnabled: variant.stockTrackingEnabled,
      }))
    : [createEmptyVariant()];
}

function getInitialTitle(product: SellerProduct) {
  const title = product.title?.trim() ?? "";

  if (product.status === "DRAFT" && (title === "" || title === "Новый товар")) {
    return "";
  }

  return product.title ?? "";
}

function productListHref() {
  const target = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("returnTo");
  return target === "/seller/products" || target?.startsWith("/seller/products?") ? target : "/seller/products";
}

export function ProductEditPageClient({
  intercepted = false,
  presentation = "dialog",
  productId: initialProductId,
  initialProduct,
  initialCategories,
  initialCategoryError = false,
  initialBrands,
}: Props) {
  const router = useRouter();
  const [productId, setProductId] = useState(initialProductId);
  const persistedProduct = useRef(initialProduct);
  const creationRequest = useRef<{ clientDraftId: string; product: unknown } | null>(null);
  const dirtyRef = useRef(false);
  const [editGeneration, setEditGeneration] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "pending" | "saving" | "saved" | "error" | "manual">("idle");
  const [saveError, setSaveError] = useState("");
  const saveCallback = useRef<() => Promise<boolean>>(async () => true);
  const [autosaveQueue] = useState(() => createAutosaveQueue(() => saveCallback.current()));
  const [dirty, setDirty] = useState(false);
  const [draftPreviewOpen, setDraftPreviewOpen] = useState(false);
  useEffect(() => {
    if (initialProduct.status === "DELETED" && initialProduct.revisionSourceId) {
      router.replace(`/seller/products/${initialProduct.revisionSourceId}/edit?returnTo=${encodeURIComponent(productListHref())}`);
    }
  }, [initialProduct.status, initialProduct.revisionSourceId, router]);
  // All widths use the same continuous form and anchor navigation.
  const [activeStep, setActiveStep] = useState<ProductEditorStep>("general");
  const [revisionReviewSource, setRevisionReviewSource] = useState<SellerProduct | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const reviewRequestRef = useRef(false);
  const saveRequestRef = useRef(false);
  const publishRequestRef = useRef(false);

  const [product, setProduct] = useState<SellerProduct | null>(initialProduct);
  const [categories, setCategories] = useState<CategoryOption[]>(initialCategories);
  const [categoryError, setCategoryError] = useState<string | null>(initialCategoryError ? "Не удалось загрузить категории" : null);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryLoadAttempt, setCategoryLoadAttempt] = useState(0);
  useEffect(() => subscribeCategoriesChanged(() => setCategoryLoadAttempt(attempt => attempt + 1)), []);
  const [brands] = useState<Option[]>(initialBrands);

  const [title, setTitle] = useState(() => getInitialTitle(initialProduct));
  const [titleDraftDirty, setTitleDraftDirty] = useState(false);
  const [description, setDescription] = useState(initialProduct.description ?? "");
  const [composition, setComposition] = useState(initialProduct.composition ?? "");
  const [categoryId, setCategoryId] = useState<number | "">(
    initialProduct.categoryId ?? ""
  );
  const [suggestedCategoryName, setSuggestedCategoryName] = useState(
    initialProduct.suggestedCategoryName ?? ""
  );
  const [brandId] = useState<number | "">(
    initialProduct.brandId ?? initialBrands[0]?.id ?? ""
  );
  const [audience, setAudience] = useState<Audience>(
    initialProduct.audience ?? "UNISEX"
  );

  const [packageWidthCm, setPackageWidthCm] = useState<number | "">(
    initialProduct.packageWidthCm ?? ""
  );
  const [packageHeightCm, setPackageHeightCm] = useState<number | "">(
    initialProduct.packageHeightCm ?? ""
  );
  const [packageLengthCm, setPackageLengthCm] = useState<number | "">(
    initialProduct.packageLengthCm ?? ""
  );
  const [packageWeightKg, setPackageWeightKg] = useState<number | "">(
    initialProduct.packageWeightKg ?? ""
  );

  const [variants, setVariants] = useState<ProductVariant[]>(() =>
    mapProductVariants(initialProduct)
  );
  const [images, setImages] = useState<ProductImageItem[]>(() =>
    Array.isArray(initialProduct.imageItems) ? initialProduct.imageItems : []
  );

  const [dragImageId, setDragImageId] = useState<number | null>(null);
  const pendingPhotos = useRef(new Map<number, PendingPhoto>());
  const deletedPhotos = useRef(new Set<number>());
  const photoUrls = useRef(new Set<string>());
  const nextPhotoId = useRef(-1);
  const photoStaging = useRef(false);
  const [photoGroupKey, setPhotoGroupKey] = useState("");
  useEffect(() => {
    const urls = photoUrls.current;
    return () => { urls.forEach(url => URL.revokeObjectURL(url)); urls.clear(); };
  }, []);

  const [saving, setSaving] = useState(false);
  const [automaticSaving, setAutomaticSaving] = useState(false);
  const [saveSucceeded, setSaveSucceeded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const reordering = false;
  const [publishing, setPublishing] = useState(false);
  const [, setPublishSucceeded] = useState(false);
  const [publishSuccessOpen, setPublishSuccessOpen] = useState(false);
  const [creatingNextProduct, setCreatingNextProduct] = useState(false);
  const [openingRevision, setOpeningRevision] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState<"archive" | "delete" | null>(null);
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const confirmationPending = useRef(false);
  const [mediaActionPending, setMediaActionPending] = useState(false);
  const [onboardingStatus, setOnboardingStatus] =
    useState<SellerOnboardingStatus | null>(null);
  const [onboardingError, setOnboardingError] = useState(false);
  const [onboardingRetry, setOnboardingRetry] = useState(0);

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const pageContentRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const body = pageContentRef.current?.closest<HTMLElement>("[data-editor-body]");
    if (!body) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const top = presentation === "page"
          ? (document.querySelector("[data-editor-page] [data-editor-navigation]")?.getBoundingClientRect().bottom ?? 0) + 48
          : body.getBoundingClientRect().top + 80;
        let current: ProductEditorStep = "general";
        for (const step of PRODUCT_EDITOR_STEPS) {
          const panel = document.getElementById(step.panelId);
          if (panel && panel.getBoundingClientRect().top <= top) current = step.id;
        }
        setActiveStep(current);
      });
    };
    const scrollTarget = presentation === "page" ? window : body;
    scrollTarget.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { scrollTarget.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(frame); };
  }, [presentation]);
  const editRevisionRef = useRef(0);
  const publishSuccessDialogRef = useRef<HTMLDivElement | null>(null);
  const publishSuccessCloseRef = useRef<HTMLButtonElement | null>(null);
  const publishSuccessReturnFocusRef = useRef<HTMLElement | null>(null);
  const productPageMountedRef = useRef(true);
  const creatingNextProductRef = useRef(false);

  const [uploadProgress, setUploadProgress] = useState({
      done: 0,
      total: 0,
    });

  useEffect(() => {
    productPageMountedRef.current = true;
    return () => {
      productPageMountedRef.current = false;
    };
  }, []);

  const autosaveAllowed = canEditProductContent(product?.status);
  useEffect(() => {
    saveCallback.current = () => dirtyRef.current ? saveProduct(false, true) : Promise.resolve(true);
  });
  useEffect(() => { if (product) persistedProduct.current = product; }, [product]);
  useEffect(() => {
    if (editGeneration && autosaveAllowed) autosaveQueue.schedule();
  }, [editGeneration, autosaveAllowed, autosaveQueue]);
  useEffect(() => {
    return () => autosaveQueue.cancel();
  }, [autosaveQueue]);

  useEffect(() => {
    let cancelled = false;

    setOnboardingError(false);

    void getSellerOnboardingStatus()
      .then((status) => {
        if (!cancelled) setOnboardingStatus(status);
      })
      .catch(() => {
        if (!cancelled) setOnboardingError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [onboardingRetry]);

  useEffect(() => {
    if (categoryLoadAttempt === 0) return;
    const controller = new AbortController();
    setCategoryLoading(true);
    void apiFetch(`${API_URL}/api/catalog/categories`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]) })
      .then(async response => {
        if (!response.ok) throw new Error("Category dictionary unavailable");
        return normalizeCategories(await response.json());
      }).then(items => {
        if (controller.signal.aborted) return;
        setCategories(items);
        setCategoryError(null);
      }).catch(error => {
        if (!isRequestCancelled(error) && !controller.signal.aborted) setCategoryError(toApiError(error, "Не удалось загрузить категории").message);
      }).finally(() => { if (!controller.signal.aborted) setCategoryLoading(false); });
    return () => controller.abort();
  }, [categoryLoadAttempt]);

  useEffect(() => {
    if (!publishSuccessOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    const returnFocusTarget = publishSuccessReturnFocusRef.current;
    const pageContent = pageContentRef.current;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      publishSuccessCloseRef.current?.focus({ preventScroll: true });
    });

    function handleModalKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !creatingNextProductRef.current) {
        event.preventDefault();
        setPublishSuccessOpen(false);
        return;
      }

      if (event.key !== "Tab") return;

      const dialog = publishSuccessDialogRef.current;
      if (!dialog) return;

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(MODAL_FOCUSABLE_SELECTOR)
      );
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements.at(-1);

      if (!firstFocusable || !lastFocusable) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }

      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === firstFocusable || !dialog.contains(activeElement)) {
          event.preventDefault();
          lastFocusable.focus({ preventScroll: true });
        }
      } else if (
        activeElement === lastFocusable ||
        !dialog.contains(activeElement)
      ) {
        event.preventDefault();
        firstFocusable.focus({ preventScroll: true });
      }
    }

    document.addEventListener("keydown", handleModalKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleModalKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;

      window.requestAnimationFrame(() => {
        if (
          returnFocusTarget?.isConnected &&
          !returnFocusTarget.matches(':disabled, [aria-disabled="true"]')
        ) {
          returnFocusTarget.focus({ preventScroll: true });
          return;
        }

        if (pageContent?.isConnected) {
          pageContent.focus({ preventScroll: true });
        }
      });
    };
  }, [publishSuccessOpen]);

  function markDirty() {
    editRevisionRef.current += 1;
    dirtyRef.current = true;
    setEditGeneration(value => value + 1);
    setSaveState("pending");
    setDirty(true);
  }

  function clearValidationError(key: keyof ValidationErrors, stillInvalid = false) {
    setValidationErrors((current) => ({
      ...current,
      [key]: current[key] && stillInvalid ? true : undefined,
    }));
  }

  function updateTitle(value: string) {
    setTitle(value);
    clearValidationError("title", !value.trim());
    if (value.trim() !== title.trim()) markDirty();
  }

  function clearVariantValidationError(
    index: number,
    field: "sku" | "sizeId" | "colorId" | "price" | "availableQuantity"
  ) {
    setValidationErrors((current) => {
      if (!current.variants?.[index]) {
        return current;
      }

      const nextVariants = {
        ...current.variants,
        [index]: {
          ...current.variants[index],
          [field]: undefined,
        },
      };

      return {
        ...current,
        variants: nextVariants,
      };
    });
  }

  function selectEditorStep(step: ProductEditorStep, focusPanel = false) {
    setActiveStep(step);
    window.requestAnimationFrame(() => {
      const panelId = PRODUCT_EDITOR_STEPS.find(item => item.id === step)?.panelId;
      const panel = panelId ? document.getElementById(panelId) : null;
      panel?.scrollIntoView({ behavior: "auto", block: "start" });
      if (focusPanel) panel?.focus({ preventScroll: true });
    });
  }

  function scrollToFirstValidationError(errors: ValidationErrors) {
    if (errors.title && presentation === "page") {
      setActiveStep("general");
      window.requestAnimationFrame(() => {
        const heading = document.querySelector<HTMLElement>("[data-editor-page] [data-product-title]");
        heading?.scrollIntoView({ behavior: "auto", block: "center" });
        heading?.focus({ preventScroll: true });
      });
      return;
    }
    const errorStep = getProductEditorErrorStep(errors);
    if (errorStep) setActiveStep(errorStep);
    window.requestAnimationFrame(() => {
      const panelId = PRODUCT_EDITOR_STEPS.find(item => item.id === errorStep)?.panelId;
      const panel = panelId ? document.getElementById(panelId) : pageContentRef.current;
      panel?.focus({ preventScroll: true });
      scrollToFirstValidationErrorShared({
        root: panel,
      });
    });
  }

  function validateProduct() {
  const nextErrors: ValidationErrors = {};
  const stepMessages: Record<ProductEditorStep, string[]> = {
    general: [], description: [], variants: [], shipping: [], photos: [],
  };

  if (!title.trim()) {
    nextErrors.title = true;
    stepMessages.general.push("Заполните название товара");
  }

  if (!hasDescriptionContent(description) || description.length > 2000) {
    nextErrors.description = true;
    stepMessages.description.push(description.length > 2000 ? "Описание должно быть не длиннее 2000 символов" : "Заполните описание");
  }

  if (categoryId === "" && !suggestedCategoryName.trim()) {
    nextErrors.categoryId = true;
    stepMessages.general.push("Выберите категорию или предложите свою");
  }

  if (brandId === "") {
    nextErrors.brandId = true;
    stepMessages.general.push("Выберите бренд или производителя");
  }

  if (composition.length > 1000) {
    nextErrors.composition = true;
    stepMessages.description.push("Состав должен быть не длиннее 1000 символов");
  }

  if (!validProductPhotoCount(images.length)) {
    nextErrors.images = true;
    stepMessages.photos.push(PRODUCT_PHOTO_COUNT_ERROR);
  }

  if ((packageWidthCm === "" || !Number.isFinite(packageWidthCm) || packageWidthCm <= 0)) nextErrors.packageWidthCm = true;
  if ((packageHeightCm === "" || !Number.isFinite(packageHeightCm) || packageHeightCm <= 0)) nextErrors.packageHeightCm = true;
  if ((packageLengthCm === "" || !Number.isFinite(packageLengthCm) || packageLengthCm <= 0)) nextErrors.packageLengthCm = true;
  if ((packageWeightKg === "" || !Number.isFinite(packageWeightKg) || packageWeightKg <= 0)) nextErrors.packageWeightKg = true;

  if ((packageWidthCm === "" || !Number.isFinite(packageWidthCm) || packageWidthCm <= 0) || (packageHeightCm === "" || !Number.isFinite(packageHeightCm) || packageHeightCm <= 0) || (packageLengthCm === "" || !Number.isFinite(packageLengthCm) || packageLengthCm <= 0) || (packageWeightKg === "" || !Number.isFinite(packageWeightKg) || packageWeightKg <= 0)) {
    stepMessages.shipping.push("Заполните вес и габариты с упаковкой");
  }

  if (variants.length === 0) {
    nextErrors.variantCount = true;
    stepMessages.variants.push("Добавьте хотя бы один вариант товара");
  }

  const variantErrors: ValidationErrors["variants"] = {};
  const sizeKeysByGroup = new Map<string, Map<string, number>>();
  const colorKeysByGroup = new Map<string, number>();
  const checkedColorGroups = new Set<string>();

  variants.forEach((variant, index) => {
    const current: NonNullable<ValidationErrors["variants"]>[number] = {};
    if (!Number.isFinite(variant.price) || variant.price <= 0) current.price = true;

    const groupKey =
      variant.groupKey ||
      (variant.colorwayId
        ? `colorway-${variant.colorwayId}`
        : variant.colorId
          ? `color-${variant.colorId}`
          : variant.color.trim()
            ? `color-name-${variant.color.trim().toLowerCase()}`
            : "no-color");
    const colorKey = variant.color.trim()
        ? `name-${variant.color.trim().toLowerCase()}`
        : "no-color";

    if (!checkedColorGroups.has(groupKey)) {
      const duplicateColorIndex = colorKeysByGroup.get(colorKey);

      if (duplicateColorIndex !== undefined) {
        current.colorId = true;
        variantErrors[duplicateColorIndex] = {
          ...variantErrors[duplicateColorIndex],
          colorId: true,
        };
      } else {
        colorKeysByGroup.set(colorKey, index);
      }

      checkedColorGroups.add(groupKey);
    }

    const sizeKey = variant.sizeId
      ? `id-${variant.sizeId}`
      : variant.size.trim()
        ? `name-${variant.size.trim().toLowerCase()}`
        : "no-size";
    const groupSizeKeys = sizeKeysByGroup.get(groupKey) ?? new Map<string, number>();
    const duplicateIndex = groupSizeKeys.get(sizeKey);

    if (duplicateIndex !== undefined) {
      current.sizeId = true;
      variantErrors[duplicateIndex] = {
        ...variantErrors[duplicateIndex],
        sizeId: true,
      };
    } else {
      groupSizeKeys.set(sizeKey, index);
      sizeKeysByGroup.set(groupKey, groupSizeKeys);
    }

    if (variant.stockTrackingEnabled && (variant.availableQuantity === null || !Number.isSafeInteger(variant.availableQuantity) || variant.availableQuantity < 0)) {
      current.availableQuantity = true;
    }

    if (Object.keys(current).length > 0) {
      variantErrors[index] = current;
    }
  });

  inconsistentColorPriceIndexes(variants).forEach(index => {
    variantErrors[index] = { ...variantErrors[index], price: true };
  });

  if (Object.keys(variantErrors).length > 0) {
    nextErrors.variants = variantErrors;
    stepMessages.variants.push("Проверьте варианты товара: вариант, размер, цену и остатки");
  }

  setValidationErrors(nextErrors);
  const messages = PRODUCT_EDITOR_STEPS.flatMap(step => stepMessages[step.id]);

  return {
    valid: messages.length === 0 && Object.keys(nextErrors).length === 0,
    message: messages[0] ?? null,
    messages,
    errors: nextErrors,
  };
  }

  async function saveProduct(forModeration = false, automatic = false): Promise<boolean> {
    if (
      saveRequestRef.current ||
      (publishRequestRef.current && !forModeration) ||
      (publishing && !forModeration) ||
      archiving ||
      deleting ||
      uploading ||
      reordering ||
      (mediaActionPending && !automatic)
    ) return false;

    if (!canEditProductOperations(product?.status)) {
      toast.warning(getProductEditUnavailableReason(product?.status), { id: "product-save" });
      return false;
    }

    const draftErrors: ValidationErrors = {};
    if (composition.length > 1000) draftErrors.composition = true;
    if (description.length > 2000) draftErrors.description = true;
    for (const [key, value] of [["packageWidthCm", packageWidthCm], ["packageHeightCm", packageHeightCm], ["packageLengthCm", packageLengthCm], ["packageWeightKg", packageWeightKg]] as const) {
      if (value !== "" && (!Number.isFinite(value) || value <= 0)) draftErrors[key] = true;
    }
    variants.forEach((variant, index) => {
      const fields: NonNullable<ValidationErrors["variants"]>[number] = {};
      if (!Number.isFinite(variant.price) || variant.price < 0) fields.price = true;
      if (variant.stockTrackingEnabled && (variant.availableQuantity === null || !Number.isSafeInteger(variant.availableQuantity) || variant.availableQuantity < 0)) fields.availableQuantity = true;
      if (Object.keys(fields).length) draftErrors.variants = { ...draftErrors.variants, [index]: fields };
    });
    inconsistentColorPriceIndexes(variants).forEach(index => {
      draftErrors.variants = { ...draftErrors.variants, [index]: { ...draftErrors.variants?.[index], price: true } };
    });
    const shadeGroups = new Map<string, string>();
    variants.forEach((variant, index) => {
      const shade = variant.color.trim().toLocaleLowerCase();
      const group = variantColorGroupKey(variant);
      if (shadeGroups.has(shade) && shadeGroups.get(shade) !== group) {
        draftErrors.variants = { ...draftErrors.variants, [index]: { ...draftErrors.variants?.[index], colorId: true } };
      }
      shadeGroups.set(shade, group);
    });
    if (Object.keys(draftErrors).length) {
      setValidationErrors(draftErrors);
      setSaveState("error");
      setSaveError("Проверьте выделенные поля — изменения ещё не сохранены");
      if (!automatic) scrollToFirstValidationError(draftErrors);
      return false;
    }
    setValidationErrors({});
    saveRequestRef.current = true;
    setSaveSucceeded(false);
    setSaving(true);
    setAutomaticSaving(automatic);
    setSaveState("saving");
    setSaveError("");
    const saveRevision = editRevisionRef.current;
    const preserveOperations = automatic && Boolean(product?.revisionSourceId);
    const snapshotImages = [...images];
    let metadataSaved = false;

    try {
      const variantsToSave = variants;
      const payload = {
          expectedVersion: persistedProduct.current.version,
          title: product?.status === "ACTIVE" ? product.title : title.trim(),
          description: product?.status === "ACTIVE" ? product.description : description.trim(),
          composition: composition.trim(),
          categoryId: categoryId ? Number(categoryId) : null,
          suggestedCategoryName: suggestedCategoryName.trim() || null,
          brandId: brandId === "" ? null : Number(brandId),
          audience,
          packageWidthCm: numberOrNull(packageWidthCm),
          packageHeightCm: numberOrNull(packageHeightCm),
          packageLengthCm: numberOrNull(packageLengthCm),
          packageWeightKg: numberOrNull(packageWeightKg),
          variants: variantsToSave.map((variant) => ({
            id: variant.id,
            colorwayId: variant.colorwayId ?? null,
            sizeId: variant.sizeId ? Number(variant.sizeId) : null,
            suggestedSizeName: variant.sizeId ? null : variant.size.trim() || null,
            colorId: variant.colorId ? Number(variant.colorId) : null,
            suggestedColorName: variant.color.trim() || null,
            price: preserveOperations && variant.id !== null ? variant.initialPrice : Number(variant.price),
            stockQuantity: (preserveOperations && variant.id !== null) || (variant.id !== null && variant.availableQuantity === variant.initialQuantity)
              ? null : variant.availableQuantity,
            operationalChanged: !preserveOperations && (variant.id === null || variant.price !== variant.initialPrice ||
              variant.stockTrackingEnabled !== variant.initialStockTrackingEnabled ||
              variant.availableQuantity !== variant.initialQuantity ||
              (variant.sellerArticle ?? "") !== (variant.initialSellerArticle ?? "")),
            priceChanged: variant.id === null || variant.price !== variant.initialPrice,
            sellerArticleChanged: variant.id === null ||
              (variant.sellerArticle ?? "") !== (variant.initialSellerArticle ?? ""),
            stockTrackingChanged: variant.id === null ||
              variant.stockTrackingEnabled !== variant.initialStockTrackingEnabled,
            sku: variant.sku.trim() || null,
            sellerArticle: preserveOperations && variant.id !== null ? variant.initialSellerArticle : variant.sellerArticle?.trim() || null,
            stockTrackingEnabled: preserveOperations && variant.id !== null ? variant.initialStockTrackingEnabled : variant.stockTrackingEnabled,
          })),
      };
      let savedProduct: SellerProduct;
      let targetId = persistedProduct.current.id;
      if (!targetId) {
        creationRequest.current ??= { clientDraftId: crypto.randomUUID(), product: payload };
        const response = await apiFetch(`${API_URL}/api/seller/products/drafts`, {
          method: "POST", body: JSON.stringify(creationRequest.current), signal: AbortSignal.timeout(20000),
        });
        if (!response.ok) throw new Error(await productActionResponseError(response));
        savedProduct = await response.json();
        if (!Number.isSafeInteger(savedProduct.id) || savedProduct.id <= 0) throw new Error("Сервер не подтвердил сохранение черновика");
        targetId = savedProduct.id;
        persistedProduct.current = savedProduct;
        setProductId(targetId);
        // Keep this mounted form and its newest edits while making refresh open the saved draft.
        window.history.replaceState(window.history.state, "", `/seller/products/${targetId}/create?returnTo=${encodeURIComponent(productListHref())}`);
        // A retry can acknowledge an older first snapshot. Persist the latest values using its version and IDs.
        const bySku = new Map(savedProduct.variants.map(variant => [variant.sku, variant]));
        payload.expectedVersion = savedProduct.version;
        payload.variants = payload.variants.map(variant => ({ ...variant,
          id: variant.id ?? bySku.get(variant.sku ?? "")?.id ?? null,
          colorwayId: variant.colorwayId ?? bySku.get(variant.sku ?? "")?.colorwayId ?? null,
        }));
      }
      const response = await apiFetch(`${API_URL}/api/seller/products/${targetId}`, {
        method: "PUT", body: JSON.stringify(payload), signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(await productActionResponseError(response));
      metadataSaved = true;
      savedProduct = await readSavedProduct(targetId);
      persistedProduct.current = savedProduct;
      setProduct(savedProduct);
      setVariants(current => reconcileSavedVariants(current, mapProductVariants(savedProduct)));
      if (pendingPhotos.current.size || deletedPhotos.current.size || snapshotImages.some((image, index) => savedProduct.imageItems?.[index]?.id !== image.id)) {
        setMediaActionPending(true);
        savedProduct = await commitProductMedia({ productId: targetId, savedProduct, desired: snapshotImages, variants: variantsToSave, pending: pendingPhotos.current, deleted: deletedPhotos.current, onProgress: setUploadProgress });
      }
      persistedProduct.current = savedProduct;
      setProduct(savedProduct);
      setVariants(current => reconcileSavedVariants(current, mapProductVariants(savedProduct)));
      setImages(savedProduct.imageItems ?? []);
      pendingPhotos.current.clear();
      deletedPhotos.current.clear();
      photoUrls.current.forEach(url => URL.revokeObjectURL(url));
      photoUrls.current.clear();
      const manualPending = preserveOperations && hasOperationalChanges(variantsToSave);
      const newerEdits = editRevisionRef.current !== saveRevision;
      dirtyRef.current = newerEdits || manualPending;
      setDirty(dirtyRef.current);
      setSaveState(newerEdits ? "pending" : manualPending ? "manual" : "saved");
      emitSellerNavigationChanged();
      if (!newerEdits) {
        if (!forModeration && !automatic) {
          toast.success("Товар сохранён", { id: "product-save", description: undefined, action: undefined });
          setSaveSucceeded(true);
          window.setTimeout(() => setSaveSucceeded(false), 1200);
        } else {
          toast.dismiss("product-save");
        }
        return true;
      }
      return true;
    } catch (e) {
      if (metadataSaved) {
        try {
          const current = await readSavedProduct(persistedProduct.current.id);
          persistedProduct.current = current;
          setProduct(current);
          setVariants(local => reconcileSavedVariants(local, mapProductVariants(current)));
        } catch { /* Keep the draft; a version conflict will prevent overwriting newer data. */ }
        setDirty(true);
      }
      dirtyRef.current = true;
      setSaveState("error");
      const message = metadataSaved ? "Данные сохранены, но не все фотографии — повторите сохранение"
        : e instanceof TypeError || e instanceof SyntaxError || (e instanceof Error && ["TimeoutError", "AbortError"].includes(e.name))
          ? "Сервер не подтвердил сохранение — проверьте соединение и повторите попытку"
          : e instanceof Error ? e.message : "Не удалось сохранить товар";
      setSaveError(message);
      if (!automatic) toast.error(message, { id: "product-save" });
      return false;
    } finally {
      saveRequestRef.current = false;
      setSaving(false);
      setAutomaticSaving(false);
      setMediaActionPending(false);
      setUploadProgress({ done: 0, total: 0 });
    }
  }

  async function flushBeforeLeave() {
    if (!autosaveAllowed) return false;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    await new Promise(resolve => window.setTimeout(resolve, 0));
    if (!(await autosaveQueue.flush())) return false;
    return !dirtyRef.current;
  }

  async function saveNow() {
    if (autosaveAllowed && !(await autosaveQueue.flush())) return;
    if (dirtyRef.current) await manualSaveCallback.current();
  }

  const manualSaveCallback = useRef<() => Promise<boolean>>(async () => false);
  useEffect(() => { manualSaveCallback.current = () => saveProduct(); });
  const publishCallback = useRef<() => Promise<void>>(async () => {});
  useEffect(() => { publishCallback.current = () => publishProduct(); });
  async function flushAndPublish() {
    if (autosaveAllowed && !(await autosaveQueue.flush())) return;
    await publishCallback.current();
  }

  async function uploadImages(filesToUpload: File[], groupKey: string) {
    if (!filesToUpload.length || !canEditProductContent(product?.status) || productMutationBusy || saving || photoStaging.current) return;
    photoStaging.current = true;
    setUploading(true);
    const staged: ProductImageItem[] = [];
    try {
      await validateProductPhotoUpload(filesToUpload, images.length);
      for (const file of filesToUpload) {
        const bitmap = await createImageBitmap(file);
        const url = URL.createObjectURL(file);
        const id = nextPhotoId.current--;
        const token = crypto.randomUUID();
        staged.push({ id, url, draftGroupKey: groupKey, clientUploadId: token, sortOrder: images.length + staged.length, width: bitmap.width, height: bitmap.height });
        bitmap.close();
      }
      staged.forEach((image, index) => { photoUrls.current.add(image.url); pendingPhotos.current.set(image.id, { file: filesToUpload[index], clientUploadId: image.clientUploadId! }); });
      setImages(current => [...current, ...staged]);
      markDirty();
      clearValidationError("images");
    } catch (error) {
      staged.forEach(image => URL.revokeObjectURL(image.url));
      toast.error(error instanceof Error ? error.message : "Не удалось добавить фотографии");
    } finally {
      photoStaging.current = false;
      setUploading(false);
    }
  }

  function deleteImage(imageId: number) {
    if (!canEditProductContent(product?.status) || productMutationBusy || saving) return;
    if (imageId > 0) deletedPhotos.current.add(imageId);
    else {
      pendingPhotos.current.delete(imageId);
      const image = images.find(item => item.id === imageId);
      if (image) { URL.revokeObjectURL(image.url); photoUrls.current.delete(image.url); }
    }
    setImages(current => current.filter(image => image.id !== imageId));
    markDirty();
  }

  function moveImage(targetImageId: number) {
    if (!canEditProductContent(product?.status) || productMutationBusy || saving) return;
    if (dragImageId === null || dragImageId === targetImageId) return;

    const fromIndex = images.findIndex((image) => image.id === dragImageId);
    const toIndex = images.findIndex((image) => image.id === targetImageId);

    if (fromIndex < 0 || toIndex < 0) return;

    moveImageByIndex(fromIndex, toIndex);
  }

  function moveImageByIndex(fromIndex: number, toIndex: number) {
    if (!canEditProductContent(product?.status) || productMutationBusy || saving) return;
    if (fromIndex < 0 || toIndex < 0) return;
    if (fromIndex >= images.length || toIndex >= images.length) return;
    if (fromIndex === toIndex) return;

    const nextImages = [...images];
    const [moved] = nextImages.splice(fromIndex, 1);
    nextImages.splice(toIndex, 0, moved);

    setImages(nextImages);
    markDirty();
  }

  async function publishProduct(reviewed = false) {
    if (
      publishRequestRef.current ||
      saveRequestRef.current ||
      publishing ||
      saving ||
      uploading ||
      reordering ||
      archiving ||
      deleting ||
      mediaActionPending
    ) return;

    if (!product || !isProductStatusPublishable(product.status)) {
      toast.warning(getPublishUnavailableReason(product?.status));
      return;
    }

    const validation = validateProduct();

    if (!validation.valid) {
      scrollToFirstValidationError(validation.errors);
      failValidation(validation.message ?? "Проверьте обязательные поля");
      return;
    }

    if (product.revisionSourceId && !reviewed) {
      if (reviewRequestRef.current) return;
      reviewRequestRef.current = true;
      setReviewLoading(true);
      try {
        const response = await apiFetch(`${API_URL}/api/seller/products/${product.revisionSourceId}`, { signal: AbortSignal.timeout(20000) });
        if (!response.ok) throw new Error(await productActionResponseError(response));
        const source: SellerProduct = await response.json();
        if (source.id !== product.revisionSourceId || source.status !== "ACTIVE") throw new Error("Опубликованный товар изменился — обновите редактор");
        setRevisionReviewSource(source);
      } catch {
        toast.error("Не удалось сравнить изменения — обновите редактор и повторите попытку");
      } finally {
        reviewRequestRef.current = false;
        setReviewLoading(false);
      }
      return;
    }
    setRevisionReviewSource(null);
    publishSuccessReturnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    publishRequestRef.current = true;
    setPublishSucceeded(false);
    setPublishing(true);

    try {
      const publishRevision = editRevisionRef.current;
      if (dirty && !(await saveProduct(true))) return;
      if (editRevisionRef.current !== publishRevision) return;
      const response = await apiFetch(`${API_URL}/api/seller/products/${productId}/publish`, {
        method: "POST",
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Ошибка публикации (${response.status})`);
      }

      setProduct((current) =>
        current
          ? {
              ...current,
              status: "MODERATION",
              moderationComment: null,
            }
          : current
      );
      setPublishSucceeded(true);
      setPublishSuccessOpen(true);
      emitSellerNavigationChanged();
      window.setTimeout(() => setPublishSucceeded(false), 1200);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось опубликовать товар");
    } finally {
      publishRequestRef.current = false;
      setPublishing(false);
    }
  }

  async function createNextProductDraft() {
    if (creatingNextProductRef.current) return;

    creatingNextProductRef.current = true;
    setCreatingNextProduct(true);

    try {
      if (!productPageMountedRef.current) return;
      requestEditorNavigation(() => router.push(`/seller/products/new?returnTo=${encodeURIComponent(productListHref())}`), { completed: true });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось создать товар"
      );
    } finally {
      creatingNextProductRef.current = false;
      if (productPageMountedRef.current) {
        setCreatingNextProduct(false);
      }
    }
  }

  function updateVariant(index: number, patch: Partial<ProductVariant>) {
    setVariants((current) =>
      current.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, ...patch } : variant
      )
    );

    if (patch.sku !== undefined) {
      clearVariantValidationError(index, "sku");
    }

    if (patch.sizeId !== undefined) {
      clearVariantValidationError(index, "sizeId");
    }

    if (patch.colorId !== undefined) {
      clearVariantValidationError(index, "colorId");
    }

    if (patch.price !== undefined) {
      clearVariantValidationError(index, "price");
    }

    if (patch.availableQuantity !== undefined) {
      clearVariantValidationError(index, "availableQuantity");
    }

    markDirty();
  }

  function addVariant(base: Partial<ProductVariant> = {}) {
    const variant = {
      ...createEmptyVariant(),
      ...base,
      sku: base.sku?.trim() || `draft-${crypto.randomUUID()}`,
    };

    setVariants((current) => [
      ...current,
      variant,
    ]);

    clearValidationError("variantCount");
    markDirty();
  }

  function removeVariant(index: number) {
    const groupKey = variantColorGroupKey(variants[index]);
    if (variants.filter(variant => variantColorGroupKey(variant) === groupKey).length === 1 && images.some(image => image.draftGroupKey === groupKey)) {
      setPhotoGroupKey(groupKey);
      selectEditorStep("photos", true);
      toast.warning("Сначала удалите добавленные фото этого оттенка");
      return;
    }
    setVariants((current) => current.filter((_, variantIndex) => variantIndex !== index));
    markDirty();
  }

  async function archiveProduct(confirmed = false) {
    if (
      archiving ||
      publishing ||
      deleting ||
      saving ||
      uploading ||
      reordering ||
      product?.status === "ARCHIVED" ||
      product?.status === "BLOCKED"
    ) return;

    if (dirty) {
      toast.warning("Сначала сохраните изменения, затем перенесите товар в архив");
      return;
    }

    if (!confirmed) {
      setConfirmationError(null);
      setConfirmation("archive");
      return;
    }
    if (confirmationPending.current) return;
    confirmationPending.current = true;
    setConfirmationError(null);

    setArchiving(true);

    try {
      const response = await apiFetch(`${API_URL}/api/seller/products/${productId}/archive`, {
        method: "POST",
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Ошибка архивации (${response.status})`);
      }

      setProduct((current) =>
        current
          ? {
              ...current,
              status: "ARCHIVED",
            }
          : current
      );
      toast.success("Товар перемещён в архив");
      emitSellerNavigationChanged();
      setConfirmation(null);
    } catch (e) {
      setConfirmationError(e instanceof Error ? e.message : "Не удалось переместить товар в архив");
    } finally {
      confirmationPending.current = false;
      setArchiving(false);
    }
  }

  async function moveProductToDraft() {
    if (
      archiving ||
      publishing ||
      deleting ||
      saving ||
      uploading ||
      reordering ||
      product?.status === "DRAFT" ||
      product?.status === "BLOCKED"
    ) return;
    setArchiving(true);
    try {
      const response = await apiFetch(
        `${API_URL}/api/seller/products/${productId}/draft`,
        { method: "POST" }
      );
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Ошибка изменения статуса (${response.status})`);
      }
      setProduct((current) =>
        current ? { ...current, status: "DRAFT" } : current
      );
      toast.success("Товар возвращён в черновики");
      emitSellerNavigationChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось изменить статус"
      );
    } finally {
      setArchiving(false);
    }
  }

  async function deleteProduct(confirmed = false) {
    if (
      deleting ||
      publishing ||
      archiving ||
      saving ||
      uploading ||
      reordering ||
      mediaActionPending ||
      !product ||
      !canDeleteProduct(product.status)
    ) return;

    if (!confirmed) {
      setConfirmationError(null);
      setConfirmation("delete");
      return;
    }
    if (confirmationPending.current) return;
    confirmationPending.current = true;
    setConfirmationError(null);

    setDeleting(true);
    let failureReason: string | null = null;

    try {
      const response = await apiFetch(
        `${API_URL}/api/seller/products/${productId}/delete`,
        { method: "POST", signal: AbortSignal.timeout(20000) }
      );

      if (!response.ok) {
        failureReason = await productActionResponseError(response);
        throw new Error(failureReason);
      }

      setDirty(false);
      emitSellerNavigationChanged();
      globalToast.success("Товар удалён");
      requestEditorNavigation(() => router.replace(productListHref()), { completed: true });
    } catch {
      setConfirmationError(
        failureReason ?? "Не получено подтверждение от сервера — обновите список и проверьте статус перед повтором"
      );
      confirmationPending.current = false;
      setDeleting(false);
    }
  }

  function failValidation(message: string) {
    toast.error(message);
  }

  async function openContentRevision() {
    if (openingRevision || productMutationBusy) return;
    if (dirty) {
      toast.warning("Сначала сохраните изменения цены и остатков");
      return;
    }
    setOpeningRevision(true);
    try {
      const response = await apiFetch(`${API_URL}/api/seller/products/${productId}/revision`, { method: "POST" });
      if (!response.ok) throw new Error(await productActionResponseError(response));
      const revisionId: unknown = await response.json();
      if (typeof revisionId !== "number" || !Number.isSafeInteger(revisionId) || revisionId <= 0) throw new Error("Не удалось открыть изменения товара");
      requestEditorNavigation(() => router.replace(`/seller/products/${revisionId}/edit?returnTo=${encodeURIComponent(productListHref())}`), { completed: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось открыть изменения товара");
    } finally {
      setOpeningRevision(false);
    }
  }

  const productMutationBusy =
    (saving && !automaticSaving) || openingRevision || reviewLoading ||
    uploading ||
    reordering ||
    publishing ||
    archiving ||
    deleting ||
    (mediaActionPending && !automaticSaving);
  const contentEditingAllowed = canEditProductContent(product?.status);
  const operationalEditingAllowed = canEditProductOperations(product?.status);
  const contentControlsDisabled = productMutationBusy || !contentEditingAllowed;
  const operationalControlsDisabled =
    productMutationBusy || !operationalEditingAllowed;
  const mediaDisabledHint = getMediaDisabledHint(
    product?.status,
    productMutationBusy
  );
  const onboardingRequirementsPending =
    onboardingStatus !== null &&
    (!onboardingStatus.legalCompleted || !onboardingStatus.agreementAccepted);
  const onboardingStatusPending = onboardingStatus === null;
  const stepNavigationDisabled = productMutationBusy || creatingNextProduct;
  const deleteAvailable = product !== null && canDeleteProduct(product.status);
  const brandName = brands.find(brand => brand.id === brandId)?.name?.trim() || product?.brand?.trim() || null;
  const FieldsContainer = presentation === "page" ? "div" : "main";
  const displayedSaveState = titleDraftDirty ? "pending" : saveState;

  return (
    <EditorSurface presentation={presentation} backLabel="Товары" className={styles.productSurface}
      title={<ProductEditableTitle value={title} disabled={contentControlsDisabled || creatingNextProduct} onChange={updateTitle} onDraftDirtyChange={setTitleDraftDirty}
        placeholder={presentation === "page" ? "Наименование товара" : undefined} invalid={Boolean(validationErrors.title)} errorId="product-title-error" />}
      headerMeta={product && <span className={styles.editorIdentity}><StatusBadge tone={getProductStatusTone(product.status)} size="regular">{formatProductStatus(product.status)}</StatusBadge>{presentation === "page" && brandName ? <span>{brandName}</span> : null}
        {autosaveAllowed && <span role="status" aria-live="polite" className={styles.saveStatus} data-state={displayedSaveState} title={saveState === "error" ? saveError : undefined}>
          {displayedSaveState === "saving" ? "Сохраняем…" : displayedSaveState === "error" ? "Не удалось сохранить" : displayedSaveState === "manual" ? "Цены и остатки ожидают сохранения" : displayedSaveState === "saved" ? "Все изменения сохранены" : displayedSaveState === "pending" ? "Есть изменения" : productId ? "Все изменения сохранены" : "Черновик сохранится после первого изменения"}
        </span>}
      </span>}
      subtitle={validationErrors.title ? <span id="product-title-error" className="fieldError">Введите название товара</span> : presentation === "page" ? undefined : brandName}
      guardNavigation
      beforeLeave={autosaveAllowed ? flushBeforeLeave : undefined}
      onFieldBlur={event => {
        if (autosaveAllowed && event.target.matches("input,textarea,select,[contenteditable]")) {
          window.setTimeout(() => { if (dirtyRef.current) autosaveQueue.schedule(0); }, 0);
        }
      }}
      discardHint={autosaveAllowed ? "Не удалось сохранить все изменения автоматически — вернитесь в форму и повторите сохранение" : undefined}
      toastId="product-editor"
      dirty={dirty || titleDraftDirty} busy={productMutationBusy || creatingNextProduct}
      onClose={() => { if (intercepted) router.back(); else router.replace(productListHref()); }}
      navigation={<nav className={styles.editorSectionNav} aria-label="Разделы товара">
        {PRODUCT_EDITOR_STEPS.map((step,index)=><button type="button" key={step.id} id={`editor-tab-${step.id}`} aria-current={activeStep === step.id ? "location" : undefined}
          aria-controls={step.panelId} tabIndex={0} disabled={stepNavigationDisabled}
          onFocus={event=>event.currentTarget.scrollIntoView({block:"nearest",inline:"nearest"})}
          onKeyDown={event => {
            let nextIndex = index;
            if (event.key === "ArrowRight") nextIndex = (index + 1) % PRODUCT_EDITOR_STEPS.length;
            else if (event.key === "ArrowLeft") nextIndex = (index - 1 + PRODUCT_EDITOR_STEPS.length) % PRODUCT_EDITOR_STEPS.length;
            else if (event.key === "Home") nextIndex = 0;
            else if (event.key === "End") nextIndex = PRODUCT_EDITOR_STEPS.length - 1;
            else return;
            event.preventDefault();
            const nextStep = PRODUCT_EDITOR_STEPS[nextIndex];
            selectEditorStep(nextStep.id);
            document.getElementById(`editor-tab-${nextStep.id}`)?.focus();
          }}
          onClick={()=>selectEditorStep(step.id)}><span className={styles.stepNumber} aria-hidden="true">{index + 1}</span>{step.label}</button>)}
      </nav>}
      actions={<div className={styles.wizardActions}>
        <div className={styles.wizardSecondaryActions}>
          <Button variant="ghost" disabled={productMutationBusy} onClick={()=>setDraftPreviewOpen(true)}>Предпросмотр</Button>
          {(!autosaveAllowed || Boolean(product?.revisionSourceId) || saveState === "error") && <Button onClick={() => void saveNow()} disabled={(!dirty && !titleDraftDirty) || productMutationBusy || saving || !operationalEditingAllowed} loading={saving} success={saveSucceeded && !titleDraftDirty} variant="secondary">{saveState === "error" ? "Повторить сохранение" : "Сохранить цены и остатки"}</Button>}
        </div>
        <div className={styles.wizardPager}>
          <Button onClick={() => void flushAndPublish()} disabled={productMutationBusy || !isProductStatusPublishable(product?.status)} loading={publishing || reviewLoading} variant="primary">{product?.revisionSourceId ? "Отправить изменения" : "Отправить на модерацию"}</Button>
        </div>
      </div>}>
    <div className={styles.panelContent}>
      <div className={styles.sellerLayout}>

        <div className={styles.editorContent}>
      <div className={styles.page}>
        <div className={styles.pageContent} ref={pageContentRef} tabIndex={-1}>
        {saveState === "error" && <Banner tone="danger" title="Изменения ещё не сохранены" className={styles.editorNotice}>{saveError}</Banner>}
        {product?.status === "ACTIVE" && <Banner tone="info" title="Товар опубликован" className={styles.editorNotice}
          actions={<Button variant="secondary" loading={openingRevision} disabled={productMutationBusy} onClick={() => void openContentRevision()}>{product.contentRevisionId ? "Открыть изменения" : "Изменить карточку"}</Button>}>
          Цена, количество и артикул меняются в разделе «Варианты»
          <br />Для остальных полей и фото откройте изменения — текущая карточка останется в продаже до их одобрения
          {product.contentRevisionStatus && <><br />Изменения: {formatProductStatus(product.contentRevisionStatus)}</>}
        </Banner>}
        {product?.revisionSourceId && <Banner tone="info" title="Изменения опубликованного товара" className={styles.editorNotice}>
          До одобрения покупатели видят прежнюю карточку
          <details className={styles.noticeDetails}><summary>Как сохраняются изменения</summary>Цена, количество и артикул существующих вариантов применяются сразу после сохранения</details>
          <Link className={styles.noticeLink} href={`/seller/products/${product.revisionSourceId}/edit?returnTo=${encodeURIComponent(productListHref())}`}>Открыть опубликованный товар</Link>
        </Banner>}
        <div className={styles.wizardContext}>

          {productId > 0 && product && product.status !== "BLOCKED" && product.status !== "DELETED" && <details className={styles.productActionsMenu}>
            <summary>Действия с товаром</summary>
            <div>{product ? (
                <>
                  {product.status === "ARCHIVED" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      loading={archiving}
                      disabled={productMutationBusy && !archiving}
                      onClick={() => void moveProductToDraft()}
                    >
                      Вернуть в черновик
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      loading={archiving}
                      disabled={productMutationBusy && !archiving}
                      onClick={() => void archiveProduct()}
                    >
                      В архив
                    </Button>
                  )}

          {deleteAvailable && <Button
            type="button"
            variant="danger"
            loading={deleting}
            disabled={productMutationBusy && !deleting}
            onClick={() => void deleteProduct()}
          >{product?.revisionSourceId ? "Удалить изменения" : "Удалить"}</Button>}
                </>
              ) : null}</div>
          </details>}
        </div>

        {onboardingError ? (
          <Banner tone="danger" title="Не удалось проверить готовность магазина" className={styles.editorNotice}
            actions={<Button
              type="button"
              variant="secondary"
              onClick={() => {
                setOnboardingStatus(null);
                setOnboardingRetry((current) => current + 1);
              }}
            >
              Повторить
            </Button>}>
            Товар можно отправить на модерацию — данные магазина проверим перед публикацией
          </Banner>
        ) : onboardingRequirementsPending ? (
          <Banner tone="warning" title="Заполните данные магазина до публикации" className={styles.editorNotice}
            actions={<Link href="/seller/legal">Заполнить данные</Link>}>
            Товар можно отправить на модерацию сейчас. Для публикации заполните реквизиты,
            банковские данные и пункт отправления, затем примите оферту продавца
          </Banner>
        ) : null}

        {product?.status === "NEEDS_REVISION" && product.moderationComment ? (
          <Banner tone="warning" title="Товар вернули на доработку" className={styles.editorNotice}>
            {withoutTrailingPeriod(product.moderationComment)}
          </Banner>
        ) : null}

        <div className={styles.wizardLayout}>
          <FieldsContainer className={`${styles.main} ${styles.stepPanel}`}>
            <fieldset
              className={`${styles.lockedFieldset} ${styles.stepPanel}`}
              disabled={contentControlsDisabled}
            >
              <ProductGeneralCard
                showTitle={presentation !== "page"}
                validationErrors={validationErrors}
                title={title}
                description={description}
                composition={composition}
                categoryId={categoryId}
                suggestedCategoryName={suggestedCategoryName}
                audience={audience}
                categories={categories}
                categoryError={categoryError}
                categoryLoading={categoryLoading}
                currentCategoryLabel={product?.category}
                onRetryCategories={() => setCategoryLoadAttempt(attempt => attempt + 1)}
                onTitleChange={updateTitle}
                onDescriptionChange={(value) => {
                  setDescription(value);
                  clearValidationError("description", !hasDescriptionContent(value) || value.length > 2000);
                  markDirty();
                }}
                onCompositionChange={(value) => {
                  clearValidationError("composition", value.length > 1000);
                  setComposition(value);
                  markDirty();
                }}
                onCategoryIdChange={(value) => {
                  setCategoryId(value);
                  if (value) {
                    setSuggestedCategoryName("");
                  }
                  clearValidationError("categoryId", value === "" && !suggestedCategoryName.trim());
                  markDirty();
                }}
                onSuggestedCategoryNameChange={(value) => {
                  setSuggestedCategoryName(value);
                  if (value.trim()) {
                    setCategoryId("");
                  }
                  clearValidationError("categoryId", categoryId === "" && !value.trim());
                  markDirty();
                }}
                onAudienceChange={(value) => {
                  setAudience(value);
                  markDirty();
                }}
              />
            </fieldset>

            <div id="product-step-variants" className={styles.stepPanel} role="region" aria-labelledby="editor-tab-variants"
              data-editor-step="variants" tabIndex={-1}>
            <h2 className={`${styles.sectionTitle} ${styles.desktopOnly}`}>Варианты</h2>
            <ProductVariantsCard
              countInvalid={validationErrors.variantCount}
              variants={variants}
              variantStructureDisabled={contentControlsDisabled}
              operationalDisabled={operationalControlsDisabled}
              validationErrors={validationErrors.variants ?? {}}
              onUpdateVariant={updateVariant}
              onAddVariant={addVariant}
              onRemoveVariant={removeVariant}
              onOpenPhotos={key => { setPhotoGroupKey(key); selectEditorStep("photos", true); }}
            />
            </div>

            <fieldset
              id="product-step-shipping" className={`${styles.lockedFieldset} ${styles.stepPanel}`} role="region" aria-labelledby="editor-tab-shipping"
              data-editor-step="shipping" tabIndex={-1}
              disabled={contentControlsDisabled}
            >
              <h2 className={`${styles.sectionTitle} ${styles.desktopOnly}`}>Упаковка</h2>
              <ProductShippingCard
                validationErrors={validationErrors}
                packageWidthCm={packageWidthCm}
                packageHeightCm={packageHeightCm}
                packageLengthCm={packageLengthCm}
                packageWeightKg={packageWeightKg}
                onPackageWidthCmChange={(value) => {
                  setPackageWidthCm(value);
                  clearValidationError("packageWidthCm", value === "" || !Number.isFinite(value) || value <= 0);
                  markDirty();
                }}
                onPackageHeightCmChange={(value) => {
                  setPackageHeightCm(value);
                  clearValidationError("packageHeightCm", value === "" || !Number.isFinite(value) || value <= 0);
                  markDirty();
                }}
                onPackageLengthCmChange={(value) => {
                  setPackageLengthCm(value);
                  clearValidationError("packageLengthCm", value === "" || !Number.isFinite(value) || value <= 0);
                  markDirty();
                }}
                onPackageWeightKgChange={(value) => {
                  setPackageWeightKg(value);
                  clearValidationError("packageWeightKg", value === "" || !Number.isFinite(value) || value <= 0);
                  markDirty();
                }}
              />
            </fieldset>

            {onboardingStatusPending && !onboardingError ? (
              <div className={styles.publishRequirementHint}><Loader inline label="Проверка готовности магазина" /></div>
            ) : null}

          </FieldsContainer>

            <div id="product-step-photos" className={`${styles.stepPanel} ${styles.photoStep}`} role="region" aria-labelledby="editor-tab-photos"
              data-editor-step="photos" tabIndex={-1}>
              <ProductPhotoEditor
                shadeGroups={Array.from(new Map(variants.map(variant => [variantColorGroupKey(variant), { key: variantColorGroupKey(variant), color: variant.color || "Без оттенка" }])).values())}
                selectedGroupKey={photoGroupKey || (variants[0] ? variantColorGroupKey(variants[0]) : "")}
                onGroupChange={setPhotoGroupKey}
                imageLabels={Object.fromEntries(images.map(image => [image.id, variants.find(variant => image.draftGroupKey ? variantColorGroupKey(variant) === image.draftGroupKey : variant.colorwayId === image.colorwayId)?.color || "Без оттенка"]))}
                images={images}
                invalidImages={validationErrors.images}
                uploadProgress={uploadProgress}
                uploading={uploading}
                reordering={reordering}
                mediaDisabled={productMutationBusy || saving || !contentEditingAllowed}
                mediaDisabledHint={mediaDisabledHint}
                dragImageId={dragImageId}
                onFilesChange={() => {}}
                onUploadImages={(files) => void uploadImages(files, photoGroupKey || (variants[0] ? variantColorGroupKey(variants[0]) : ""))}
                onDragImageStart={setDragImageId}
                onDragImageEnd={() => setDragImageId(null)}
                onMoveImage={moveImage}
                onDeleteImage={deleteImage}
                onMoveImageByIndex={moveImageByIndex}
              />
            </div>
            </div>
        </div>
      </div>
        </div>
      </div>

      {revisionReviewSource && <Dialog title="Проверьте изменения карточки" onClose={() => setRevisionReviewSource(null)}
        actions={<><Button variant="secondary" onClick={() => setRevisionReviewSource(null)}>Вернуться к редактированию</Button>
          <Button variant="secondary" disabled={productMutationBusy} onClick={() => void publishProduct(true)}>Отправить изменения</Button></>}>
        <ProductRevisionReview source={revisionReviewSource} current={{ title, description, composition,
          category: suggestedCategoryName.trim() || categories.find(c => c.id === categoryId)?.name || product?.category || null,
          audience, packageWidthCm: numberOrNull(packageWidthCm), packageHeightCm: numberOrNull(packageHeightCm),
          packageLengthCm: numberOrNull(packageLengthCm), packageWeightKg: numberOrNull(packageWeightKg),
          variantSummary: variants.map(v => `${v.color || "Без цвета"} · ${v.size || "Без размера"}`).sort().join("\n"),
          photos: images.map(i => i.url),
        }} />
      </Dialog>}
      {draftPreviewOpen && <Dialog title="Предпросмотр товара" onClose={()=>setDraftPreviewOpen(false)} actions={<Button onClick={()=>setDraftPreviewOpen(false)}>Вернуться к редактированию</Button>}>
        <ProductDraftPreview title={title} brand={brands.find(b=>b.id === brandId)?.name ?? product?.brand ?? ""} description={description} composition={composition} variants={variants} images={images} />
      </Dialog>}
      {confirmation ? (
        <Dialog title={confirmation === "delete" ? (product?.revisionSourceId ? "Удалить изменения?" : "Удалить товар?") : product?.status === "ACTIVE" ? "Снять товар с витрины?" : "Перенести товар в архив?"}
          busy={archiving || deleting} onClose={() => setConfirmation(null)}
          actions={<>
            <Button variant="secondary" disabled={archiving || deleting} onClick={() => setConfirmation(null)}>Отмена</Button>
            <Button variant="primary" loading={archiving || deleting}
              onClick={() => void (confirmation === "delete" ? deleteProduct(true) : archiveProduct(true))}>
              {confirmation === "delete" ? "Удалить" : "В архив"}
            </Button>
          </>}>
          <p>{product?.revisionSourceId
            ? "Это действие касается только версии изменений. Опубликованный товар остаётся в продаже"
            : confirmation === "delete"
            ? "Товар исчезнет с витрины и из списка продавца. Заказы и их история сохранятся. Самостоятельно восстановить товар не получится"
            : "Товар исчезнет из каталога, но его данные сохранятся в архиве. Позже его можно вернуть в черновики"}</p>
          {confirmationError ? <Banner tone="danger" role="alert"
            actions={/заблокирован|поддержк|обновите список/i.test(confirmationError) ? <Button variant="tertiary" disabled={archiving || deleting}
              onClick={() => {
                setConfirmation(null);
                requestEditorNavigation(() => /обновите список/i.test(confirmationError)
                  ? router.replace(productListHref()) : router.push("/contacts"));
              }}>{/обновите список/i.test(confirmationError) ? "Обновить список" : "Поддержка"}</Button> : undefined}>
            {confirmationError}
          </Banner> : null}
        </Dialog>
      ) : null}

      {publishSuccessOpen ? (
        <div
          className="modalOverlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setPublishSuccessOpen(false);
            }
          }}
        >
          <div
            ref={publishSuccessDialogRef}
            className={`modal ${styles.publishSuccessModal}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-publish-success-title"
            tabIndex={-1}
          >
            <div className="modalHeader">
              <div>
                <Icon name="check-circle" className={styles.publishSuccessIcon} />
                <h2 className="modalTitle" id="product-publish-success-title">
                  {product?.revisionSourceId ? "Изменения отправлены на модерацию" : "Товар отправлен на модерацию"}
                </h2>
              </div>
              <button
                ref={publishSuccessCloseRef}
                type="button"
                className="modalClose"
                disabled={creatingNextProduct}
                onClick={() => setPublishSuccessOpen(false)}
                aria-label="Закрыть"
              >
                <Icon name="x" />
              </button>
            </div>

            <div className="modalBody">
              <p className={styles.publishSuccessText}>
                {product?.revisionSourceId ? "Опубликованный товар остаётся в продаже. Изменения появятся после одобрения" : "Карточка получила статус «На модерации». Пока мы её проверяем, можно добавить следующий товар"}
              </p>
              {onboardingRequirementsPending ? (
                <Banner tone="warning" title="Заполните данные магазина до публикации"
                  actions={<Link href="/seller/legal">Заполнить данные</Link>}>
                  Пока товар на проверке, заполните реквизиты, банковские данные и пункт отправления,
                  затем примите оферту продавца
                </Banner>
              ) : null}
              <Link
                href={`/seller/products/${productId}/preview`}
                className={styles.publishPreviewLink}
                aria-disabled={creatingNextProduct || undefined}
                tabIndex={creatingNextProduct ? -1 : undefined}
                onClick={(event) => {
                  if (creatingNextProduct) event.preventDefault();
                }}
              >
                Открыть предпросмотр
              </Link>
            </div>

            <div className="modalFooter">
              <Button
                type="button"
                variant="secondary"
                disabled={creatingNextProduct}
                onClick={() => router.push("/seller/products")}
              >
                К товарам
              </Button>
              {!product?.revisionSourceId && <Button
                type="button"
                variant="primary"
                loading={creatingNextProduct}
                onClick={() => void createNextProductDraft()}
              >
                Добавить ещё товар
              </Button>}
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </EditorSurface>
  );
}

function withoutTrailingPeriod(value: string) {
  return value.trim().replace(/\.\s*$/, "");
}

function canDeleteProduct(status: SellerProduct["status"]) {
  return productActionBlockedReason("delete", status) === null;
}

function isProductStatusPublishable(status?: SellerProduct["status"]) {
  return status === "DRAFT" || status === "NEEDS_REVISION";
}

function canEditProductContent(status?: SellerProduct["status"]) {
  return (
    status === "DRAFT" ||
    status === "NEEDS_REVISION" ||
    status === "ARCHIVED"
  );
}

function canEditProductOperations(status?: SellerProduct["status"]) {
  return canEditProductContent(status) || status === "ACTIVE";
}

function getProductEditUnavailableReason(status?: SellerProduct["status"]) {
  if (status === "MODERATION") {
    return "Товар на модерации. Чтобы изменить его, сначала отзовите карточку в архив";
  }

  if (status === "BLOCKED") {
    return "Товар заблокирован администратором и доступен только для просмотра";
  }

  return "Товар сейчас недоступен для редактирования";
}

function getMediaDisabledHint(
  status: SellerProduct["status"] | undefined,
  busy: boolean
) {
  if (status === "ACTIVE") {
    return "Чтобы изменить фото, нажмите «Изменить карточку»";
  }

  if (status === "MODERATION") {
    return "Фото нельзя менять во время модерации";
  }

  if (status === "BLOCKED") {
    return "Фото заблокированного товара доступны только для просмотра";
  }

  if (busy) {
    return "Дождитесь завершения текущего действия";
  }

  return undefined;
}

function getPublishUnavailableReason(status?: SellerProduct["status"]) {
  switch (status) {
    case "MODERATION":
      return "Товар уже находится на модерации";
    case "ARCHIVED":
      return "Сначала верните товар в черновик";
    case "BLOCKED":
      return "Товар заблокирован администратором";
    case "ACTIVE":
      return "Активный товар уже опубликован. Для изменения карточки сначала снимите его с витрины";
    default:
      return "Товар сейчас нельзя отправить на публикацию";
  }
}
