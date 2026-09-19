// Read-only smoke checks: rendering does not run effects or call the API.
/* eslint-disable @typescript-eslint/no-require-imports -- Standalone TSX render checks without another test dependency. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

require.extensions[".css"] = module => {
  module.exports = { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
};
for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (module, filename) => {
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      fileName: filename,
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    });
    module._compile(outputText, filename);
  };
}
global.fetch = () => { throw new Error("Smoke checks must not contact the API"); };
const { SellerBrandTab } = require("../app/seller/components/SellerBrandTab.tsx");
const render = initialBrands => renderToStaticMarkup(React.createElement(SellerBrandTab, { initialBrands }));
const html = render([{ id: 1, name: "Мой бренд", slug: "my-brand", description: "Описание", wordmarkUrl: null }]);
assert.match(html, /<h1>Мой бренд<\/h1>/);
assert.match(html, /href="\/brand\/my-brand"/);
assert.match(html, /<button[^>]*form="seller-brand-profile"/);
assert.doesNotMatch(html.match(/<button[^>]*form="seller-brand-profile"[^>]*>/)[0], /disabled/);
assert.equal((html.match(/<form\b/g) || []).length, 1);
assert.ok(html.indexOf("</form>") < html.indexOf("Фотографии бренда"));
assert.ok(html.indexOf("Фотографии бренда") < html.indexOf("Подборки товаров"));
assert.match(html, /Текстовый логотип/);
assert.doesNotMatch(html, /sectionNumber|placeholder="Россия"|placeholder="2024"/);
assert.match(html, /readonly=""/i);
assert.match(html, /aria-label="Загружаем фотографии"/);
assert.match(html, /aria-label="Загружаем подборки"/);
assert.doesNotMatch(html, /class="[^"]*undefined/);
const empty = render([]);
assert.match(empty, /Профиль бренда недоступен/);
assert.match(empty, /width="32"/);
assert.doesNotMatch(empty, /<form\b/);
console.log("PASS: storefront profile, save action, independent sections, loading, empty state and approved terminology");
