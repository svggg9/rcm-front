export type ProductDetails = {
  features?: string | null;
  measurements?: string | null;
  care?: string | null;
  cityOfOrigin?: string | null;
};

export type ProductDetailsDraft = Record<keyof ProductDetails, string>;

export const PRODUCT_DETAILS_FIELDS = [
  { key: "features", label: "Особенности", limit: 2000 },
  { key: "measurements", label: "Замеры изделия", limit: 1500 },
  { key: "care", label: "Уход", limit: 1500 },
  { key: "cityOfOrigin", label: "Город производства", limit: 120 },
] as const;

export function normalizeProductDetails(details?: ProductDetails | null): ProductDetailsDraft {
  return Object.fromEntries(PRODUCT_DETAILS_FIELDS.map(({ key }) => [key, details?.[key] ?? ""])) as ProductDetailsDraft;
}

export function productDetailsErrors(details: ProductDetails): Partial<Record<keyof ProductDetails, string>> {
  return Object.fromEntries(PRODUCT_DETAILS_FIELDS.flatMap(({ key, label, limit }) =>
    (details[key]?.length ?? 0) > limit ? [[key, `${label}: не больше ${limit} символов`]] : []));
}

/** Keep layout independent of headings or the order used in the description. */
export function productFeatureItems(features?: string | null): string[] {
  return (features ?? "").split(/\r?\n/).map(line => line.replace(/^\s*[▪•*—-]\s*/, "").trim()).filter(Boolean);
}

export function productMeasurementHint(category: string): string {
  if (/обув|кроссов|кед|туфл|ботин|сапог|лофер|босонож/i.test(category)) {
    return "Укажите размер образца, длину стельки и высоту подошвы в сантиметрах";
  }
  if (/сумк|рюкзак|кошел|кардхолдер/i.test(category)) {
    return "Укажите ширину, высоту, глубину и длину ручек или ремня в сантиметрах";
  }
  if (/очк/i.test(category)) {
    return "Укажите ширину линзы и переносицы, длину дужки в миллиметрах";
  }
  if (/одежд|рубаш|плать|футбол|брюк|трикотаж|джинс|худи|юбк/i.test(category)) {
    return "Укажите размер образца, длину изделия и подходящие обхваты в сантиметрах";
  }
  return "Укажите размеры самого изделия и единицы измерения";
}
