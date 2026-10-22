/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
function load(file, imports = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const testModule = { exports: {} };
  new Function("module", "exports", "require", code)(testModule, testModule.exports, name => {
    assert(name in imports, `Unexpected import ${name}`);
    return imports[name];
  });
  return testModule.exports;
}

async function main() {
  const categoryModel = load("app/lib/categories.ts");
  const presentation = load("app/home/lib/homePresentation.ts", { "../../lib/categories": categoryModel });
  const { normalizeHomeProducts, buildHomeBlocks, homeCategories, homeCatalogHref } = presentation;
  const category = (id, label, parentId = null, extra = {}) => ({ id, label, parentId, name: label,
    slug: `category-${id}`, sortOrder: id, isActive: true, effectiveActive: true, productCount: 0, subtreeProductCount: 0, ...extra });
  const categoryOptions = [
    category(3, "Обувь", null, { sortOrder: 1 }),
    category(4, "Кроссовки", 3, { name: "Обувь / Кроссовки" }),
    category(1, "Аксессуары", null, { sortOrder: 2 }),
    category(2, "Часы", 1, { name: "Аксессуары / Часы" }),
    category(5, "Скрытый раздел", null, { isActive: false, effectiveActive: false }),
    category(6, "Пустой раздел"),
    category(7, "Название / с косой чертой", null, { slug: null }),
  ];
  const categoryFacets = [{ categoryId: 2, count: 2 }, { categoryId: 4, count: 30 },
    { categoryId: 5, count: 4 }, { categoryId: 7, count: 1 }];
  const raw = Array.from({ length: 8 }, (_, index) => ({ id: index + 1, title: `Товар ${index + 1}`, brand: "Бренд",
    category: index < 6 ? "Аксессуары / Часы" : "Обувь / Кроссовки", audience: index === 7 ? "WOMEN" : "UNISEX", coverImage: `/p${index + 1}.webp`, minPrice: 100 }));
  const products = normalizeHomeProducts([...raw, raw[0], null, {}, { id: -1, title: "Неверный" }, { id: 99, title: "Нет в наличии", inStock: false }]);
  assert.equal(products.length, 8);
  assert.equal(normalizeHomeProducts(raw, "men").length, 7);
  assert.equal(normalizeHomeProducts([{ id: 1, title: "Цена", minPrice: NaN }])[0].minPrice, 0);
  const blocks = buildHomeBlocks(products, "all");
  assert.equal(blocks.length, 1, "A small catalog must not generate repetitive brand/category rows");
  assert.deepEqual(blocks[0].products.map(product => product.id), [1, 2, 3, 4]);
  assert.deepEqual(buildHomeBlocks([], "all"), []);
  assert.deepEqual(buildHomeBlocks([products[0]], "all", [], [products[0].id]), []);
  const collections = [
    { id: 10, title: "Подборка 1", description: "Описание редактора", products: raw.slice(0, 4) },
    { id: 11, title: "Подборка 2", description: null, products: [raw[0], ...raw.slice(4)] },
  ];
  const managed = buildHomeBlocks(products, "men", collections, [1]);
  assert.deepEqual(managed.map(block => block.products.map(product => product.id)), [[2, 3, 4], [5, 6, 7]]);
  assert.equal(managed[0].description, "Описание редактора");
  assert.equal(new URL(managed[0].href, "http://localhost").searchParams.get("audience"), "men");
  assert.equal(buildHomeBlocks([], "all", [{ ...collections[0], products: [raw[0]] }])[0].products.length, 1,
    "An intentional editorial singleton remains available as a spotlight");
  const categoryLinks = homeCategories(categoryOptions, categoryFacets, "women");
  assert.deepEqual(categoryLinks.map(category => category.title), ["Обувь", "Аксессуары", "Название / с косой чертой"],
    "Use server hierarchy/order and complete facets rather than product names or the preview page");
  assert.equal(new URL(categoryLinks[0].href, "http://localhost").searchParams.get("category"), "category-3");
  assert.equal(new URL(categoryLinks[0].href, "http://localhost").searchParams.get("audience"), "women");
  assert.equal(new URL(categoryLinks[2].href, "http://localhost").searchParams.get("category"), "7");
  assert.deepEqual(homeCategories(categoryOptions, [], "all"), []);
  assert.equal(new URL(homeCategories(categoryOptions, categoryFacets, "all")[0].href, "http://localhost").searchParams.has("audience"), false);
  assert.equal(new URL(homeCatalogHref("women", { category: "Дом & жизнь" }), "http://localhost").searchParams.get("category"), "Дом & жизнь");

  const api = load("app/home/lib/getHomePageData.ts", {
    "../../lib/config": { API_URL: "http://fixture.invalid" }, "./homePresentation": presentation,
  });
  const originalFetch = global.fetch;
  try {
    const homeCategoriesApi = load("app/home/lib/getHomeCategories.ts", {
      "../../lib/config": { API_URL: "http://fixture.invalid" }, "../../lib/categories": categoryModel, "./homePresentation": presentation,
    });
    const categoryRequests = [];
    global.fetch = async (url, options) => {
      categoryRequests.push({ url: new URL(url), options });
      return { ok: true, json: async () => String(url).includes("category-facets") ? categoryFacets : categoryOptions };
    };
    assert.deepEqual(await homeCategoriesApi.getHomeCategories("women"), { categories: categoryLinks, status: "ready" });
    assert.equal(categoryRequests.length, 2, "Category links must not download products");
    assert.equal(categoryRequests[0].url.pathname, "/api/catalog/categories");
    assert.equal(categoryRequests[1].url.pathname, "/api/catalog/category-facets");
    assert.equal(categoryRequests[1].url.searchParams.get("audience"), "women");
    assert(categoryRequests.every(request => request.options.cache === "no-store" && request.options.signal instanceof AbortSignal));
    categoryRequests.length = 0;
    await homeCategoriesApi.getHomeCategories();
    assert.equal(categoryRequests[1].url.searchParams.has("audience"), false);
    for (const malformed of [null, {}, [{ id: 1 }]]) {
      global.fetch = async url => ({ ok: true, json: async () => String(url).includes("category-facets") ? categoryFacets : malformed });
      assert.deepEqual(await homeCategoriesApi.getHomeCategories(), { categories: [], status: "error" });
      global.fetch = async url => ({ ok: true, json: async () => String(url).includes("category-facets") ? malformed : categoryOptions });
      assert.equal((await homeCategoriesApi.getHomeCategories()).status, "error");
    }
    global.fetch = async () => ({ ok: true, json: async () => [] });
    assert.deepEqual(await homeCategoriesApi.getHomeCategories(), { categories: [], status: "ready" });
    global.fetch = async url => ({ ok: !String(url).includes("category-facets"), status: 502, json: async () => categoryOptions });
    assert.equal((await homeCategoriesApi.getHomeCategories()).status, "error");
    global.fetch = async () => { throw Error("private category upstream details"); };
    assert.deepEqual(await homeCategoriesApi.getHomeCategories(), { categories: [], status: "error" });
    let requested;
    global.fetch = async url => { requested = new URL(url); return { ok: true, json: async () => ({ content: raw }) }; };
    const ready = await api.getHomePageData("men");
    assert.equal(ready.status, "ready"); assert.equal(ready.products.length, 7);
    assert.equal(requested.searchParams.get("audience"), "men");
    global.fetch = async () => ({ ok: true, json: async () => ({ content: [] }) });
    assert.equal((await api.getHomePageData()).status, "ready");
    for (const malformed of [null, {}, { content: null }]) {
      global.fetch = async () => ({ ok: true, json: async () => malformed });
      assert.equal((await api.getHomePageData()).status, "error", "Malformed API data must not become an empty catalog");
    }
    global.fetch = async () => ({ ok: false, status: 502 });
    assert.deepEqual(await api.getHomePageData(), { products: [], blocks: [], status: "error" });
    global.fetch = async () => { throw Error("private upstream details"); };
    assert.equal((await api.getHomePageData()).status, "error");
    const storefrontApi = load("app/home/lib/getStorefrontHome.ts", { "../../lib/api": { API_URL: "http://fixture.invalid" } });
    assert.equal(await storefrontApi.getStorefrontHome(), null);
    global.fetch = async () => ({ ok: true, json: async () => ({ heroImageUrl: null, collections: [] }) });
    assert.deepEqual((await storefrontApi.getStorefrontHome()).collections, []);
    global.fetch = async () => ({ ok: true, json: async () => ({}) });
    assert.equal(await storefrontApi.getStorefrontHome(), null);
  } finally { global.fetch = originalFetch; }
  const jsx = require("react/jsx-runtime");
  const { renderToStaticMarkup } = require("react-dom/server");
  const Link = ({ children, ...props }) => jsx.jsx("a", { ...props, children });
  const Icon = () => jsx.jsx("svg", {});
  const { EmptyState } = load("app/components/ui/EmptyState.tsx", { "react/jsx-runtime": jsx, "./Icon": { Icon } });
  const { Button } = load("app/components/ui/Button.tsx", { "react/jsx-runtime": jsx, "./Button.module.css": { default: {} } });
  const { RequestError } = load("app/components/ui/RequestError.tsx", {
    "react/jsx-runtime": jsx, "./Button": { Button }, "./EmptyState": { EmptyState }, "./Icon": { Icon }, "./RequestError.module.css": { default: {} },
  });
  let pending = false, refreshed = 0;
  const { HomeRequestError } = load("app/home/sections/HomeRequestError.tsx", {
    "react/jsx-runtime": jsx, react: { useTransition: () => [pending, work => work()] },
    "next/navigation": { useRouter: () => ({ refresh: () => { refreshed += 1; } }) }, "../../components/ui/RequestError": { RequestError },
  });
  HomeRequestError({ partial: false }).props.onRetry(); assert.equal(refreshed, 1);
  pending = true;
  const busy = renderToStaticMarkup(jsx.jsx(HomeRequestError, { partial: true }));
  assert(busy.includes('data-loading="true"')); assert(busy.includes('disabled=""'));
  assert(!busy.includes("Загружаем")); pending = false;
  const categoryFailure = renderToStaticMarkup(jsx.jsx(HomeRequestError, { partial: true, message: "Не удалось загрузить категории" }));
  assert(categoryFailure.includes("Не удалось загрузить категории")); assert(!categoryFailure.includes("загрузить товары"));

  let subscribed, unsubscribed = 0;
  const { CategoriesRefresh } = load("app/home/sections/CategoriesRefresh.tsx", {
    react: { useEffect: effect => { subscribed = effect(); } },
    "next/navigation": { useRouter: () => ({ refresh: () => { refreshed += 1; } }) },
    "../../lib/categoryEvents": { subscribeCategoriesChanged: callback => { callback(); return () => { unsubscribed += 1; }; } },
  });
  assert.equal(CategoriesRefresh(), null); assert.equal(refreshed, 2);
  subscribed(); assert.equal(unsubscribed, 1, "Category invalidation subscription must be cleaned up");

  let catalog = { products, status: "ready" }, storefront = { collections: [], heroImageUrl: null };
  let homeCategoryResult = { categories: categoryLinks, status: "ready" };
  const photo = { ProductPhoto: ({ alt }) => jsx.jsx("img", { alt }) };
  const prices = { Price: ({ amount }) => String(amount) };
  const productUrls = load("app/lib/productUrls.ts");
  const { ProductRailSection } = load("app/home/sections/ProductRailSection.tsx", {
    "react/jsx-runtime": jsx, "next/link": { default: Link },
    "../../components/ProductShowcase/ProductShowcase": { ProductShowcase: ({ title, description, products, mobileLayout }) => jsx.jsx("section", { "data-mobile-layout": mobileLayout, "data-row": products.map(p => p.id).join(","), children: [title, description] }) },
    "../../components/ProductPhoto": photo, "../../components/ui/Price": prices, "../../lib/productUrls": productUrls,
    "./ProductRailSection.module.css": { default: {} },
  });
  const Page = load("app/page.tsx", {
    "react/jsx-runtime": jsx, "next/link": { default: Link }, "./HomePage.module.css": { default: {} },
    "./home/lib/getHomePageData": { getHomePageData: async () => catalog },
    "./home/lib/getHomeCategories": { getHomeCategories: async () => homeCategoryResult },
    "./home/lib/getStorefrontHome": { getStorefrontHome: async () => storefront },
    "./home/lib/homePresentation": presentation,
    "./home/sections/ProductRailSection": { ProductRailSection }, "./home/sections/HomeRequestError": { HomeRequestError },
    "./home/sections/CategoriesRefresh": { CategoriesRefresh: () => null },
    "./components/Recommendations/RecommendationsShowcase": { RecommendationsShowcase: props => jsx.jsx("div", { "data-excluded": props.excludeIds.join(",") }) },
    "./components/ui/EmptyState": { EmptyState }, "./components/ui/Icon": { Icon },
  }).default;
  const readyPage = renderToStaticMarkup(await Page({}));
  assert(readyPage.includes('data-row="1,2,3,4"')); assert(readyPage.includes('data-mobile-layout="grid"'));
  assert(readyPage.includes('data-excluded="1,2,3,4"'));
  assert(!readyPage.includes('data-home-hero')); assert(!readyPage.includes("Вещи"));
  assert(readyPage.includes('category=category-3')); assert(!readyPage.includes("Скрытый раздел"));
  catalog = { products: [], status: "error" }; storefront = null;
  const failedPage = renderToStaticMarkup(await Page({}));
  assert(failedPage.includes("Не удалось загрузить товары")); assert(!failedPage.includes("скоро появятся"));
  storefront = { collections: [{ ...collections[0], products: raw.slice(0, 2) }], heroImageUrl: null };
  const partialPage = renderToStaticMarkup(await Page({}));
  assert(partialPage.includes("Не удалось обновить часть подборок")); assert(partialPage.includes('data-row="1,2"'));
  assert(partialPage.includes("Описание редактора"));
  storefront = { collections: [{ ...collections[0], products: raw.slice(0, 1) }], heroImageUrl: null };
  const singletonPage = renderToStaticMarkup(await Page({}));
  assert(singletonPage.includes("Товар 1")); assert(singletonPage.includes("data-home-spotlight"));
  storefront = { collections: [], heroImageUrl: null }; catalog = { products: [], status: "ready" };
  const emptyPage = renderToStaticMarkup(await Page({}));
  assert(emptyPage.includes("Новые товары скоро появятся")); assert(!emptyPage.includes("Не удалось"));
  homeCategoryResult = { categories: [], status: "error" };
  catalog = { products, status: "ready" };
  const categoryErrorPage = renderToStaticMarkup(await Page({}));
  assert(categoryErrorPage.includes("Не удалось загрузить категории"));
  assert(!categoryErrorPage.includes("Не удалось загрузить товары"));
  assert(categoryErrorPage.includes("Весь каталог")); assert(categoryErrorPage.includes('data-row="1,2,3,4"'));
  homeCategoryResult = { categories: [], status: "ready" };
  const noCategoryPage = renderToStaticMarkup(await Page({}));
  assert(noCategoryPage.includes("Весь каталог")); assert(!noCategoryPage.includes("Не удалось"));
  console.log("PASS: home catalog size, editorial ordering/singletons, unique rows, audience, shared hierarchy/order/facets/slug links, safe empty/error contracts");
  console.log("PASS: independent no-store category/facet requests, malformed/502/network failures, invalidation cleanup, all-catalog escape");
  console.log("PASS: rendered ready/empty/full failure/partial failure, surviving editorial singleton and busy retry");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
