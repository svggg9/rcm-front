/* eslint-disable @typescript-eslint/no-require-imports -- Isolated SSR/navigation checks; every request is mocked. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");
const { renderToStaticMarkup } = require("react-dom/server");

function load(file, imports = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const testModule = { exports: {} };
  new Function("module", "exports", "require", code)(testModule, testModule.exports, name => {
    assert(name in imports, `Unexpected import ${name} in ${file}`);
    return imports[name];
  });
  return testModule.exports;
}

const styles = { default: new Proxy({}, { get: (_, key) => String(key) }) };
const categoryModel = load("app/lib/categories.ts");
const catalogUtils = load("app/components/Catalog/catalogUtils.ts", { "../../lib/categories": categoryModel });
const category = (id, label, parentId = null, extra = {}) => ({ id, label, name: parentId === null ? label : `Путь / ${label}`,
  parentId, slug: `category-${id}`, sortOrder: id, isActive: true, effectiveActive: true,
  productCount: 0, subtreeProductCount: 0, ...extra });
const categories = [category(1, "Одежда"), category(2, "Рубашки", 1), category(3, "Куртки", 1),
  category(10, "Обувь"), category(11, "Кроссовки", 10), category(12, "Лоферы", 10), category(20, "Дом")];
const ownFacets = [{ categoryId: 2, count: 100 }, { categoryId: 11, count: 2 }];
const rawProducts = Array.from({ length: 48 }, (_, index) => ({ id: index + 1, title: `Кроссовки ${index + 1}`,
  brand: "PUMA", category: "Путь / Кроссовки", audience: "UNISEX", coverImage: `/product-${index}.webp`, minPrice: 11900 }));
const ownCollections = [{ id: 7, title: "Для бега" }];
const allCollections = [...ownCollections, { id: 8, title: "Чужие рубашки" }];
const Link = ({ href, children, prefetch, ...props }) => {
  void prefetch;
  return jsx.jsx("a", { href, ...props, children });
};
const Icon = () => null;
const fakeHooks = {
  useState: initial => [typeof initial === "function" ? initial() : initial, () => {}],
  useMemo: factory => factory(), useCallback: callback => callback, useEffect: () => {},
  useRef: current => ({ current }), useTransition: () => [false, action => action()],
};
const { CatalogClient } = load("app/components/Catalog/CatalogClient.tsx", {
  "react/jsx-runtime": jsx, react: fakeHooks,
  "next/link": { default: Link }, "next/navigation": { useRouter: () => ({ push() {}, refresh() {} }) },
  "./Catalog.module.css": styles, "./catalogUtils": catalogUtils,
  "../../lib/categories": categoryModel, "../../lib/categoryEvents": { subscribeCategoriesChanged: () => () => {} },
  "../ui/Icon": { Icon },
  "../ui/RequestError": { RequestError: ({ message }) => jsx.jsx("p", { "data-request-error": true, children: message }) },
  "./CatalogCategorySheet": { CatalogCategorySheet: () => null },
  "./CatalogFiltersDrawer": { CatalogFiltersDrawer: () => null },
  "./CatalogResults": { CatalogResults: () => null },
});
const { CatalogPageContent } = load("app/components/Catalog/CatalogPageContent.tsx", {
  "react/jsx-runtime": jsx, react: { cache: callback => callback },
  "next/navigation": { redirect: href => { throw new Error(`redirect:${href}`); } },
  "../../lib/api": { API_URL: "http://fixture.invalid" }, "../../lib/categories": categoryModel,
  "./Catalog.module.css": styles, "./catalogUtils": catalogUtils,
  "./CatalogClient": { CatalogClient },
  "../Recommendations/RecommendationsShowcase": { RecommendationsShowcase: () => null },
});

function findClient(element) {
  if (!element || typeof element !== "object") return null;
  if (element.type === CatalogClient) return element;
  const children = element.props?.children;
  for (const child of Array.isArray(children) ? children : [children]) {
    const result = findClient(child);
    if (result) return result;
  }
  return null;
}

async function scenario(params = {}, options = {}) {
  const calls = [];
  global.fetch = async (url, request) => {
    const parsed = new URL(url);
    calls.push({ url: parsed, request });
    const query = parsed.searchParams;
    if (parsed.pathname === "/api/catalog/categories") return Response.json(categories);
    if (parsed.pathname === "/api/catalog/categories/selection") return Response.json({ categories: [] });
    if (parsed.pathname === "/api/products/brands") return Response.json(["PUMA", "adidas"]);
    if (parsed.pathname === "/api/sizes") return Response.json([{ id: 1, name: "M" }]);
    if (parsed.pathname === "/api/brands/puma/collections") return options.ownFailure ? new Response("", {status:502}) : Response.json([{id:7,title:"Выбор продавца"}]);
    if (parsed.pathname === "/api/storefront/home/collections") {
      if (options.collectionsFailure) return new Response("private upstream details", { status: 502 });
      if (options.collectionsMalformed) return Response.json([{ id: 8, title: "Чужие рубашки" }, { id: "bad" }]);
      return Response.json(query.get("brand") === "PUMA" ? ownCollections : allCollections);
    }
    if (parsed.pathname === "/api/catalog/category-facets") {
      const restricted = ["sizes", "minPrice", "maxPrice", "collectionId", "q"].some(key => query.has(key));
      if (options.facetsFailure && !restricted) return new Response("private facet details", { status: 502 });
      if (restricted) return Response.json([]);
      return Response.json(query.getAll("brands").includes("PUMA") ? ownFacets : [...ownFacets, { categoryId: 20, count: 4 }]);
    }
    if (parsed.pathname === "/api/products/page") {
      const isEmpty = query.getAll("categories").includes("missing-category") || options.emptyResults;
      return Response.json({ content: isEmpty ? [] : query.get("page") === "1" ? rawProducts.slice(0, 1) : rawProducts,
        number: Number(query.get("page") ?? 0), totalPages: 2, totalElements: isEmpty ? 0 : 60 });
    }
    throw new Error(`Unexpected fixture path ${parsed.pathname}`);
  };
  const tree = await CatalogPageContent({ searchParams: Promise.resolve(params),
    ...(options.global ? {} : { brandName: "PUMA", ...(options.withOwn ? {brandSlug:"puma"} : {}), basePath: "/brand/puma" }) });
  const client = findClient(tree);
  assert(client, "SSR must preserve the shared CatalogClient");
  return { client, props: client.props, calls, html: renderToStaticMarkup(tree) };
}

function categoryIds(props) {
  return props.categoryGroups.map(group => [group.rootCategory.id, group.categories.map(item => item.id)]);
}

async function main() {
  const originalFetch = global.fetch;
  try {
    const first = await scenario({ brands: "adidas" });
    assert.deepEqual(categoryIds(first.props), [[1, [2]], [10, [11]]], "Brand navigation uses complete facets, including a category absent from the first 48 products");
    assert.equal(first.props.products.length, 48);
    assert(first.props.products.every(product => product.category.includes("Кроссовки")));
    assert.deepEqual(first.props.selectedBrands, ["PUMA"], "URL brands cannot override the brand page lock");
    assert.deepEqual(first.props.collections, ownCollections);
    assert(!first.html.includes("Чужие рубашки") && !first.html.includes("Лоферы") && !first.html.includes(">Дом<"));
    assert(first.html.includes('href="/brand/puma?collection=7"'), "Collection links stay on the brand route");
    assert(!first.html.includes("brands=adidas"));
    const brandQueries = first.calls.filter(call => ["/api/products/page", "/api/catalog/category-facets"].includes(call.url.pathname));
    assert(brandQueries.every(call => call.url.searchParams.getAll("brands").join() === "PUMA"));
    const nextPage = await scenario({ page: "2", audience: "women" });
    assert.deepEqual(categoryIds(nextPage.props), categoryIds(first.props), "Category availability does not come from a single product page");
    assert.equal(nextPage.props.products.length, 1);
    const collectionRequest = nextPage.calls.find(call => call.url.pathname === "/api/storefront/home/collections").url;
    assert.equal(collectionRequest.searchParams.get("brand"), "PUMA");
    assert.equal(collectionRequest.searchParams.get("audience"), "women");
    assert(String(nextPage.client.key).includes("PUMA") && String(nextPage.client.key).includes("women"), "Confirmed client state is scoped by brand and audience");

    const filtered = await scenario({ collection: "7", sizes: "M", minPrice: "999999", q: "не найдено", audience: "women" }, { emptyResults: true });
    assert.deepEqual(categoryIds(filtered.props), categoryIds(first.props), "Brand navigation remains stable when current filters have no results");
    assert.equal(filtered.props.selectedCollectionId, 7);
    assert.deepEqual(filtered.props.mobileAvailableCategories, [], "Drawer availability still follows the full current filter");
    const baseline = filtered.calls.find(call => call.url.pathname === "/api/catalog/category-facets" && !call.url.searchParams.has("collectionId") && !call.url.searchParams.has("q"));
    assert(baseline, "A brand-only baseline facet query is required");
    for (const key of ["categories", "sizes", "minPrice", "maxPrice", "q", "collectionId", "page", "size", "sort"]) {
      assert.equal(baseline.url.searchParams.has(key), false, `Navigation baseline must exclude ${key}`);
    }

    const foreignCategory = await scenario({ category: "missing-category" }, { emptyResults: true });
    assert.deepEqual(foreignCategory.props.selectedCategories, ["missing-category"], "Unavailable direct URL selection remains explicit and removable");
    assert.equal(foreignCategory.props.products.length, 0);
    const selectedProductRequest = foreignCategory.calls.find(call => call.url.pathname === "/api/products/page").url;
    assert.equal(selectedProductRequest.searchParams.get("categories"), "missing-category", "Unknown category never broadens product scope");

    const categoryFailure = await scenario({}, { facetsFailure: true });
    assert.deepEqual(categoryFailure.props.categoryGroups, [], "Facet failure must not expose global category navigation");
    assert(categoryFailure.props.facetsError || categoryFailure.props.categoryError);
    assert(categoryFailure.html.includes("data-request-error"));
    assert(!categoryFailure.html.includes(">Дом<"));
    const collectionFailure = await scenario({}, { collectionsFailure: true });
    assert.deepEqual(collectionFailure.props.collections, []);
    assert.equal(collectionFailure.props.collectionsError, true);
    assert(collectionFailure.html.includes("data-request-error"));
    assert(!collectionFailure.html.includes("Чужие рубашки"));
    const selectedCollectionFailure = await scenario({ collection: "7" }, { collectionsFailure: true });
    assert.equal(selectedCollectionFailure.props.selectedCollectionId, 7, "A failed options request cannot silently remove a selected collection");
    assert.equal(selectedCollectionFailure.props.collectionsError, true);
    assert.equal(selectedCollectionFailure.calls.find(call => call.url.pathname === "/api/products/page").url.searchParams.get("collectionId"), "7");
    const malformedCollections = await scenario({}, { collectionsMalformed: true });
    assert.equal(malformedCollections.props.collectionsError, true);
    assert.deepEqual(malformedCollections.props.collections, [], "Malformed scoped data must not expose a partially accepted global list");
    await assert.rejects(() => scenario({ collection: "8" }), error => error.message === "redirect:/brand/puma",
      "A successful out-of-scope collection selection returns to this brand, never the global catalog");

    const globalCatalog = await scenario({}, { global: true });
    const own = await scenario({brandCollection:"7",audience:"women",page:"2"},{withOwn:true});
    assert.equal(own.props.selectedBrandCollectionId,7);
    assert.equal(own.props.selectedCollectionId,undefined);
    assert(own.html.includes('brandCollection=7') && own.html.includes('collection=7'), "Same numeric IDs keep separate sources");
    const ownProductQuery = own.calls.find(call=>call.url.pathname==="/api/products/page").url.searchParams;
    assert.equal(ownProductQuery.get("brandCollectionId"),"7");
    assert.equal(ownProductQuery.has("collectionId"),false);
    assert.equal(ownProductQuery.get("page"),"1");
    assert.equal(ownProductQuery.get("brands"),"PUMA");
    const ownFailure = await scenario({brandCollection:"7"},{withOwn:true,ownFailure:true});
    assert.equal(ownFailure.props.collectionsError,true);
    assert.equal(ownFailure.props.selectedBrandCollectionId,7,"Unknown response never broadens to all products");
    await assert.rejects(()=>scenario({brandCollection:"99"},{withOwn:true}),/redirect:\/brand\/puma/);
    assert.deepEqual(categoryIds(globalCatalog.props), [[1, [2, 3]], [10, [11, 12]], [20, []]], "Global catalog keeps its category structure");
    assert.deepEqual(globalCatalog.props.collections, allCollections);
    assert.equal(globalCatalog.calls.find(call => call.url.pathname === "/api/storefront/home/collections").url.search, "");
    console.log("PASS: brand category/collection scope, full-assortment facets beyond48/page2, locked brand, scoped links, stable navigation and full drawer facets");
    console.log("PASS: unknown category keeps product scope, brand facet/collection failures never reveal global options, client identity changes with audience, global catalog unchanged");
  } finally { global.fetch = originalFetch; }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
