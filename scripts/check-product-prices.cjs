/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const ts = require("typescript");

function load(path, dependencies = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, crypto: require("node:crypto").webcrypto, require: name => {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected dependency: ${name}`);
  } });
  return exports;
}

const utils = load("app/seller/products/[id]/edit/utils.ts");
const jsx = (type, props) => ({ type, props });
const react = { useId: () => "price-test", useState: initial => [initial, () => {}], useCallback: fn => fn };
const fieldValidation = load("app/lib/useFieldValidation.ts", { react });
const { ProductVariantsCard } = load("app/seller/products/[id]/edit/components/ProductVariantsCard.tsx", {
  react,
  "../../../../../lib/useFieldValidation": fieldValidation,
  "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
  "./VariantNumberInput": { VariantNumberInput: "number-input" },
  "../../../../../components/ui/Button": { Button: "button" },
  "../../../../../components/ui/DesignSystemIcon": { DesignSystemIcon: "icon" },
  "../utils": utils,
  "../ProductEditPage.module.css": { default: {} },
});

function flatten(node) {
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (!node || typeof node !== "object") return [];
  return [node, ...flatten(node.props?.children)];
}

function render(variants) {
  const updates = [];
  const added = [];
  const tree = ProductVariantsCard({ variants, validationErrors: {},
    variantStructureDisabled: false, operationalDisabled: false,
    onUpdateVariant: (index, patch) => updates.push({ index, patch }),
    onAddVariant: variant => added.push(variant), onRemoveVariant: () => {},
  });
  return { nodes: flatten(tree), updates, added };
}

const variants = [
  { groupKey: "black", color: "Черный", size: "S", price: 100, availableQuantity: 3 },
  { groupKey: "black", color: "Черный", size: "M", price: 100, availableQuantity: 1 },
  { groupKey: "red", color: "Красный", size: "S", price: 100, availableQuantity: 2 },
];
assert.equal(utils.inconsistentProductPriceIndexes(variants).size, 0);
let result = render(variants);
let prices = result.nodes.filter(n => n.type === "number-input" && n.props["aria-label"] === "Цена товара");
assert.equal(prices.length, 1, "one price input for the product");
prices[0].props.onValue(150);
assert.deepEqual(result.updates.map(u => u.index), [0, 1, 2], "changing product price updates every color and size");
assert.ok(result.updates.every(u => u.patch.price === 150));
result.nodes.find(n => n.type === "button" && Array.isArray(n.props.children) && n.props.children.includes("Добавить оттенок")).props.onClick();
assert.equal(result.added[0].price, 100, "A new shade inherits the common product price");

const mixed = variants.map((v, i) => ({ ...v, price: i === 1 ? 120 : v.price }));
assert.deepEqual([...utils.inconsistentProductPriceIndexes(mixed)], [0, 1, 2]);
const mixedColors = variants.map((v, index) => ({ ...v, price: index === 2 ? 200 : v.price }));
assert.deepEqual([...utils.inconsistentProductPriceIndexes(mixedColors)], [0, 1, 2], "different colors cannot have different prices");
assert.equal(utils.inconsistentProductPriceIndexes([]).size, 0);
result = render(mixed);
prices = result.nodes.filter(n => n.type === "number-input" && n.props["aria-label"] === "Цена товара");
assert.equal(prices[0].props.value, null, "legacy mismatches do not silently choose a price");
assert.equal(prices[0].props["aria-invalid"], true);
assert.equal(result.updates.length, 0, "rendering does not normalize stored prices");
prices[0].props.onValue(180);
assert.ok(result.updates.every(u => u.patch.price === 180));
assert.equal(result.updates.length, 3);
console.log("Product pricing checks passed: one field, all colors/sizes, explicit legacy resolution");

const savedWithoutGroupKey = [{id: 1, colorwayId: 7, color: "Черный", size: "S", price: 100, availableQuantity: 2}];
result = render(savedWithoutGroupKey);
result.nodes.find(n => n.type === "button" && Array.isArray(n.props.children) && n.props.children.includes("Добавить размер")).props.onClick();
assert.equal(result.added.length, 1);
assert.equal(result.added[0].price, 100, "A new size inherits the common product price");
assert.equal(utils.variantColorGroupKey(result.added[0]), utils.variantColorGroupKey(savedWithoutGroupKey[0]), "new size retains saved color grouping");
