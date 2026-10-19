/* eslint-disable @typescript-eslint/no-require-imports -- Standalone API regression checks. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText, filename);
const { uploadSellerBrandImage } = require("../app/seller/lib/sellerBrandApi.ts");
let requests = 0;
let nextResponse = () => Response.json({ id: 1, imageUrl: "/optimized.webp" });
global.fetch = async (_url, options) => {
  requests++;
  assert.equal(options.credentials, "include");
  assert.equal(options.method, "POST");
  assert.ok(options.body instanceof FormData);
  return nextResponse(options);
};
const file = (type, size) => new File([new Uint8Array(size)], "photo", { type });
(async () => {
  await assert.rejects(uploadSellerBrandImage(1, file("image/png", 10)), /JPEG и WebP/);
  await assert.rejects(uploadSellerBrandImage(1, file("image/jpeg", 0)), /непустую/);
  await assert.rejects(uploadSellerBrandImage(1, file("image/webp", 8 * 1024 * 1024 + 1)), /8 МБ/);
  assert.equal(requests, 0, "Invalid selections must be rejected before the network request");
  const original = file("image/jpeg", 8 * 1024 * 1024);
  nextResponse = async options => {
    const uploaded = options.body.get("file");
    assert.equal(uploaded.type, original.type);
    assert.equal(uploaded.size, original.size);
    assert.deepEqual(Buffer.from(await uploaded.arrayBuffer()), Buffer.from(await original.arrayBuffer()));
    return Response.json({ id: 1, imageUrl: "/optimized.webp" });
  };
  assert.equal((await uploadSellerBrandImage(1, original)).imageUrl, "/optimized.webp");
  nextResponse = () => Response.json({ message: "Не удалось прочитать фотографию" }, { status: 400 });
  await assert.rejects(uploadSellerBrandImage(1, file("image/webp", 10)), /^Error: Не удалось прочитать фотографию$/);
  nextResponse = () => Response.json({ detail: "Фотография слишком большая по разрешению" }, { status: 400 });
  await assert.rejects(uploadSellerBrandImage(1, file("image/jpeg", 10)), /слишком большая по разрешению/);
  nextResponse = () => new Response("<html>Proxy failure</html>", { status: 502 });
  await assert.rejects(uploadSellerBrandImage(1, file("image/jpeg", 10)), /^Error: Не удалось загрузить фотографию бренда$/);
  nextResponse = () => new Response("Too large", { status: 413 });
  await assert.rejects(uploadSellerBrandImage(1, file("image/jpeg", 10)), /8 МБ/);
  console.log("PASS: brand photo upload preflight, original multipart, JSON errors and retry-safe fallback");
})().catch(error => { console.error(error); process.exitCode = 1; });
