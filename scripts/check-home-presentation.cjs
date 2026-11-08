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
  const storefrontSettings = load("app/lib/storefrontSettings.ts");
  assert.equal(storefrontSettings.normalizeNewArrivalsCount(40), 40);
  for (const invalid of [undefined, null, 0, -1, 101, 2.5, "12"]) assert.equal(storefrontSettings.normalizeNewArrivalsCount(invalid), 8);
  const sectionsModel = load("app/lib/storefrontSections.ts");
  const categoryModel = load("app/lib/categories.ts");
  const presentation = load("app/home/lib/homePresentation.ts", { "../../lib/categories": categoryModel });
  const { normalizeHomeProducts, buildHomeBlocks, homeCategories, homeCatalogHref, buildHomeNavigation } = presentation;
  const section = (id, kind, targetId, extra = {}) => ({ id, kind, targetId, title: `Раздел ${id}`,
    targetSlug: null, coverImageUrl: `/cover-${id}.webp`, coverPositionX: 25, coverPositionY: 70,
    active: true, available: true, sortOrder: id, ...extra });
  const sectionFixture = [section(3, "CATEGORY", 13, { targetSlug: "catalog-clothing" }), section(2, "COLLECTION", 10),
    section(4, "COLLECTION", 11, { active: false }), section(5, "CATEGORY", 14, { available: false }),
    section(6, "CATEGORY", 15, { coverImageUrl: null })];
  const sectionCards = presentation.buildHomeSectionCards(sectionFixture, "women");
  assert.deepEqual(sectionCards.map(item => item.id), [2, 3], "Hide drafts, unavailable targets and missing covers; preserve editorial order");
  assert.equal(sectionCards[0].href, "/catalog?collection=10&audience=women");
  assert.equal(sectionCards[1].href, "/catalog?category=catalog-clothing&audience=women");
  assert.equal(presentation.buildHomeSectionCards([section(1, "CATEGORY", 13)])[0].href, "/catalog?category=13");
  const normalizedSections = sectionsModel.normalizeStorefrontSections([null, {}, sectionFixture[0], sectionFixture[0],
    section(9, "INVALID", 1), section(7, "CATEGORY", 3, { coverPositionX: Infinity, coverPositionY: -100 })]);
  assert.deepEqual(normalizedSections.map(item => item.id), [3, 7]);
  assert.equal(normalizedSections[1].coverPositionX, 50); assert.equal(normalizedSections[1].coverPositionY, 0);
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
  const permanentCategories = homeCategories([...categoryOptions, category(8, "Одежда")], [], "women", true);
  const navigation = buildHomeNavigation(permanentCategories, [], "women");
  assert.deepEqual(navigation.map(item => item.title), ["Весь каталог", "Одежда", "Аксессуары", "Подарки"]);
  assert.equal(new URL(navigation[1].href, "http://localhost").searchParams.get("category"), "category-8",
    "An active empty category keeps a valid category link in permanent navigation");
  assert.equal(navigation[3].href, "/gifts?audience=women");
  const collectionNavigation = buildHomeNavigation(permanentCategories, [
    { ...collections[0], title: " Подарки " }, collections[1],
  ], "all");
  assert.equal(collectionNavigation.filter(item => item.title === "Подарки").length, 1);
  assert.equal(collectionNavigation.at(-1).href, "/catalog?collection=11");
  assert.equal(new URL(homeCategories(categoryOptions, categoryFacets, "all")[0].href, "http://localhost").searchParams.has("audience"), false);
  assert.equal(new URL(homeCatalogHref("women", { category: "Дом & жизнь" }), "http://localhost").searchParams.get("category"), "Дом & жизнь");

  const api = load("app/home/lib/getHomePageData.ts", {
    "../../lib/config": { API_URL: "http://fixture.invalid" }, "./homePresentation": presentation,
    "../../lib/storefrontSettings": storefrontSettings,
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
    await api.getHomePageData("men", 40);
    assert.equal(requested.searchParams.get("size"), "40", "Automatic count must not stop at the old 24-item fetch");
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
    const storefrontApi = load("app/home/lib/getStorefrontHome.ts", { "../../lib/api": { API_URL: "http://fixture.invalid" },
      "../../lib/storefrontSections": sectionsModel, "../../lib/storefrontSettings": storefrontSettings });
    assert.equal(await storefrontApi.getStorefrontHome(), null);
    global.fetch = async () => ({ ok: true, json: async () => ({ heroImageUrl: null, collections: [] }) });
    assert.deepEqual((await storefrontApi.getStorefrontHome()).collections, []);
    assert.equal((await storefrontApi.getStorefrontHome()).newArrivalsCollectionId, null);
    assert.deepEqual((await storefrontApi.getStorefrontHome()).sections, [], "Older settings safely omit sections");
    global.fetch = async () => ({ ok: true, json: async () => ({ collections: [], sections: sectionFixture }) });
    assert.equal((await storefrontApi.getStorefrontHome()).sections[0].id, 2);
    global.fetch = async () => ({ ok: true, json: async () => ({ newArrivalsCollectionId: 42, collections: [
      { id: 42, title: "Выбор", products: [{ id: 1, title: "Нет в наличии", inStock: false }] },
    ] }) });
    const manualSettings = await storefrontApi.getStorefrontHome();
    assert.equal(manualSettings.newArrivalsCollectionId, 42);
    assert.equal(manualSettings.collections[0].products[0].inStock, false);
    assert.deepEqual(normalizeHomeProducts(manualSettings.collections[0].products), []);
    global.fetch = async () => ({ ok: true, json: async () => ({}) });
    assert.equal(await storefrontApi.getStorefrontHome(), null);
    const brandsApi = load("app/home/lib/getHomeBrands.ts", { "../../lib/config": { API_URL: "http://fixture.invalid" } });
    global.fetch = async () => ({ ok: true, json: async () => [
      { id: 1, name: " Бренд ", slug: " brand " }, { id: 1, name: "Дубль", slug: "duplicate" }, { id: 2, name: "Без ссылки" },
    ] });
    assert.deepEqual(await brandsApi.getHomeBrands(), { brands: [{ id: 1, name: "Бренд", slug: "brand", wordmarkUrl: null }], status: "ready" });
    global.fetch = async () => ({ ok: true, json: async () => [{ id: 1, name: "Бренд", slug: "brand", wordmarkUrl: " /brand.svg " }] });
    assert.equal((await brandsApi.getHomeBrands()).brands[0].wordmarkUrl, "/brand.svg");
    global.fetch = async () => ({ ok: true, json: async () => [] });
    assert.deepEqual(await brandsApi.getHomeBrands(), { brands: [], status: "ready" });
    for (const malformed of [{}, [{ id: 1 }]]) {
      global.fetch = async () => ({ ok: true, json: async () => malformed });
      assert.equal((await brandsApi.getHomeBrands()).status, "error");
    }
    global.fetch = async () => ({ ok: false, status: 502 });
    assert.equal((await brandsApi.getHomeBrands()).status, "error");
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
  const { StorefrontNavigation } = load("app/home/sections/StorefrontNavigation.tsx", {
    "react/jsx-runtime": jsx, "next/link": { default: Link },
    "../lib/homePresentation": presentation, "../../HomePage.module.css": { default: {} },
  });
  const { ProductRailSection } = load("app/home/sections/ProductRailSection.tsx", {
    "react/jsx-runtime": jsx, "next/link": { default: Link },
    "../../components/ProductShowcase/ProductShowcase": { ProductShowcase: ({ title, description, products, mobileLayout, maxProducts }) => jsx.jsx("section", { "data-mobile-layout": mobileLayout, "data-row": products.slice(0, maxProducts ?? 4).map(p => p.id).join(","), children: [title, description] }) },
    "../../components/ProductShowcase/ProductShowcaseAction": { ProductShowcaseAction: ({ href, label }) => jsx.jsx("a", { href, children: label }) },
    "../../components/ProductPhoto": photo, "../../components/ui/Price": prices, "../../lib/productUrls": productUrls,
    "./ProductRailSection.module.css": { default: {} },
  });
  const { ProductShowcase } = load("app/components/ProductShowcase/ProductShowcase.tsx", {
    "react/jsx-runtime": jsx, react: require("react"),
    "../ProductCarousel/ProductCarousel": { ProductCarousel: () => null },
    "../ProductTile/ProductTile": { ProductTile: ({ product }) => jsx.jsx("li", { "data-product": product.id }) },
    "./ProductShowcase.module.css": { default: {} },
    "./ProductShowcaseAction": { ProductShowcaseAction: () => null },
  });
  const gridMarkup = maxProducts => renderToStaticMarkup(jsx.jsx(ProductShowcase, {
    title: "Новое", products, variant: "grid", maxProducts,
  }));
  assert.equal((gridMarkup(8).match(/data-product=/g) ?? []).length, 8, "Explicit grid size must reach the rendered tiles");
  assert.equal((gridMarkup(undefined).match(/data-product=/g) ?? []).length, 4, "Existing grid consumers retain their default size");
  let wordmarkFailure = null;
  const { BrandWordmark } = load("app/components/ui/BrandWordmark.tsx", {
    "react/jsx-runtime": jsx,
    react: { useState: () => [wordmarkFailure, src => { wordmarkFailure = src; }] },
    "next/image": { default: ({ src, alt }) => jsx.jsx("img", { src, alt }) },
    "./BrandWordmark.module.css": { default: {} },
  });
  const logoProps = { src: "/wordmark.svg", name: "Бренд" };
  const logo = BrandWordmark(logoProps);
  assert(renderToStaticMarkup(logo).includes('alt="Бренд"'));
  logo.props.children.props.onError();
  assert(!renderToStaticMarkup(BrandWordmark(logoProps)).includes("<img"), "Broken image falls back to the brand name");
  assert(renderToStaticMarkup(BrandWordmark(logoProps)).includes("Бренд"));
  assert(renderToStaticMarkup(BrandWordmark({ ...logoProps, src: "/replaced.svg" })).includes("<img"), "A replacement wordmark is retried");
  wordmarkFailure = null;
  let coverFailure = null;
  const { StorefrontSectionCard } = load("app/components/ui/StorefrontSectionCard.tsx", {
    "react/jsx-runtime": jsx, "next/link": { default: Link },
    react: { useState: () => [coverFailure, src => { coverFailure = src; }] },
    "next/image": { default: ({ src, alt, style }) => jsx.jsx("img", { src, alt, style }) },
    "./DesignSystemIcon": { DesignSystemIcon: Icon }, "./StorefrontSectionCard.module.css": { default: {} },
  });
  const coverProps = { title: "Одежда", coverImageUrl: "/selected-cover.webp", coverPositionX: 25, coverPositionY: 70, href: "/catalog?category=13" };
  const coverTree = StorefrontSectionCard(coverProps);
  const coverMarkup = renderToStaticMarkup(coverTree);
  assert(coverMarkup.includes('href="/catalog?category=13"') && coverMarkup.includes('src="/selected-cover.webp"'));
  assert(coverMarkup.includes("object-position:25% 70%"));
  coverTree.props.children.props.children[0].props.children.props.onError();
  assert(!renderToStaticMarkup(StorefrontSectionCard(coverProps)).includes("<img"), "Broken covers preserve the label and link");
  assert(renderToStaticMarkup(StorefrontSectionCard({ ...coverProps, coverImageUrl: "/replacement.webp" })).includes("<img"));
  assert(!renderToStaticMarkup(StorefrontSectionCard({ ...coverProps, href: undefined })).includes("<a"), "Admin previews are not nested links");
  coverFailure = null;
  const discovery = load("app/home/sections/HomeDiscovery.tsx", {
    "react/jsx-runtime": jsx, "next/link": { default: Link },
    "../../components/ui/DesignSystemIcon": { DesignSystemIcon: Icon },
    "../../components/ui/BrandWordmark": { BrandWordmark },
    "../../components/ui/StorefrontSectionCard": { StorefrontSectionCard },
    "../../components/ProductPhoto": photo, "../lib/homePresentation": presentation,
    "../../components/ui/EmptyState": { EmptyState }, "./HomeRequestError": { HomeRequestError },
    "../../lib/purchaseInformation": { purchaseInformation: { delivery: "Доставка в ПВЗ", payment: "Онлайн-оплата" } },
    "../../HomePage.module.css": { default: {} },
  });
  let brandResult = { brands: [{ id: 1, name: "Бренд", slug: "test-brand" }], status: "ready" };
  const Page = load("app/page.tsx", {
    "react/jsx-runtime": jsx, "next/link": { default: Link }, "./HomePage.module.css": { default: {} },
    "./home/lib/getHomePageData": { getHomePageData: async () => catalog },
    "./home/lib/getHomeCategories": { getHomeCategories: async () => homeCategoryResult },
    "./home/lib/getStorefrontHome": { getStorefrontHome: async () => storefront },
    "./home/lib/homePresentation": presentation,
    "./lib/storefrontSettings": storefrontSettings,
    "./home/lib/getHomeBrands": { getHomeBrands: async () => brandResult },
    "./home/sections/HomeDiscovery": discovery,
    "./home/sections/ProductRailSection": { ProductRailSection }, "./home/sections/HomeRequestError": { HomeRequestError },
    "./home/sections/CategoriesRefresh": { CategoriesRefresh: () => null },
    "./home/sections/StorefrontNavigation": { StorefrontNavigation },
    "./components/Recommendations/RecommendationsShowcase": { RecommendationsShowcase: props => jsx.jsx("div", { "data-excluded": props.excludeIds.join(",") }) },
    "./components/ui/EmptyState": { EmptyState }, "./components/ui/Icon": { Icon },
  }).default;
  const brandWordmarks = renderToStaticMarkup(jsx.jsx(discovery.HomeBrands, { brands: [
    { id: 1, name: "С логотипом", slug: "with-logo", wordmarkUrl: "/brand.svg" },
    { id: 2, name: "Без логотипа", slug: "without-logo", wordmarkUrl: null },
  ], failed: false }));
  assert(brandWordmarks.includes('src="/brand.svg"'));
  assert(brandWordmarks.includes('aria-label="С логотипом"'));
  assert(brandWordmarks.includes('href="/brand/without-logo"') && brandWordmarks.includes("Без логотипа"));
  const readyPage = renderToStaticMarkup(await Page({}));
  assert(readyPage.includes('data-row="1,2,3,4,5,6,7,8"')); assert(readyPage.includes('data-mobile-layout="grid"'));
  const sectionPositions = ["Разделы витрины", "Новое на рцмаркет", 'data-home-sections', 'data-home-brands', 'data-home-shopping'].map(label => readyPage.indexOf(label));
  assert(sectionPositions.every(position => position >= 0));
  assert(sectionPositions.every((position, index) => index === 0 || position > sectionPositions[index - 1]), "Stable home section order");
  assert(readyPage.includes('href="/brand/test-brand"'));
  assert(!readyPage.includes('data-home-hero')); assert(!readyPage.includes("Вещи"));
  const { ProductSelectionOrder } = load("app/components/ui/ProductSelectionOrder.tsx", {
    "react/jsx-runtime": jsx,
    "next/image": () => null, "./Button": { Button: () => null }, "./DesignSystemIcon": { DesignSystemIcon: () => null },
    "./Price": { Price: () => null }, "./ProductSelectionOrder.module.css": { default: new Proxy({}, { get: (_, key) => key }) },
  });
  let reordered;
  const originalOrder = [1, 2, 3];
  const orderTree = ProductSelectionOrder({ ids: originalOrder, products: raw, onChange: ids => { reordered = ids; } });
  const orderButtons = orderTree.props.children[1].props.children.flatMap(item => item.props.children[3].props.children);
  orderButtons[3].props.onClick();
  assert.deepEqual(reordered, [1, 3, 2]); assert.deepEqual(originalOrder, [1, 2, 3]);
  assert.equal(orderButtons[0].props.disabled, true); assert.equal(orderButtons[5].props.disabled, true);
  reordered = undefined;
  const disabledOrderTree = ProductSelectionOrder({ ids: originalOrder, products: raw, disabled: true, onChange: ids => { reordered = ids; } });
  disabledOrderTree.props.children[1].props.children[0].props.children[3].props.children[1].props.onClick();
  assert.equal(reordered, undefined, "Saving cannot change product order");
  storefront = { collections: [{ ...collections[0], products: [raw[6], raw[1], raw[4], raw[0], raw[5]] }], newArrivalsCollectionId: collections[0].id };
  catalog = { products: [], status: "error" };
  const manualPage = renderToStaticMarkup(await Page({}));
  assert(manualPage.includes('data-row="7,2,5,1,6"'), "Manual selection preserves editorial order within the eight-card limit");
  assert(!manualPage.includes("Не удалось загрузить новинки"), "Manual mode does not depend on automatic catalog request");
  assert(manualPage.includes(`collection=${collections[0].id}`));
  storefront.newArrivalsCount = 2;
  assert(renderToStaticMarkup(await Page({})).includes('data-row="7,2"'), "Manual source respects its configured count");
  storefront = { collections: [], newArrivalsCount: 3 };
  catalog = { products, status: "ready" };
  assert(renderToStaticMarkup(await Page({})).includes('data-row="1,2,3"'), "Automatic source respects its configured count");
  storefront = { collections: [], newArrivalsCollectionId: 999 };
  catalog = { products, status: "ready" };
  assert(renderToStaticMarkup(await Page({})).includes('data-row="1,2,3,4,5,6,7,8"'), "Removed or hidden selection falls back to newest");
  storefront = { collections: [], heroImageUrl: null };
  assert(readyPage.includes('category=category-1')); assert(!readyPage.includes("Скрытый раздел"));
  catalog = { products: [], status: "error" }; storefront = null;
  const failedPage = renderToStaticMarkup(await Page({}));
  assert(failedPage.includes("Не удалось загрузить новинки")); assert(failedPage.includes("Не удалось загрузить разделы и подборки")); assert(!failedPage.includes("скоро появятся"));
  storefront = { collections: [{ ...collections[0], products: raw.slice(0, 2) }], heroImageUrl: null };
  const partialPage = renderToStaticMarkup(await Page({}));
  assert(partialPage.includes("Не удалось загрузить новинки")); assert(partialPage.includes('collection=10'));
  assert(!partialPage.includes('src="/p'), "Product imagery is never substituted for a missing editorial cover");
  storefront = { collections: [{ ...collections[0], products: raw.slice(0, 1) }], heroImageUrl: null };
  const singletonPage = renderToStaticMarkup(await Page({}));
  assert(singletonPage.includes('collection=10')); assert(singletonPage.includes('data-home-sections'));
  storefront = { collections: [], heroImageUrl: null }; catalog = { products: [], status: "ready" };
  const emptyPage = renderToStaticMarkup(await Page({}));
  assert(emptyPage.includes("Новые товары скоро появятся")); assert(!emptyPage.includes("Не удалось"));
  homeCategoryResult = { categories: [], status: "error" };
  catalog = { products, status: "ready" };
  const categoryErrorPage = renderToStaticMarkup(await Page({}));
  assert(categoryErrorPage.includes("Не удалось загрузить категории"));
  assert(!categoryErrorPage.includes("Не удалось загрузить товары"));
  assert(categoryErrorPage.includes("Весь каталог")); assert(categoryErrorPage.includes('data-row="1,2,3,4,5,6,7,8"'));
  homeCategoryResult = { categories: [], status: "ready" };
  const noCategoryPage = renderToStaticMarkup(await Page({}));
  assert(noCategoryPage.includes("Весь каталог")); assert(!noCategoryPage.includes("Не удалось"));
  brandResult = { brands: [], status: "error" };
  const brandFailure = renderToStaticMarkup(await Page({}));
  assert(brandFailure.includes("Не удалось загрузить бренды"));
  assert(brandFailure.includes('data-row="1,2,3,4,5,6,7,8"'), "Brand failure preserves products");
  catalog = { products, status: "ready" };
  storefront = { collections, heroImageUrl: null };
  const curatedPage = renderToStaticMarkup(await Page({}));
  assert(curatedPage.indexOf("Новое на рцмаркет") < curatedPage.indexOf("Разделы и подборки"), "Collections never replace new arrivals");
  assert.equal((curatedPage.match(/data-row=/g) || []).length, 1, "Collection covers do not duplicate product grids");
  storefront = { collections, sections: sectionFixture, heroImageUrl: null };
  const coverPage = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ audience: "women" }) }));
  assert(coverPage.includes('src="/cover-2.webp"') && coverPage.includes('src="/cover-3.webp"'));
  assert(!coverPage.includes('src="/cover-4.webp"') && !coverPage.includes('src="/cover-5.webp"'));
  assert(coverPage.includes('href="/catalog?category=catalog-clothing&amp;audience=women"'));
  const GiftsPage = load("app/gifts/page.tsx", {
    "react/jsx-runtime": jsx, "next/link": { default: Link },
    "next/navigation": { redirect: href => { throw new Error(`redirect:${href}`); } },
    "../components/ui/EmptyState": { EmptyState }, "../home/lib/homePresentation": presentation,
    "../home/lib/getStorefrontHome": { getStorefrontHome: async () => storefront },
    "../home/lib/getHomeCategories": { getHomeCategories: async () => homeCategoryResult },
    "../home/sections/HomeRequestError": { HomeRequestError },
    "../home/sections/StorefrontNavigation": { StorefrontNavigation }, "../HomePage.module.css": { default: {} },
  }).default;
  const emptyGifts = renderToStaticMarkup(await GiftsPage({}));
  assert(emptyGifts.includes("Подборка скоро появится"));
  assert(emptyGifts.includes('aria-current="page"'));
  storefront = null;
  const failedGifts = renderToStaticMarkup(await GiftsPage({}));
  assert(failedGifts.includes("Не удалось загрузить подборку"));
  assert(!failedGifts.includes("Подборка скоро появится"));
  storefront = { collections: [{ ...collections[0], title: " ПОДАРКИ " }] };
  await assert.rejects(() => GiftsPage({ searchParams: Promise.resolve({ audience: "women" }) }),
    /redirect:\/catalog\?collection=10&audience=women/);
  console.log("PASS: permanent mixed category/collection navigation, gifts empty/error and automatic published collection redirect");
  console.log("PASS: home catalog size, editorial ordering/singletons, unique rows, audience, shared hierarchy/order/facets/slug links, safe empty/error contracts");
  console.log("PASS: independent no-store category/facet requests, malformed/502/network failures, invalidation cleanup, all-catalog escape");
  console.log("PASS: rendered ready/empty/full failure/partial failure, surviving editorial singleton and busy retry");
  console.log("PASS: stable categories/new arrivals/collections/brands/shopping order; isolated brand failures and safe brand API normalization");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
