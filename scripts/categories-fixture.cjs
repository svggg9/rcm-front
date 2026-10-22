/* eslint-disable @typescript-eslint/no-require-imports -- Disposable category UI fixture, isolated from the real API and database. */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const origin = "http://127.0.0.1:13048";
const api = "http://127.0.0.1:19648";
const directory = path.resolve("build/categories-fixture");
fs.mkdirSync(directory, { recursive: true });
const calls = [];
const failures = [];
const categoryData = [
  { id: 1, label: "Одежда", parentId: null, slug: "fixture-clothing", sortOrder: 3, isActive: true },
  { id: 2, label: "Обувь", parentId: null, slug: "fixture-shoes", sortOrder: 2, isActive: true },
  { id: 3, label: "Аксессуары", parentId: null, slug: "fixture-accessories", sortOrder: 1, isActive: true },
  { id: 4, label: "Футболки", parentId: 1, slug: "fixture-shirts", sortOrder: 0, isActive: true },
  { id: 5, label: "Другое", parentId: 1, slug: "fixture-other-clothes", sortOrder: 1, isActive: true },
  { id: 6, label: "Другое", parentId: 2, slug: "fixture-other-shoes", sortOrder: 0, isActive: true },
  { id: 7, label: "Сумки", parentId: 3, slug: "fixture-bags", sortOrder: 0, isActive: true },
  { id: 8, label: "Архивная коллекция", parentId: 1, slug: "fixture-archive", sortOrder: 2, isActive: false },
  { id: 9, label: "Верхняя одежда", parentId: 1, slug: "fixture-outerwear", sortOrder: 3, isActive: true },
  { id: 10, label: "Пуховики", parentId: 9, slug: "fixture-down-jackets", sortOrder: 0, isActive: true },
];
let nextCategoryId = 20;
const image = "/8309ccdeec4a167dc09dc908fc1f1dbc.jpg";
const products = [
  { id: 901, title: "Футболка с коротким рукавом", categoryId: 4, status: "ACTIVE" },
  { id: 902, title: "Лёгкая сумка", categoryId: 7, status: "ACTIVE" },
  { id: 903, title: "Товар из раздела другое", categoryId: 6, status: "ACTIVE" },
  { id: 904, title: "Черновик с прежней категорией", categoryId: 8, status: "DRAFT" },
  { id: 905, title: "Пуховик с капюшоном", categoryId: 10, status: "ACTIVE" },
  { id: 990, title: "Предложенная новая категория", categoryId: null, suggestedCategoryName: "Сумки через плечо", status: "MODERATION" },
];
const sizes = [{ id: 1, name: "S", sortOrder: 0, isActive: true }, { id: 2, name: "M", sortOrder: 1, isActive: true }];
function categoryDto(item, seen = new Set()) {
  if (seen.has(item.id)) throw new Error("Fixture cycle");
  seen.add(item.id);
  const parent = categoryData.find(node => node.id === item.parentId);
  const parentDto = parent ? categoryDto(parent, seen) : null;
  const ownCount = products.filter(product => product.categoryId === item.id).length;
  return { ...item, name: parentDto ? `${parentDto.name} / ${item.label}` : item.label,
    effectiveActive: item.isActive && (!parentDto || parentDto.effectiveActive), productCount: ownCount,
    subtreeProductCount: products.filter(product => descendants(item.id).includes(product.categoryId)).length, aliases: item.aliases || [] };
}
function allCategories() { return categoryData.map(item => categoryDto(item)).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id); }
function productDto(product) {
  const category = categoryData.find(node => node.id === product.categoryId);
  return { ...product, publicId: String(product.id), sellerId: 1, brandId: 1, article: String(100000 + product.id), brand: "Тестовый бренд", brandSlug: "fixture-brand",
    category: category ? categoryDto(category).name : null, audience: "UNISEX", description: "Тестовая карточка для проверки категорий",
    moderationComment: null, minPrice: 2900, inStock: true, images: [image], coverImage: image,
    createdAt: "2026-10-19T10:00:00+03:00", updatedAt: "2026-10-19T10:00:00+03:00",
    variants: [{ id: product.id + 1000, size: "M", color: "Белый", price: 2900, availableQuantity: 5, sku: "fixture-" + product.id }] };
}
function page(items) { return { content: items, totalElements: items.length, totalPages: 1, number: 0, size: 50 }; }
function descendants(id) { return [id, ...categoryData.filter(node => node.parentId === id).flatMap(node => descendants(node.id))]; }
function filterProducts(url) {
  let found = products.filter(product => product.status === "ACTIVE");
  const selections = [...url.searchParams.getAll("category"), ...url.searchParams.getAll("categories")].flatMap(value => value.split(",")).filter(Boolean);
  if (selections.length) {
    const ids = selections.flatMap(value => {
      const category = allCategories().find(node => [node.slug, String(node.id), node.name, ...(node.aliases || [])].includes(value));
      return category ? descendants(category.id) : [];
    });
    found = found.filter(product => ids.includes(product.categoryId));
  }
  const query = url.searchParams.get("q")?.toLocaleLowerCase("ru");
  if (query) found = found.filter(product => product.title.toLocaleLowerCase("ru").includes(query));
  return found;
}
const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method === "OPTIONS") return res.end();
  const url = new URL(req.url, api);
  const reply = (data, status = 200) => { res.statusCode = status; res.end(JSON.stringify(data)); };
  const error = (message, status = 400) => reply({ code: status === 409 ? "CONFLICT" : "BAD_REQUEST", message }, status);
  let body = {};
  try {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    if (raw) body = JSON.parse(raw);
  } catch { return error("Invalid fixture body"); }
  if (url.pathname === "/__fixture/calls") return reply(calls);
  if (url.pathname === "/__fixture/state") return reply({ categories: allCategories(), products: products.map(productDto), failures });
  if (url.pathname === "/__fixture/fail" && req.method === "POST") {
    failures.push({ path: body.path || "/api/admin/dictionaries/categories", method: body.method || "GET", count: body.count ?? 1, status: body.status || 502 });
    return reply({ ok: true });
  }
  calls.push({ method: req.method, path: url.pathname, query: url.search, ...(req.method !== "GET" ? { body } : {}) });
  fs.writeFileSync(path.join(directory, "calls.json"), JSON.stringify(calls, null, 2));
  const failure = failures.find(item => item.count > 0 && item.path === url.pathname && item.method === req.method);
  if (failure) { failure.count--; return error("private SQL fixture detail", failure.status); }
  if (url.pathname === "/api/auth/session") return reply({ id: 1, username: "admin@fixture.test", role: "ADMIN" });
  if (url.pathname === "/api/profile") return reply({ id: 1, username: "admin@fixture.test", email: "admin@fixture.test", role: "ADMIN", firstName: "Тест", sellerApproved: true });
  if (url.pathname === "/api/seller/brands") return reply([{id: 1, name: "Тестовый бренд", slug: "fixture-brand", status: "ACTIVE"}]);
  if (url.pathname === "/api/seller/onboarding-status") return reply({applicationCompleted:true,brandCompleted:true,legalCompleted:true,agreementAccepted:true,completedSteps:4,totalSteps:4,progress:100});
  if (/^\/api\/seller\/products\/\d+$/.test(url.pathname)) {
    const product = products.find(item => item.id === Number(url.pathname.split("/").at(-1)));
    return product ? reply(productDto(product)) : error("Product unavailable", 404);
  }
  if (url.pathname === "/api/admin/dictionaries/categories" || /^\/api\/admin\/dictionaries\/categories\/\d+$/.test(url.pathname)) {
    const id = Number(url.pathname.split("/").at(-1));
    const existing = categoryData.find(item => item.id === id);
    if (req.method === "GET") return reply(allCategories());
    if (req.method === "DELETE") {
      if (!existing) return error("Категория не найдена");
      existing.isActive = false;
      return reply({});
    }
    if (req.method === "POST" || req.method === "PUT") {
      if (req.method === "PUT" && !existing) return error("Категория не найдена");
      const label = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
      const parentId = Object.hasOwn(body, "parentId") ? body.parentId : existing?.parentId ?? null;
      const parent = parentId === null ? null : categoryData.find(item => item.id === parentId);
      if (!label || label.length > 120 || label.includes("/")) return error("Название категории должно содержать от 1 до 120 символов");
      if (parentId !== null && !parent) return error("Родительская категория не найдена");
      if (existing && parentId === existing.id) return error("Категорию нельзя переместить внутрь самой себя");
      if (existing && parent && descendants(existing.id).includes(parent.id)) return error("Категорию нельзя переместить внутрь самой себя");
      let parentDepth = 0;
      for (let node = parent; node; node = categoryData.find(item => item.id === node.parentId)) parentDepth++;
      const height = id => 1 + Math.max(0, ...categoryData.filter(item => item.parentId === id).map(item => height(item.id)));
      if (parentDepth + (existing ? height(existing.id) : 1) > 3) return error("Допустимо уровней категорий: 3");
      if (categoryData.some(item => item.id !== existing?.id && item.parentId === parentId && item.label.toLocaleLowerCase("ru") === label.toLocaleLowerCase("ru"))) return error("В этом разделе уже есть такая категория", 409);
      if (body.sortOrder !== undefined && (!Number.isInteger(body.sortOrder) || body.sortOrder < 0)) return error("Порядок не может быть отрицательным");
      if (existing) {
        if (existing.label !== label) existing.aliases = [...(existing.aliases || []), categoryDto(existing).name];
        Object.assign(existing, { label, parentId, sortOrder: body.sortOrder ?? existing.sortOrder, isActive: body.isActive ?? existing.isActive });
        return reply(categoryDto(existing));
      }
      const created = { id: nextCategoryId++, label, parentId, slug: "fixture-created-" + nextCategoryId, sortOrder: body.sortOrder ?? 0, isActive: body.isActive ?? true };
      categoryData.push(created);
      return reply(categoryDto(created));
    }
  }
  if (url.pathname === "/api/catalog/categories" || url.pathname === "/api/categories") return reply(allCategories().filter(item => item.effectiveActive));
  if (url.pathname === "/api/catalog/categories/selection") {
    const selected = url.searchParams.getAll("values").map(value => allCategories().find(node => [node.slug,String(node.id),node.name,...(node.aliases || [])].includes(value)));
    if (selected.some(item => !item)) return error("Категория не найдена");
    const ids = new Set();
    selected.forEach(item => { ids.add(item.id); if (item.parentId !== null) ids.add(item.parentId); });
    return reply({categories:allCategories().filter(item => ids.has(item.id)), selectedIds:selected.map(item=>item.id)});
  }
  if (url.pathname === "/api/catalog/category-facets") {
    const context = new URL(url); context.searchParams.delete("category"); context.searchParams.delete("categories");
    const matching = filterProducts(context);
    return reply(allCategories().filter(item=>item.effectiveActive).map(item=>({categoryId:item.id,count:matching.filter(product=>product.categoryId===item.id).length})));
  }
  if (url.pathname === "/api/sizes" || url.pathname === "/api/admin/dictionaries/sizes") return reply(sizes);
  if (url.pathname === "/api/products/brands") return reply(["Тестовый бренд"]);
  if (url.pathname === "/api/products/page") return reply(page(filterProducts(url).map(productDto)));
  if (url.pathname === "/api/admin/products/list") return reply(page(products.filter(product => !url.searchParams.has("status") || product.status === url.searchParams.get("status")).map(product => ({
    ...productDto(product), brandName: "Тестовый бренд", categoryName: productDto(product).category, totalStock: 5, variantsCount: 1,
  }))));
  if (url.pathname === "/api/admin/products/status-counts") return reply({ ALL: products.length, ACTIVE: 3, MODERATION: 1, DRAFT: 0, NEEDS_REVISION: 0, BLOCKED: 0, ARCHIVED: 0 });
  if (/^\/api\/admin\/products\/\d+\/category$/.test(url.pathname)) {
    const product = products.find(item => item.id === Number(url.pathname.split("/")[4]));
    const category = allCategories().find(item => item.id === body.categoryId && item.effectiveActive);
    if (!product || !category) return error("Выберите доступную категорию");
    product.categoryId = category.id; product.suggestedCategoryName = null;
    return reply({});
  }
  if (/^\/api\/admin\/products\/\d+$/.test(url.pathname)) {
    const product = products.find(item => item.id === Number(url.pathname.split("/").at(-1)));
    return product ? reply(productDto(product)) : error("Product unavailable", 404);
  }
  if (/^\/api\/products\/\d+\/page$/.test(url.pathname) || /^\/api\/products\/\d+$/.test(url.pathname)) {
    const id = Number(url.pathname.split("/")[3]);
    const product = products.find(item => item.id === id);
    if (!product) return error("Product unavailable", 404);
    return reply(url.pathname.endsWith("/page") ? { product: productDto(product), related: [] } : productDto(product));
  }
  if (url.pathname === "/api/cart/me") return reply({ cartId: "fixture-empty", items: [] });
  if (url.pathname === "/api/cart/me/count") return reply({ count: 0 });
  if (url.pathname.includes("favorite-brands") || url.pathname === "/api/favorites") return reply([]);
  if (url.pathname.includes("storefront/home")) return reply({ sections: [], collections: [] });
  return reply([]);
});
server.listen(19648, "127.0.0.1", () => {
  const production = process.argv.includes("--production");
  const environment = { ...process.env, RCM_TEST_DIST_DIR: production ? "build/categories-fixture-production" : process.env.RCM_CATEGORIES_FIXTURE_DEV_DIST || "build/categories-dev", NEXT_PUBLIC_API_URL: api, SERVER_API_URL: api, NEXT_PUBLIC_SITE_URL: origin };
  let stopping = false;
  let child;
  const start = (args, onSuccess) => {
    child = spawn(process.execPath, ["node_modules/next/dist/bin/next", ...args], { env: environment, stdio: "inherit" });
    child.on("exit", code => {
      if (!stopping && code === 0 && onSuccess) return onSuccess();
      server.close(); process.exitCode = code || 0;
    });
  };
  const serve = () => start([production ? "start" : "dev", "--hostname", "127.0.0.1", "--port", "13048"]);
  if (production) start(["build"], serve); else serve();
  const close = () => { stopping = true; child?.kill(); server.close(); };
  process.on("SIGINT", close); process.on("SIGTERM", close);
  console.log(`Categories fixture: ${origin}/admin?tab=dictionaries (disposable data)`);
});
