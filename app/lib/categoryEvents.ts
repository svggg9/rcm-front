export const CATEGORY_CHANGED_EVENT = "rcm:categories-changed";
export const CATEGORY_REVISION_KEY = "rcm:categories:revision";

/** Public dictionary invalidation only; no account or category data is stored. */
export function emitCategoriesChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CATEGORY_CHANGED_EVENT));
  try { window.localStorage.setItem(CATEGORY_REVISION_KEY, `${Date.now()}-${Math.random()}`); } catch { /* Storage can be unavailable. */ }
}

export function subscribeCategoriesChanged(callback: () => void) {
  const storage = (event: StorageEvent) => { if (event.key === CATEGORY_REVISION_KEY) callback(); };
  window.addEventListener(CATEGORY_CHANGED_EVENT, callback);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(CATEGORY_CHANGED_EVENT, callback);
    window.removeEventListener("storage", storage);
  };
}
