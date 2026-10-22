/* eslint-disable @typescript-eslint/no-require-imports -- Category contract regression checks without database writes. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
for (const extension of [".ts", ".tsx"]) require.extensions[extension] = (mod, filename) => mod._compile(
  ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText, filename);
require.extensions[".css"] = mod => { mod.exports = new Proxy({}, { get: (_, key) => String(key) }); };
const read = file => require(path.resolve(file));
const category = read("app/lib/categories.ts");
const catalog = read("app/components/Catalog/catalogUtils.ts");
const base = { isActive: true, effectiveActive: true, productCount: 0, subtreeProductCount: 0, aliases: [] };
const data = category.normalizeCategories([
  {...base, id: 1, name: "Одежда", label: "Одежда", parentId: null, slug: "clothes", sortOrder: 20},
  {...base, id: 2, name: "Спорт", label: "Спорт", parentId: null, slug: "sport", sortOrder: 10},
  {...base, id: 3, name: "Одежда / Носки", label: "Носки", parentId: 1, slug: "socks-clothes", sortOrder: 1},
  {...base, id: 4, name: "Спорт / Носки", label: "Носки", parentId: 2, slug: "socks-sport", sortOrder: 1},
]);
assert.deepEqual(category.buildCategoryTree(data).map(item => item.id), [2, 1], "Backend ordering must be respected");
const groups = catalog.groupCatalogCategories(data);
assert.equal(groups.length, 2);
assert.equal(groups.reduce((sum, group) => sum + group.categories.length, 0), 2, "Repeated leaf labels must retain both IDs");
assert.deepEqual(catalog.expandCategorySelection("sport", groups), ["sport"], "Descendant filtering belongs to the server");
assert.deepEqual(catalog.normalizeCategorySelection(["3", "Одежда / Носки"], groups), ["socks-clothes"]);
assert.deepEqual(catalog.normalizeCategorySelection(["unknown"], groups), ["unknown"], "Unknown must never broaden to all products");
const renamed = data.map(item => item.id === 1 ? {...item, name: "Гардероб", label: "Гардероб", aliases: ["одежда"]} :
  item.id === 3 ? {...item, name: "Гардероб / Носки", aliases: ["одежда / носки"]} : item);
assert.equal(category.findCategory(renamed, "Одежда / Носки").slug, "socks-clothes");
assert.equal(catalog.groupCatalogCategories(renamed).length, 2, "Renaming must not create a virtual third parent");
assert.equal(catalog.categorySelectionLabel("socks-clothes", catalog.groupCatalogCategories(renamed)), "Носки");
const totals = category.categoryFacetTotals(data, category.normalizeCategoryFacets([{categoryId: 1, count: 3}, {categoryId: 3, count: 1000}, {categoryId: 4, count: 2}]));
assert.equal(totals.get(1), 1003, "Root totals include direct products and descendants once, regardless of page size");
const mobile = catalog.getMobileCategoryChoices(groups, ["clothes", "socks-clothes"], ["socks-sport"]);
assert.ok(mobile.some(item => item.value === "socks-sport"), "A selected zero-result category stays removable");
assert.ok(mobile.some(item => item.value === "socks-clothes"));
const threeLevels = category.normalizeCategories([...data,
  {...base, id: 5, name: "Одежда / Носки / Высокие", label: "Высокие", parentId: 3, slug: "tall-socks", sortOrder: 1},
]);
assert.equal(category.MAX_CATEGORY_DEPTH, 3);
assert.equal(category.categoryDepth(threeLevels, 5), 3);
assert.deepEqual(category.eligibleCategoryParents(threeLevels).map(item => item.id), [2, 4, 1, 3], "New categories may sit below the second level, never below the third");
assert.deepEqual(category.eligibleCategoryParents(threeLevels, 3).map(item => item.id), [2, 1], "Moving a branch includes its descendants when calculating available depth");
assert.deepEqual(category.eligibleCategoryParents(threeLevels, 1), [], "A full three-level branch can move only to the root");
const threeGroups = catalog.groupCatalogCategories(threeLevels);
const thirdMobile = catalog.getMobileCategoryChoices(threeGroups, [], ["tall-socks"]);
assert.deepEqual(thirdMobile.filter(item => item.value === "clothes" || item.value === "socks-clothes" || item.value === "tall-socks")
  .map(item => [item.value, item.depth, item.parentValue]), [["clothes", 0, null], ["socks-clothes", 1, "clothes"], ["tall-socks", 2, "socks-clothes"]], "A zero-result third level retains the complete path for step-by-step navigation");
assert.deepEqual(catalog.toggleCategorySelection(["socks-clothes"], "tall-socks", threeGroups), ["tall-socks"], "A leaf replaces its broader ancestor selection");
assert.deepEqual(catalog.toggleCategorySelection(["tall-socks"], "socks-clothes", threeGroups), ["socks-clothes"], "Selecting a branch removes redundant descendants");
assert.equal(category.categoryFacetTotals(threeLevels, [{categoryId: 5, count: 7}]).get(1), 7);
assert.throws(() => category.normalizeCategories({content: []}));
assert.throws(() => category.normalizeCategories([...data, data[0]]), /Invalid/);
assert.throws(() => category.normalizeCategories([{...data[0], parentId: 999}]), /hierarchy/);
assert.throws(() => category.normalizeCategories([{...data[0], parentId: 2}, {...data[1], parentId: 1}]), /hierarchy/);
assert.throws(() => category.normalizeCategoryFacets([{categoryId: 1, count: -1}]));

const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { CategoryPicker } = read("app/components/ui/CategoryPicker.tsx");
const markup = renderToStaticMarkup(React.createElement(CategoryPicker, {value: 3, categories: data, onChange() {}}));
assert.ok(markup.includes("Одежда / Носки") && markup.includes("Спорт / Носки"), "Selection must expose both full paths");
const hidden = renderToStaticMarkup(React.createElement(CategoryPicker, {value: 99, currentLabel: "Старая категория", categories: data, onChange() {}}));
assert.ok(hidden.includes('value="Старая категория"'), "Unavailable saved category must not look empty");
assert.ok(hidden.includes("Категория недоступна для новых публикаций"));
assert.ok(renderToStaticMarkup(React.createElement(CategoryPicker, {value: 5, categories: threeLevels, onChange() {}})).includes('value="Одежда / Носки / Высокие"'), "The seller sees the complete three-level path");
console.log("PASS: shared hierarchy/order, distinct leaf IDs, stable aliases, server-side expansion, unknown/invalid responses, aggregate facets and retained unavailable selections");
