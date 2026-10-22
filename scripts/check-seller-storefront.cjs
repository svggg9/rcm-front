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
const { SellerBrandPreview } = require("../app/seller/components/SellerBrandPreview.tsx");
const render = initialBrands => renderToStaticMarkup(React.createElement(SellerBrandTab, { initialBrands }));
const html = render([{ id: 1, name: "Мой бренд", slug: "my-brand", description: "Описание", wordmarkUrl: null }]);
assert.match(html, /<h1[^>]*>Магазин<\/h1>/);
assert.match(html, /class="subtitle" title="Мой бренд">Мой бренд<\/div>/);
assert.doesNotMatch(html, /<input\b[^>]*value="Мой бренд"/, "Название бренда остаётся доступным только для чтения");
const withWordmark = render([{ id: 1, name: "Мой бренд", slug: "my-brand", wordmarkUrl: "/brand/wordmark-black.svg" }]);
assert.match(withWordmark, /<h1[^>]*>Магазин<\/h1>/);
assert.doesNotMatch(withWordmark.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/)[0], /<img\b/, "Логотип не подменяет заголовок раздела");
assert.match(withWordmark, /<img\b[^>]*alt="Мой бренд"[^>]*src="\/brand\/wordmark-black.svg"/);
assert.match(html, /href="\/brand\/my-brand"/);
assert.doesNotMatch(html, /data-store-actions|data-editor-actions|Сохранить изменения/, "Панель сохранения появляется только после изменений");
assert.match(html, /data-editor-page/);
assert.doesNotMatch(html, /<dialog\b/, "Магазин открывается обычной страницей");
assert.equal((html.match(/<form\b/g) || []).length, 1);
assert.ok(html.indexOf("</form>") < html.indexOf("Фотографии бренда"));
assert.equal((html.match(/data-ui="settings-section"/g) || []).length, 2);
for (const title of ["О бренде", "Текстовый логотип", "Фотографии бренда"]) {
  assert.match(html, new RegExp(`<h2[^>]*>${title}</h2>`));
}
assert.match(html, /<aside[^>]*aria-label="Профиль на витрине"/);
assert.doesNotMatch(html, /Подборки товаров/, "Подборки открываются в разделе «Товары»");
assert.doesNotMatch(html, /sectionNumber|placeholder="Россия"|placeholder="2024"/);
assert.match(html, /Название меняет администратор площадки/);
assert.match(html, /role="status" aria-label="Загрузка фотографий бренда" aria-busy="true"/);
assert.equal((html.match(/data-ui="section-loader"/g) || []).length, 1);
assert.doesNotMatch(html, />Загрузка фотографий бренда</, "Ожидание доступно для скринридера без видимого текста");
assert.doesNotMatch(html, /class="[^"]*undefined/);
const previewProps = { brandId: 1, name: "Мой бренд", description: "Черновик описания", wordmarkUrl: "", country: "Россия", foundationYear: "2020", onClose() {} };
const preview = renderToStaticMarkup(React.createElement(SellerBrandPreview, previewProps));
assert.match(preview, /<h2[^>]*>Предпросмотр витрины<\/h2>/);
assert.match(preview, /<h1[^>]*>Мой бренд<\/h1>/);
assert.match(preview, /Россия \| Основан в 2020 году/);
assert.match(preview, /<details\b[^>]*open=""/);
assert.match(preview, /role="radiogroup" aria-label="Устройство предпросмотра"/);
assert.doesNotMatch(preview, /Предпросмотр без сохранения/);
const dirtyPreview = renderToStaticMarkup(React.createElement(SellerBrandPreview, { ...previewProps, dirty: true }));
assert.match(dirtyPreview, /Предпросмотр без сохранения/);
assert.doesNotMatch(dirtyPreview, /Внешние ссылки пока|Данные формы показаны/);
const empty = render([]);
assert.match(empty, /<h1[^>]*>Магазин<\/h1>/);
assert.match(empty, /Профиль бренда недоступен/);
assert.match(empty, /Обратитесь в поддержку площадки/);
assert.doesNotMatch(empty, /<form\b/);
assert.equal(renderToStaticMarkup(React.createElement(SellerBrandTab, { initialBrands: [], active: false })), "");
console.log("PASS: store page title/read-only identity, three sections, clean actions, public link, preview identity, accessible loading and empty state; SSR without effects or network");
