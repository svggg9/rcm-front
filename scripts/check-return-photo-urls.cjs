/* eslint-disable @typescript-eslint/no-require-imports -- Offline API/component regression checks. */
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

const api = "http://localhost:9696";
const protectedPath = "/api/returns/60/photos/71";
const protectedUrl = `${api}${protectedPath}`;
const legacyUrl = "https://storage.yandexcloud.net/rcm/returns/60/photo%20one.webp";
const request = { id: 60, orderId: 10, productId: 1, variantId: 1, productTitle: "Товар", quantity: 1,
  reason: "DEFECT", status: "CLOSED", photoUrls: [protectedPath, legacyUrl],
  requestedAmount: 500, approvedRefundAmount: 500, createdAt: "2026-10-06T10:00:00Z" };

const originalLoad = Module._load;
let stateIndex = 0;
let renderedRequest;
const images = [];
Module._load = function(name, ...args) {
  if (name === "./api") return { API_URL: api, apiFetch: async (url, options = {}) => ({ ok: true, status: 200,
    json: async () => !options.method && url.endsWith("/returns") ? [request] : request }) };
  if (name === "react" && renderedRequest) return { ...React,
    useState: initial => {
      const index = stateIndex++;
      return [index === 1 ? renderedRequest : index === 3 ? false : initial, () => {}];
    },
    useEffect: () => {}, useRef: initial => ({ current: initial }) };
  if (name === "next/navigation") return { useRouter: () => ({ push() {}, back() {} }) };
  if (name === "next/image") return props => { images.push(props); return React.createElement("img", { src: props.src, alt: props.alt }); };
  if (name.endsWith("/EditorSurface")) return { EditorSurface: ({ children }) => children };
  if (name.endsWith("/Button")) return { Button: ({ children }) => React.createElement("button", null, children) };
  if (name.endsWith("/CabinetSkeleton")) return { CabinetSkeleton: () => null };
  if (name.endsWith("/StatusBadge")) return { StatusBadge: ({ children }) => React.createElement("span", null, children) };
  if (name === "./OrderDetailsPanel") return { OrderDetailsPanel: () => null };
  if (name === "./ReturnInspectionForm") return { ReturnInspectionForm: () => null };
  return originalLoad.call(this, name, ...args);
};

(async () => {
  try {
    const { resolveReturnPhotoUrl } = require("../app/lib/returnPhotoUrls.ts");
    assert.equal(resolveReturnPhotoUrl(protectedPath, api), protectedUrl);
    assert.equal(resolveReturnPhotoUrl(protectedPath, `${api}/`), protectedUrl);
    assert.equal(resolveReturnPhotoUrl(protectedPath, "https://test.rcmarket.io"), `https://test.rcmarket.io${protectedPath}`);
    assert.equal(resolveReturnPhotoUrl(protectedPath, ""), protectedPath);
    assert.equal(resolveReturnPhotoUrl(protectedUrl, api), protectedUrl);
    assert.equal(resolveReturnPhotoUrl(legacyUrl, api), legacyUrl);
    for (const value of [
      `https://foreign.invalid${protectedPath}`, `//foreign.invalid${protectedPath}`,
      `https://foreign.invalid/%61pi/returns/60/photos/71`,
      `${api}/api/returns/60/photos/%37%31`, `${protectedPath}?redirect=https://foreign.invalid`,
      `${protectedUrl}?anything=1`, `${protectedUrl}#fragment`, `${api.replace("9696", "3000")}${protectedPath}`,
      `${api}/api/returns/0/photos/71`, `https://user:password@localhost:9696${protectedPath}`,
      "javascript:alert(1)", "data:image/svg+xml,anything", "/api/returns/60/photos/../71",
    ]) assert.equal(resolveReturnPhotoUrl(value, api), null, value);

    const returns = require("../app/lib/returns.ts");
    const expected = [protectedUrl, legacyUrl];
    const responses = [
      await returns.getSellerReturn(60), ...(await returns.getOrderReturns(10)),
      ...(await returns.getAdminOrderReturns(10)),
      await returns.createOrderReturn({ orderId: 10, productId: 1, variantId: 1, reason: "DEFECT", comment: "", photos: [] }),
      await returns.reviewAdminReturn(60, "approve"), await returns.markSellerReturnReceived(60),
      await returns.inspectSellerReturn(60, { resellable: false, acceptedRefundAmount: 500, comment: "" }),
      await returns.refundAdminReturn(60, 500),
    ];
    for (const response of responses) assert.deepEqual(response.photoUrls, expected);
    assert.deepEqual(request.photoUrls, [protectedPath, legacyUrl], "API payload must not be mutated");

    renderedRequest = responses[0];
    const { SellerEntityPage } = require("../app/seller/components/SellerEntityPage.tsx");
    const html = renderToStaticMarkup(SellerEntityPage({ id: 60, kind: "returns" }));
    assert.equal(images.length, 2);
    for (const image of images) assert.equal(image.unoptimized, true, "Private photos must bypass the public Next optimizer");
    assert.match(html, /href="http:\/\/localhost:9696\/api\/returns\/60\/photos\/71"/);
    assert.doesNotMatch(html, /_next\/image/);
    console.log("Return photos: API origin, protected URL filtering, all response consumers, legacy URLs and unoptimized seller rendering passed.");
  } finally {
    Module._load = originalLoad;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
