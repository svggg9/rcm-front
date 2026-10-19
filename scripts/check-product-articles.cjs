/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const assert = require("node:assert/strict");
const ts = require("typescript");
function load(path, imports = {}, navigatorMock = {}) {
  const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const testModule = { exports: {} };
  new Function("module", "exports", "require", "navigator", output)(testModule, testModule.exports, name => {
    if (!(name in imports)) throw new Error(`Unexpected dependency: ${name}`);
    return imports[name];
  }, navigatorMock);
  return testModule.exports;
}
const { productArticle } = load("app/lib/productArticle.ts");
for (const value of ["100000", "104582", "999999"]) assert.equal(productArticle(value), value);
assert.equal(productArticle(" 104582 "), "104582");
for (const value of [null, undefined, "", "dm0905", "p_104582", "010458", "10458", "1000000", "10010011", "104582-extra"]) {
  assert.equal(productArticle(value), null);
}
const { productPath } = load("app/lib/productUrls.ts");
const product = { id: 403, publicId: "dm0905", brand: "Swatch", title: "Watch", article: "104582" };
assert.equal(productPath(product), "/p/dm0905/swatch-watch");
assert.equal(productPath({ ...product, publicId: null }), "/product/403");
async function checkCopy() {
  for (const denied of [false, true]) {
    let copied = null, manual = false, notification = null;
    const imports = {
      react: { useState: () => [false, value => { manual = value; }] },
      "react/jsx-runtime": require("react/jsx-runtime"),
      "../../../components/ui/Button": { Button: "button" },
      "../../../components/ui/Dialog": { Dialog: "dialog" },
      "../../../components/ui/TextInput": { TextInput: "input" },
      "../../../components/ui/toast": { toast: { success: text => { notification = text; } } },
      "../../../lib/productArticle": { productArticle },
      "../ProductPage.module.css": { default: {} },
    };
    const { ProductArticleButton } = load("app/product/[id]/components/ProductArticleButton.tsx", imports,
      { clipboard: { writeText: async value => { if (denied) throw new Error("Denied"); copied = value; } } });
    const element = ProductArticleButton({ article: "104582" });
    element.props.children[0].props.onClick();
    await Promise.resolve();
    assert.equal(copied, denied ? null : "104582");
    assert.equal(manual, denied);
    assert.equal(notification, denied ? null : "Артикул скопирован");
  }
  console.log("Product articles: format, stable URLs, clipboard success and fallback passed");
}
checkCopy().catch(error => { console.error(error); process.exitCode = 1; });
