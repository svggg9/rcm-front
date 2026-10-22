/** Shared category contract. Names are display paths; identity and hierarchy come from the API. */
export type CategoryOption = {
  id: number;
  name: string;
  label: string;
  parentId: number | null;
  slug: string | null;
  sortOrder: number;
  isActive: boolean;
  effectiveActive: boolean;
  productCount: number;
  subtreeProductCount: number;
  aliases?: string[];
};

export type CategoryNode = CategoryOption & { children: CategoryNode[] };
export type CategoryFacet = { categoryId: number; count: number };
export const MAX_CATEGORY_DEPTH = 3;

/** One-based depth from the explicit hierarchy, independent of display names. */
export function categoryDepth(categories: CategoryOption[], id: number): number {
  const byId = new Map(categories.map(category => [category.id, category]));
  const seen = new Set<number>();
  let current = byId.get(id);
  let depth = 0;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    depth++;
    current = current.parentId === null ? undefined : byId.get(current.parentId);
  }
  return depth;
}

/** A whole branch can move only where all its descendants still fit the depth limit. */
export function eligibleCategoryParents(categories: CategoryOption[], movingId?: number): CategoryOption[] {
  const nodes = buildCategoryTree(categories);
  const findNode = (items: CategoryNode[]): CategoryNode | undefined => {
    for (const node of items) {
      if (node.id === movingId) return node;
      const child = findNode(node.children);
      if (child) return child;
    }
  };
  const movingNode = movingId === undefined ? undefined : findNode(nodes);
  const height = (node: CategoryNode): number => 1 + Math.max(0, ...node.children.map(height));
  const branchHeight = movingNode ? height(movingNode) : 1;
  const excluded = new Set(movingNode ? flattenCategoryTree([movingNode]).map(category => category.id) : []);
  return flattenCategoryTree(nodes).filter(category => !excluded.has(category.id) &&
    categoryDepth(categories, category.id) + branchHeight <= MAX_CATEGORY_DEPTH);
}

function positiveId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function nonNegative(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

export function normalizeCategories(data: unknown): CategoryOption[] {
  if (!Array.isArray(data)) throw new Error("Invalid categories response");
  const ids = new Set<number>();
  const result = data.map((raw): CategoryOption => {
    if (!raw || typeof raw !== "object") throw new Error("Invalid category");
    const item = raw as Record<string, unknown>;
    if (!positiveId(item.id) || ids.has(item.id) || typeof item.name !== "string" || !item.name.trim() ||
      typeof item.label !== "string" || !item.label.trim() ||
      !(item.parentId === null || positiveId(item.parentId)) || item.parentId === item.id ||
      typeof item.isActive !== "boolean" || typeof item.effectiveActive !== "boolean") {
      throw new Error("Invalid category");
    }
    ids.add(item.id);
    return {
      id: item.id, name: item.name, label: item.label, parentId: item.parentId,
      slug: typeof item.slug === "string" && item.slug.trim() ? item.slug : null,
      sortOrder: typeof item.sortOrder === "number" && Number.isSafeInteger(item.sortOrder) ? item.sortOrder : 0,
      isActive: item.isActive, effectiveActive: item.effectiveActive,
      productCount: nonNegative(item.productCount), subtreeProductCount: nonNegative(item.subtreeProductCount),
      aliases: Array.isArray(item.aliases) ? item.aliases.filter((alias): alias is string => typeof alias === "string") : [],
    };
  });
  const byId = new Map(result.map(item => [item.id, item]));
  for (const item of result) {
    const path = new Set<number>([item.id]);
    let parentId = item.parentId;
    while (parentId !== null) {
      const parent = byId.get(parentId);
      if (!parent || path.has(parentId)) throw new Error("Invalid category hierarchy");
      path.add(parentId);
      parentId = parent.parentId;
    }
  }
  return result;
}

export function categoryValue(category: Pick<CategoryOption, "id" | "slug">): string {
  return category.slug || String(category.id);
}

export function categoryPathLabel(category: Pick<CategoryOption, "name">): string {
  return category.name;
}

export function buildCategoryTree(categories: CategoryOption[]): CategoryNode[] {
  const byId = new Map(categories.map(item => [item.id, { ...item, children: [] } as CategoryNode]));
  const roots: CategoryNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId === null) roots.push(node);
    else byId.get(node.parentId)?.children.push(node);
  }
  const sort = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "ru") || a.id - b.id);
    nodes.forEach(node => sort(node.children));
  };
  sort(roots);
  return roots;
}

export function flattenCategoryTree(nodes: CategoryNode[]): CategoryOption[] {
  return nodes.flatMap(node => [node, ...flattenCategoryTree(node.children)]);
}

export function findCategory(categories: CategoryOption[], value: string): CategoryOption | undefined {
  const normalized = value.trim().toLocaleLowerCase("ru");
  return categories.find(category => categoryValue(category).toLocaleLowerCase("ru") === normalized ||
    String(category.id) === normalized || category.name.toLocaleLowerCase("ru") === normalized ||
    category.aliases?.some(alias => alias.toLocaleLowerCase("ru") === normalized));
}

export function normalizeCategoryFacets(data: unknown): CategoryFacet[] {
  if (!Array.isArray(data)) throw new Error("Invalid category facets response");
  const ids = new Set<number>();
  return data.map(raw => {
    if (!raw || typeof raw !== "object") throw new Error("Invalid category facet");
    const item = raw as Record<string, unknown>;
    if (!positiveId(item.categoryId) || ids.has(item.categoryId) ||
      typeof item.count !== "number" || !Number.isSafeInteger(item.count) || item.count < 0) {
      throw new Error("Invalid category facet");
    }
    ids.add(item.categoryId);
    return { categoryId: item.categoryId, count: item.count };
  });
}

/** Include ancestor totals without counting a product twice. Facets contain direct assignments only. */
export function categoryFacetTotals(categories: CategoryOption[], facets: CategoryFacet[]): Map<number, number> {
  const direct = new Map(facets.map(facet => [facet.categoryId, facet.count]));
  const totals = new Map<number, number>();
  function visit(node: CategoryNode): number {
    const total = (direct.get(node.id) ?? 0) + node.children.reduce((sum, child) => sum + visit(child), 0);
    totals.set(node.id, total);
    return total;
  }
  buildCategoryTree(categories).forEach(visit);
  return totals;
}
