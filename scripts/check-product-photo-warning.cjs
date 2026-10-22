/* eslint-disable @typescript-eslint/no-require-imports -- Standalone component regression runner. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
}
require.extensions[".css"] = module => {
  module.exports = { __esModule: true, default: new Proxy({}, { get: (_, name) => String(name) }) };
};
const originalLoad = Module._load;
Module._load = function(request, ...args) {
  if (request === "next/image") return ({ src, alt }) => React.createElement("img", { src, alt });
  return originalLoad.call(this, request, ...args);
};
try {
  const { ProductPhotoEditor } = require("../app/seller/products/[id]/edit/components/ProductPhotoEditor.tsx");
  const noOp = () => {};
  const base = { uploading: false, reordering: false, mediaDisabled: false, dragImageId: null,
    uploadProgress: {done: 0, total: 0}, onFilesChange: noOp, onUploadImages: noOp,
    onDragImageStart: noOp, onDragImageEnd: noOp, onMoveImage: noOp, onDeleteImage: noOp, onMoveImageByIndex: noOp };
  const images = [1,2,3].map(id => ({id, url: `https://example.invalid/${id}.webp`, sortOrder: id-1, width: 1200, height: 1600}));
  images[0].width = 600; images[0].height = 866;
  const render = (photos, invalidImages=false) => renderToStaticMarkup(React.createElement(ProductPhotoEditor, {...base, images: photos, invalidImages}));
  const saved = JSON.parse(JSON.stringify(images));
  const html = render(saved);
  assert.match(html, /role="status"/);
  assert.match(html, /Фото с низким разрешением/);
  assert.match(html.replace(/<[^>]*>/g, ""), /600 × 866/);
  assert.doesNotMatch(html, /class="fieldError"/); // Warning does not make the draft invalid.
  assert.doesNotMatch(render(saved, true), /class="fieldError"/); // Small dimensions never block moderation.
  assert.match(render(saved.slice(0, 2), true), /class="fieldError"/); // Count still blocks moderation.
  assert.match(html, /до 10 МБ/);
  assert.doesNotMatch(html, /Перед модерацией замените|от 1200 px/);
  saved[0].width = 1200; saved[0].height = 1600;
  assert.doesNotMatch(render(saved), /Фото с низким разрешением/);
  assert.doesNotMatch(render([{id: 1, url: "https://example.invalid/legacy.webp", sortOrder: 0}]), /Фото с низким разрешением/);
  console.log("PASS: low-resolution warning survives reload without blocking publication, count error stays inline, replacement clears warning");
} finally {
  Module._load = originalLoad;
}
