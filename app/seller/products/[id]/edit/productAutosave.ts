import type { ProductVariant, SellerProduct } from "./types";

export function hasOperationalChanges(variants: ProductVariant[]) {
  return variants.some(variant => variant.id !== null && (
    variant.price !== variant.initialPrice || variant.availableQuantity !== variant.initialQuantity ||
    variant.stockTrackingEnabled !== variant.initialStockTrackingEnabled ||
    (variant.sellerArticle ?? "") !== (variant.initialSellerArticle ?? "")));
}

// Keep local keys and edits made during a request; only adopt IDs and the acknowledged baseline.
export function reconcileSavedVariants(current: ProductVariant[], saved: ProductVariant[]): ProductVariant[] {
  return current.map(variant => {
    const match = saved.find(item => variant.id !== null ? item.id === variant.id : item.sku === variant.sku);
    if (!match) return variant;
    return { ...variant, id: match.id, colorwayId: match.colorwayId,
      initialPrice: match.price, initialQuantity: match.initialQuantity,
      initialStockTrackingEnabled: match.stockTrackingEnabled, initialSellerArticle: match.sellerArticle,
      reservedQuantity: match.reservedQuantity };
  });
}

export function emptyProduct(): SellerProduct {
  return { id: 0, title: "", description: "", composition: null, article: null, brandId: null, brand: null,
    categoryId: null, category: null, audience: "UNISEX", status: "DRAFT", moderationComment: null,
    packageWidthCm: null, packageHeightCm: null, packageLengthCm: null, packageWeightKg: null,
    variants: [], images: [], imageItems: [], colorways: [] };
}

/** One writer per editor. A change during a request schedules a subsequent snapshot. */
export function createAutosaveQueue(save: () => Promise<boolean>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running: Promise<boolean> | null = null;
  let requested = false;
  let disposed = false;
  function cancelTimer() { clearTimeout(timer); timer = undefined; }
  function flush(): Promise<boolean> {
    cancelTimer();
    requested = true;
    if (running) return running;
    running = (async () => {
      while (requested && !disposed) {
        cancelTimer();
        requested = false;
        if (!(await save())) { requested = false; return false; }
        // React can commit the next input snapshot before the queue takes another one.
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      return !disposed;
    })().finally(() => { running = null; });
    return running;
  }
  return {
    schedule(delay = 1000) {
      if (disposed) return;
      requested = true;
      cancelTimer();
      timer = setTimeout(() => { void flush(); }, delay);
    },
    flush,
    cancel() { requested = false; cancelTimer(); },
    dispose() { disposed = true; requested = false; cancelTimer(); },
  };
}
