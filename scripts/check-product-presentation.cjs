/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
function load(path) {
  const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const testModule = { exports: {} };
  new Function("module", "exports", output)(testModule, testModule.exports);
  return testModule.exports;
}
const { sortProductSizes, resolveProductColorway, productColorVariants, productSummary, compactProductMedia } = load("app/lib/productPresentation.ts");
const sort = values => sortProductSizes(values.map((size, id) => ({ size, id }))).map(item => item.size);
assert.deepEqual(sort(["S", "L", "M", "XS", "2XL"]), ["XS", "S", "M", "L", "2XL"]);
assert.deepEqual(sort(["40", "38,5", "38.25", "39", "38"]), ["38", "38.25", "38,5", "39", "40"]);
assert.deepEqual(sort(["42-44 RU", "38-40 RU", "40-42 RU"]), ["38-40 RU", "40-42 RU", "42-44 RU"]);
assert.deepEqual(sort(["40 EU", "8 US", "38 EU"]), ["40 EU", "8 US", "38 EU"]);
assert.deepEqual(sort(["S", "42", "ONE SIZE"]), ["S", "42", "ONE SIZE"]);
const original = [{ id: 1, size: "L" }, { id: 2, size: "S" }];
sortProductSizes(original); assert.equal(original[0].id, 1);
const colors = [{ id: 1 }, { id: 2, isDefault: true }];
assert.equal(resolveProductColorway(colors, "1").id, 1);
for (const bad of [null, "-1", "0", "1.5", "001", "999", "<script>"]) assert.equal(resolveProductColorway(colors, bad).id, 2);
assert.equal(resolveProductColorway([], "1"), null);
const variants = [{ id: 1, colorwayId: 1 }, { id: 2, colorwayId: 1 }, { id: 3, colorwayId: 2 }];
assert.deepEqual(productColorVariants(variants, 2).map(item => item.id), [3]);
assert.deepEqual(productColorVariants(variants, 3), [], "A color without variants must not offer a different color");
assert.equal(productColorVariants(variants, null), variants);
const { productPath, productColorPath } = load("app/lib/productUrls.ts");
const product = { id: 5, publicId: "dm0901", title: "Бейсболка", brand: "Zegna" };
assert.equal(productColorPath(product, 530), productPath(product) + "?color=530");
for (const invalid of [null, -1, 0, 1.5, NaN]) assert.equal(productColorPath(product, invalid), productPath(product));
assert.equal(productColorPath({ id: 5 }, 2), "/product/5?color=2");
const { getBuyerMobilePage } = load("app/lib/buyerNavigation.ts");
const brandBack = returnTo => getBuyerMobilePage("/brand/zegna", new URLSearchParams({ returnTo })).backHref;
assert.equal(brandBack("/p/dm0901/zegna-cap?color=531"), "/p/dm0901/zegna-cap?color=531");
assert.equal(brandBack("/product/403?color=531"), "/product/403?color=531");
for (const invalid of ["https://example.com", "//example.com", "/cart", "/p/x/y?next=https://example.com", "/p/x/y?color=-1", "/p/x/y\\evil"]) assert.equal(brandBack(invalid), "/catalog");
assert.deepEqual(productSummary("Короткое описание"), { text: "Короткое описание", hasMore: false });
assert.deepEqual(productSummary("Введение\n\nПолный текст"), { text: "Введение", hasMore: true });
assert.deepEqual(productSummary("▪ Первый пункт\n▪ Второй пункт"), { text: "", hasMore: true });
assert.ok(productSummary("Слово ".repeat(80)).text.length <= 221);
assert.ok(compactProductMedia("Аксессуары / Часы"));
assert.equal(compactProductMedia("Одежда / Платья"), false);

const { whiteImageBounds, imageFrameTransform } = load("app/lib/productImageFrame.ts");
function image(rect) {
  const pixels = new Uint8ClampedArray(100 * 100 * 4).fill(255);
  if (rect) for (let y = rect[1]; y < rect[3]; y++) for (let x = rect[0]; x < rect[2]; x++) {
    const at = (y * 100 + x) * 4;
    pixels[at] = pixels[at + 1] = pixels[at + 2] = 90;
  }
  return pixels;
}
assert.equal(whiteImageBounds(image(), 100, 100), null);
assert.equal(whiteImageBounds(image([40, 40, 50, 50]), 100, 100), null, "Isolated logo on white must not define a crop");
assert.equal(whiteImageBounds(image([35, 30, 65, 45]), 100, 100), null, "Larger isolated print must not crop a white garment");
const whiteProduct = image([20, 15, 80, 90]);
for (let i = 0; i < whiteProduct.length; i += 4) if (whiteProduct[i] === 90) whiteProduct[i] = whiteProduct[i + 1] = whiteProduct[i + 2] = 246;
assert.ok(whiteImageBounds(whiteProduct, 100, 100)?.height > 0.75, "Retain faint edges of a white product");
assert.equal(whiteImageBounds(image([0, 10, 70, 80]), 100, 100), null, "Lifestyle/detail touching the edge keeps its composition");
const bounds = whiteImageBounds(image([10, 75, 90, 85]), 100, 100);
assert.ok(bounds.y < 0.75 && bounds.y + bounds.height > 0.85, "Include full object with breathing room");
const transform = imageFrameTransform(bounds, 100, 100, 400, 400);
const [, x, y, scale] = transform.match(/translate\(([-.\d]+)px, ([-.\d]+)px\) scale\(([-.\d]+)\)/).map(Number);
assert.ok(y < 0 && scale > 0 && scale <= 2);
const cx = 200 + ((bounds.x + bounds.width / 2) * 100 - 50) * 4 * scale + x;
const cy = 200 + ((bounds.y + bounds.height / 2) * 100 - 50) * 4 * scale + y;
assert.ok(Math.abs(cx - 200) < 0.1 && Math.abs(cy - 200) < 0.1);
assert.equal(imageFrameTransform(bounds, 0, 100, 400, 400), "none");
function checkPurchaseSelection() {
  const output = ts.transpileModule(fs.readFileSync("app/product/[id]/components/ProductVariantSelect.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const imports = {
    react: { useEffect() {}, useId: () => "sizes", useRef: () => ({ current: null }), useState: () => [true, () => {}] },
    "react/jsx-runtime": require("react/jsx-runtime"),
    "../../../components/ui/Button": { Button: "button" },
    "../../../components/ui/SizeOptions": { SizeOptions: "sizes" },
    "./ProductVariantSelect.module.css": { default: {} },
  };
  const testModule = { exports: {} };
  new Function("module", "exports", "require", output)(testModule, testModule.exports, name => imports[name]);
  let added = null, selected = null;
  const options = [{ id: 40, size: "S", availableQuantity: 1 }, { id: 41, size: "M", availableQuantity: 2 }];
  const render = variants => testModule.exports.ProductVariantSelect({ variants, selectedVariantId: null, onChange: id => { selected = id; }, onAdd: id => { added = id; } });
  render(options).props.children[1].props.children.props.onChange(41);
  assert.equal(selected, 41); assert.equal(added, 41, "Add the chosen variant, without waiting for React state");
  const single = render([{ id: 55, size: "", availableQuantity: 1 }]);
  assert.equal(single.props.children[0].props["aria-expanded"], undefined, "Sizeless purchase is not a menu");
  single.props.children[0].props.onClick(); assert.equal(added, 55);
  assert.equal(render([{ id: 56, size: "M", availableQuantity: 0 }]).props.children[0].props.disabled, true);
  assert.equal(render([]).props.children[0].props.disabled, true);
}
checkPurchaseSelection();
async function checkSharing() {
  for (const scenario of ["clipboard", "native", "manual", "cancel"]) {
    let copied = null, shared = null, manual = null;
    const imports = {
      react: { useRef: () => ({ current: false }), useState: () => [null, value => { manual = value; }] },
      "react/jsx-runtime": require("react/jsx-runtime"),
      "../../../components/ui/Button": { Button: "button" },
      "../../../components/ui/Dialog": { Dialog: "dialog" },
      "../../../components/ui/toast": { toast: { success() {} } },
      "../../../lib/productUrls": { productColorPath },
      "../ProductPage.module.css": { default: {} },
    };
    const navigator = {
      clipboard: { writeText: async url => { if (scenario === "manual") throw Error("denied"); copied = url; } },
      ...(scenario !== "clipboard" ? { share: async payload => {
        if (scenario === "cancel") throw new DOMException("cancel", "AbortError");
        if (scenario === "manual") throw Error("unsupported");
        shared = payload.url;
      } } : {}),
    };
    const output = ts.transpileModule(fs.readFileSync("app/product/[id]/components/ProductShareButton.tsx", "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const testModule = { exports: {} };
    new Function("module", "exports", "require", "navigator", "window", output)(testModule, testModule.exports, name => {
      assert.ok(name in imports, `Unexpected import ${name}`); return imports[name];
    }, navigator, { location: { origin: "https://rcmarket.test" } });
    await testModule.exports.ProductShareButton({ product, colorwayId: 531 }).props.children[0].props.onClick();
    const expected = `https://rcmarket.test${productColorPath(product, 531)}`;
    assert.equal(copied, scenario === "clipboard" ? expected : null);
    assert.equal(shared, scenario === "native" ? expected : null);
    assert.equal(manual, scenario === "manual" ? expected : null);
  }
}
checkSharing().then(() => console.log("Product presentation: size systems, color URLs/brand return, share/cancel/fallback, summaries and conservative image framing passed"))
  .catch(error => { console.error(error); process.exitCode = 1; });
