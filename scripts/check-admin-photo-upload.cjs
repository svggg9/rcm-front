/* eslint-disable @typescript-eslint/no-require-imports -- Isolated admin upload regression; fetch is always mocked. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText, filename);
const { uploadAdminStorefrontHero } = require("../app/admin/lib/adminApi.ts");
const { ApiRequestError } = require("../app/lib/apiErrors.ts");
const limit = 10 * 1024 * 1024;
const file = (type, size) => new File([new Uint8Array(size)], "selected-file", { type });
let calls = 0;
let respond = () => Response.json({ heroImageUrl: "/hero.webp", collections: [] });
global.fetch = async (url, options) => {
  calls++;
  assert.equal(new URL(url).pathname, "/api/admin/storefront/home/hero-image");
  assert.equal(options.method, "POST");
  assert.equal(options.credentials, "include");
  assert.ok(options.body instanceof FormData);
  return respond(options);
};
async function rejectPhoto(photo, message) {
  await assert.rejects(() => uploadAdminStorefrontHero(photo), error => {
    assert.equal(error.message, message);
    return true;
  });
}
async function responseError(response, expected, status) {
  respond = () => response;
  await assert.rejects(() => uploadAdminStorefrontHero(file("image/png", 1)), error => {
    assert.ok(error instanceof ApiRequestError);
    assert.equal(error.message, expected);
    assert.equal(error.status, status);
    assert.equal(error.kind, "http");
    return true;
  });
}
async function main() {
  for (const invalid of [
    [file("image/png", 0), "Выберите непустую фотографию"],
    [file("image/jpeg", limit + 1), "Фото должно быть не больше 10 МБ"],
    [file("image/gif", 1), "Разрешены только JPEG, PNG и WebP"],
  ]) await rejectPhoto(...invalid);
  assert.equal(calls, 0, "Invalid metadata must not reach the network");
  for (const type of ["image/jpeg", "image/png", "image/webp"]) {
    const original = file(type, limit);
    respond = async options => {
      const uploaded = options.body.get("file");
      assert.equal(uploaded.type, type);
      assert.equal(uploaded.size, limit);
      assert.deepEqual(Buffer.from(await uploaded.arrayBuffer()), Buffer.from(await original.arrayBuffer()));
      return Response.json({ heroImageUrl: "/hero.webp", heroPositionX: 35, heroPositionY: 60, collections: [] });
    };
    assert.deepEqual(await uploadAdminStorefrontHero(original), { heroImageUrl: "/hero.webp", updatedAt: null, heroPositionX: 35, heroPositionY: 60, collections: [] });
  }
  for (const response of [
    Response.json({ timestamp: "private", code: "PAYLOAD_TOO_LARGE", message: "private SQL details", path: "/private" }, { status: 413 }),
    new Response("<html>private proxy failure</html>", { status: 413 }),
  ]) await responseError(response, "Фото должно быть не больше 10 МБ", 413);
  const known = [
    [400, "Фото должно быть не больше 48 мегапикселей и 16384 пикселей по стороне", "Фото должно быть не больше 48 мегапикселей и 16384 пикселей по стороне"],
    [400, "Выберите статичную фотографию без анимации", "Выберите статичную фотографию без анимации"],
    [400, "Не удалось прочитать фото или его содержимое не соответствует JPEG/PNG/WebP", "Не удалось прочитать фото — выберите JPEG, PNG или WebP"],
    [503, "Другая фотография ещё обрабатывается, повторите загрузку", "Другая фотография ещё обрабатывается — повторите загрузку"],
    [503, "Обработка фотографий временно недоступна", "Обработка фотографий временно недоступна — попробуйте ещё раз"],
  ];
  for (const [status, message, expected] of known) await responseError(Response.json({ message, detail: "private" }, { status }), expected, status);
  await responseError(new Response("<html>private queue details</html>", { status: 503 }), "Обработка фотографий временно недоступна — попробуйте ещё раз", 503);
  await responseError(Response.json({ message: "<script>private untrusted message</script>" }, { status: 400 }), "Не удалось загрузить изображение витрины", 400);
  await responseError(new Response("<html>private upstream failure</html>", { status: 502 }), "Не удалось загрузить изображение витрины", 502);
  console.log("PASS: admin hero JPEG/PNG/WebP exact 10 MiB original multipart, local empty/type/+1 rejection without network, safe 413 JSON/HTML, known pixel/animation/corruption/busy mappings and no raw server responses");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
