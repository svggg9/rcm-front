/* eslint-disable @typescript-eslint/no-require-imports -- Isolated API contract checks; fetch is always mocked. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  fileName: filename,
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText, filename);

const api = require("../app/seller/lib/sellerBrandApi.ts");
const { ApiRequestError } = require("../app/lib/apiErrors.ts");
const brand = { id: 17, name: "Тестовый бренд", slug: "test", description: "Описание", country: "Россия", foundationYear: 2020,
  logoUrl: "/logo.webp", wordmarkUrl: "/wordmark.svg", website: "https://example.test", telegram: "@example", vk: "example" };
const image = { id: 29, imageUrl: "/photo.webp", active: true, sortOrder: 0 };
const payload = { ...brand };
delete payload.id;
delete payload.slug;
const file = (type, size = 10) => new File([new Uint8Array(size)], "selected-file", { type });
const photo = file("image/jpeg");
const wordmark = file("image/svg+xml");
const operations = [
  { path: "", method: "GET", run: () => api.getSellerBrands(), data: [brand], fallback: "Не удалось загрузить бренды" },
  { path: "/17", method: "PATCH", run: () => api.updateSellerBrandProfile(17, payload), data: brand, fallback: "Не удалось сохранить данные магазина" },
  { path: "/17/wordmark", method: "POST", run: () => api.uploadSellerBrandWordmark(17, wordmark), data: brand, fallback: "Не удалось загрузить текстовый логотип" },
  { path: "/17/images", method: "GET", run: () => api.getSellerBrandImages(17), data: [image], fallback: "Не удалось загрузить фотографии бренда" },
  { path: "/17/images", method: "POST", run: () => api.uploadSellerBrandImage(17, photo), data: image, fallback: "Не удалось загрузить фотографию бренда" },
  { path: "/17/images/29", method: "DELETE", run: () => api.deleteSellerBrandImage(17, 29), data: undefined, fallback: "Не удалось удалить фотографию бренда" },
  { path: "/17/images/order", method: "PUT", run: () => api.reorderSellerBrandImages(17, [29, 30]), data: undefined, fallback: "Не удалось изменить порядок фотографий" },
];
let respond;
const requests = [];
global.fetch = async (url, options) => {
  requests.push({ path: new URL(url).pathname, options });
  if (!respond) throw new Error("A mock response must be configured");
  return respond();
};

async function rejected(run, message, kind, status) {
  await assert.rejects(run, error => {
    assert.ok(error instanceof ApiRequestError);
    assert.equal(error.message, message);
    assert.equal(error.kind, kind);
    if (status !== undefined) assert.equal(error.status, status);
    return true;
  });
}

async function main() {
  for (const operation of operations) {
    respond = () => operation.data === undefined ? new Response(null, { status: 204 }) : Response.json(operation.data);
    assert.deepEqual(await operation.run(), operation.data);
    const request = requests.at(-1);
    assert.equal(request.path, "/api/seller/brands" + operation.path);
    assert.equal(request.options.method ?? "GET", operation.method);
    assert.equal(request.options.credentials, "include");
    if (operation.method === "PATCH") assert.deepEqual(JSON.parse(request.options.body), payload, "Hidden profile values must be retained");
    if (operation.method === "PUT") assert.deepEqual(JSON.parse(request.options.body), { imageIds: [29, 30] });
    if (operation.method === "POST") {
      assert.ok(request.options.body instanceof FormData);
      const selected = operation.path.endsWith("wordmark") ? wordmark : photo;
      const uploaded = request.options.body.get("file");
      assert.equal(uploaded.type, selected.type);
      assert.equal(uploaded.size, selected.size);
      assert.deepEqual(Buffer.from(await uploaded.arrayBuffer()), Buffer.from(await selected.arrayBuffer()));
    }

    const failures = [
      [() => Response.json({ code: "BAD_REQUEST", message: "private SQL/JSON details", path: "/internal/private" }, { status: 400 }), operation.fallback, "http", 400],
      [() => new Response("<html>private proxy failure</html>", { status: 502 }), operation.fallback, "http", 502],
      [() => Response.json({ message: "Unauthorized" }, { status: 401 }), "Войдите в аккаунт ещё раз", "http", 401],
      [() => new Response("rate limited", { status: 429 }), "Слишком много запросов — попробуйте позже", "http", 429],
      [() => { throw new TypeError("Failed to fetch internal-host.example"); }, operation.fallback, "network", 0],
      [() => { throw new DOMException("private timeout", "TimeoutError"); }, "Сервер не ответил — попробуйте ещё раз", "timeout", 0],
    ];
    for (const [response, message, kind, status] of failures) {
      const before = requests.length;
      respond = response;
      await rejected(operation.run, message, kind, status);
      assert.equal(requests.length, before + 1, "Failures must not automatically repeat requests");
    }
    if (operation.data !== undefined) {
      respond = () => new Response("<html>unexpected successful response</html>", { status: 200 });
      await rejected(operation.run, operation.fallback, "invalid-response", 200);
      respond = () => Response.json({ unexpected: "shape" });
      await rejected(operation.run, operation.fallback, "invalid-response", 200);
    }
    const cancelled = new DOMException("Operation cancelled", "AbortError");
    respond = () => { throw cancelled; };
    await assert.rejects(operation.run, error => error === cancelled, "Cancellation must remain cancellation");
  }

  let before = requests.length;
  const invalidWordmarks = [
    [file("image/png"), "Разрешены только SVG и WebP"],
    [file("image/webp", 0), "Выберите непустой текстовый логотип"],
    [file("image/svg+xml", 2 * 1024 * 1024 + 1), "Текстовый логотип должен быть не больше 2 МБ"],
  ];
  for (const [selected, message] of invalidWordmarks) {
    await assert.rejects(api.uploadSellerBrandWordmark(17, selected), error => error instanceof api.SellerBrandFileError && error.message === message);
  }
  assert.equal(requests.length, before, "Invalid wordmarks must not reach the server");
  const invalidPhotos = [
    [file("image/gif"), "Разрешены только JPEG, PNG и WebP"],
    [file("image/jpeg", 0), "Выберите непустую фотографию"],
    [file("image/webp", 10 * 1024 * 1024 + 1), "Фото должно быть не больше 10 МБ"],
  ];
  for (const [selected, message] of invalidPhotos) {
    await assert.rejects(api.uploadSellerBrandImage(17, selected), error => error instanceof api.SellerBrandFileError && error.message === message);
  }
  assert.equal(requests.length, before, "Invalid photos must not reach the server");

  respond = () => Response.json(image);
  for (const type of ["image/jpeg", "image/png", "image/webp"]) {
    await api.uploadSellerBrandImage(17, file(type, 10 * 1024 * 1024));
    const uploaded = requests.at(-1).options.body.get("file");
    assert.equal(uploaded.size, 10 * 1024 * 1024, "The exact 10 MiB photo limit remains accepted");
    assert.equal(uploaded.type, type);
  }

  respond = () => Response.json(brand);
  await api.uploadSellerBrandWordmark(17, file("image/webp", 2 * 1024 * 1024));
  assert.equal(requests.at(-1).options.body.get("file").size, 2 * 1024 * 1024, "The exact 2 MiB limit remains accepted");
  respond = () => Response.json({ code: "BAD_REQUEST", message: "SVG scripts are not allowed" }, { status: 400 });
  await rejected(() => api.uploadSellerBrandWordmark(17, wordmark), "Выберите статичный SVG без скриптов и внешних ресурсов", "http", 400);
  respond = () => new Response("private multipart rejection", { status: 413 });
  await rejected(() => api.uploadSellerBrandWordmark(17, wordmark), "Текстовый логотип должен быть не больше 2 МБ", "http", 413);
  await rejected(() => api.uploadSellerBrandImage(17, photo), "Фото должно быть не больше 10 МБ", "http", 413);
  respond = () => Response.json({ code: "CONFLICT", message: "A brand can have at most 8 active images" }, { status: 409 });
  await rejected(() => api.uploadSellerBrandImage(17, photo), "Можно добавить не больше 8 фотографий", "http", 409);
  respond = () => Response.json({ code: "BAD_REQUEST", message: "Фото должно быть не больше 48 мегапикселей и 16384 пикселей по стороне" }, { status: 400 });
  await rejected(() => api.uploadSellerBrandImage(17, photo), "Фото должно быть не больше 48 мегапикселей и 16384 пикселей по стороне", "http", 400);
  respond = () => Response.json({ code: "BAD_REQUEST", message: "<script>private response</script>", detail: "private database details" }, { status: 400 });
  await rejected(() => api.uploadSellerBrandImage(17, photo), "Не удалось загрузить фотографию бренда", "http", 400);
  before = requests.length;
  respond = () => Response.json([null]);
  await rejected(() => api.getSellerBrandImages(17), "Не удалось загрузить фотографии бренда", "invalid-response", 200);
  assert.equal(requests.length, before + 1);
  console.log("PASS: 7 store API operations, paths/methods/payloads/multipart, safe HTTP/network/timeout/invalid-response errors, cancellation, local file limits and confirmed media mappings; no real network");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
