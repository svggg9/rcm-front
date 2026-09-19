/* eslint-disable @typescript-eslint/no-require-imports -- Isolated rendering, no API writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const filename = path.resolve(__dirname, '../app/seller/components/OrderProductsPreview.tsx');
let expanded = false;
const mod = new Module(filename, module);
mod.filename = filename;
mod.paths = Module._nodeModulePaths(path.dirname(filename));
mod.require = name => {
  if (name === 'react') return { ...React, useState(initial) {
    return typeof initial === 'boolean' ? [expanded, update => { expanded = update(expanded); }] : [initial, () => {}];
  } };
  if (name === 'next/image') return { __esModule: true, default: props => React.createElement('img', props) };
  if (name.endsWith('/Icon')) return { Icon: () => React.createElement('svg') };
  if (name.endsWith('.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
  return require(name);
};
mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, filename);
const preview = mod.exports.OrderProductsPreview;
const order = { id: 1, firstProductTitle: 'Резервное название', firstImageUrl: null };
const items = Array.from({ length: 5 }, (_, index) => ({ productId: index, variantId: index,
  productTitle: `Позиция ${index + 1}`, imageUrl: null, size: 'M', color: 'Синий', quantity: index + 1 }));
let retries = 0;
const props = { order, details: { items }, loading: false, error: false, onRetry: () => retries++ };
let tree = preview(props);
let html = renderToStaticMarkup(tree);
assert.equal((html.match(/<li /g) || []).length, 2);
assert.match(html, /Ещё 3 товара/);
assert.match(html, /2 шт\./);
assert.match(html, /Размер M/);
assert.match(html, /Синий/);
assert.doesNotMatch(html, /Позиция 3/);
const more = tree.props.children.find(child => child?.type === 'button');
more.props.onClick();
html = renderToStaticMarkup(preview(props));
assert.equal((html.match(/<li /g) || []).length, 5);
assert.match(html, /aria-expanded="true"/);
assert.match(html, /Свернуть товары/);
more.props.onClick();
assert.equal((renderToStaticMarkup(preview(props)).match(/<li /g) || []).length, 2);
html = renderToStaticMarkup(preview({ ...props, details: null, loading: true }));
assert.match(html, /Резервное название/);
assert.doesNotMatch(html, /шт\./, 'Unknown quantities must not be invented');
tree = preview({ ...props, details: null, error: true });
const error = tree.props.children.find(child => child?.props?.role === 'status');
error.props.children.find(child => child?.type === 'button').props.onClick();
assert.equal(retries, 1);
html = renderToStaticMarkup(preview({ ...props, details: { items: [] } }));
assert.match(html, /Состав заказа недоступен/);
assert.doesNotMatch(html, /Резервное название/);
console.log('Order preview: two-item limit, expand/collapse, variants, quantities, loading fallback, retry and empty state passed');
