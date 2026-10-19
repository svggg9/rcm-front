export const PRODUCT_EDITOR_STEPS = [
  { id: "general", label: "Основное", panelId: "product-general" },
  { id: "description", label: "Описание", panelId: "product-description" },
  { id: "variants", label: "Варианты", panelId: "product-step-variants" },
  { id: "shipping", label: "Упаковка", panelId: "product-step-shipping" },
  { id: "photos", label: "Фото", panelId: "product-step-photos" },
] as const;

export type ProductEditorStep = (typeof PRODUCT_EDITOR_STEPS)[number]["id"];

export type ProductEditorStepErrors = {
  title?: boolean;
  categoryId?: boolean;
  brandId?: boolean;
  description?: boolean;
  composition?: boolean;
  variantCount?: boolean;
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
  packageWidthCm?: boolean;
  packageHeightCm?: boolean;
  packageLengthCm?: boolean;
  packageWeightKg?: boolean;
  images?: boolean;
};

export function getProductEditorErrorStep(
  errors: ProductEditorStepErrors
): ProductEditorStep | null {
  if (errors.title || errors.categoryId || errors.brandId) return "general";
  if (errors.description || errors.composition) return "description";

  const variantErrors = errors.variants;
  if (
    errors.variantCount ||
    (variantErrors !== undefined &&
      (Object.keys(variantErrors).length === 0 ||
        Object.values(variantErrors).some((fields) =>
          Object.values(fields).some(Boolean)
        )))
  ) {
    return "variants";
  }

  if (
    errors.packageWidthCm ||
    errors.packageHeightCm ||
    errors.packageLengthCm ||
    errors.packageWeightKg
  ) {
    return "shipping";
  }

  return errors.images ? "photos" : null;
}
