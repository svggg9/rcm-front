export type StorefrontSection = {
  id: number;
  kind: "CATEGORY" | "COLLECTION";
  targetId: number;
  title: string;
  targetSlug: string | null;
  coverImageUrl: string | null;
  coverPositionX: number;
  coverPositionY: number;
  sortOrder: number;
  active: boolean;
  available: boolean;
};

export function coverPosition(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 50;
}

export function normalizeStorefrontSections(data: unknown): StorefrontSection[] {
  if (!Array.isArray(data)) return [];
  const seen = new Set<number>();
  return data.flatMap((item): StorefrontSection[] => {
    if (!item || typeof item !== "object") return [];
    const raw = item as Record<string, unknown>;
    if (typeof raw.id !== "number" || !Number.isSafeInteger(raw.id) || raw.id <= 0 || seen.has(raw.id) ||
      (raw.kind !== "CATEGORY" && raw.kind !== "COLLECTION") ||
      typeof raw.targetId !== "number" || !Number.isSafeInteger(raw.targetId) || raw.targetId <= 0 ||
      typeof raw.title !== "string" || !raw.title.trim()) return [];
    seen.add(raw.id);
    return [{
      id: raw.id, kind: raw.kind, targetId: raw.targetId, title: raw.title.trim(),
      targetSlug: typeof raw.targetSlug === "string" && raw.targetSlug.trim() ? raw.targetSlug.trim() : null,
      coverImageUrl: typeof raw.coverImageUrl === "string" && raw.coverImageUrl.trim() ? raw.coverImageUrl.trim() : null,
      coverPositionX: coverPosition(raw.coverPositionX), coverPositionY: coverPosition(raw.coverPositionY),
      sortOrder: typeof raw.sortOrder === "number" && Number.isFinite(raw.sortOrder) ? raw.sortOrder : 0,
      active: raw.active === true, available: raw.available === true,
    }];
  }).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
}
