/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const assert = require("node:assert/strict");
const ts = require("typescript");

function load(file, imports = {}) {
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const testModule = { exports: {} };
  new Function("require", "module", "exports", output)(name => {
    if (!(name in imports)) throw new Error(`Unexpected dependency: ${name}`);
    return imports[name];
  }, testModule, testModule.exports);
  return testModule.exports;
}

async function main() {
  const limits = load("app/cart/lib/quantityLimits.ts");
  const first = { productId: 1, variantId: 10, quantity: 3, availableQuantity: 10 };
  const second = { productId: 1, variantId: 11, quantity: 2, availableQuantity: 10 };
  const different = { productId: 2, variantId: 12, quantity: 5, availableQuantity: 10 };
  const totals = limits.productQuantities([first, second, different]);
  assert.equal(totals.get(1), 5);
  assert.equal(totals.get(2), 5);
  assert.equal(limits.maxLineQuantity(first, totals.get(1)), 3);
  assert.equal(limits.maxLineQuantity(second, totals.get(1)), 2);
  assert.equal(limits.maxLineQuantity(different, totals.get(2)), 5);
  assert.equal(limits.maxLineQuantity(first, 3, 1), 1);
  assert.equal(limits.maxLineQuantity(first, 3, 0), 0);
  assert.equal(limits.maxLineQuantity({ ...first, quantity: 6 }, 6), 5);

  let response;
  const api = load("app/cart/lib/cartApi.ts", {
    "../../lib/api": { API_URL: "http://localhost", apiFetch: async () => response },
    "./quantityLimits": limits,
  });
  for (const [body, expected, available] of [
    [{ message: "Requested qty 4 exceeds available stock 3" }, "Доступно только 3 шт", 3],
    [{ message: "Requested qty 1 exceeds available stock 0" }, "Товар закончился", 0],
    [{ message: "PRODUCT_QUANTITY_LIMIT" }, "Не больше 5 единиц одного товара", undefined],
    [{ message: "Не больше 5 единиц одного товара" }, "Не больше 5 единиц одного товара", undefined],
    [{ message: "Не больше 5 единиц одного товара по всем размерам и цветам" }, "Не больше 5 единиц одного товара", undefined],
    [{ timestamp: "internal", message: "Database failure", path: "/api/cart" }, "Не удалось изменить количество — попробуйте ещё раз", undefined],
  ]) {
    response = new Response(JSON.stringify(body), { status: 400 });
    await assert.rejects(api.updateQuantity("test", 10, 4), error =>
      error instanceof api.CartActionError && error.message === expected && error.availableQuantity === available);
  }
  response = new Response("<html>internal gateway failure</html>", { status: 502 });
  await assert.rejects(api.removeItem("test", 10), { message: "Не удалось удалить товар — попробуйте ещё раз" });
  response = new Response(JSON.stringify([first]), { status: 200 });
  assert.deepEqual(await api.updateQuantity("test", 10, 3), [first]);
  console.log("Cart quantity limits and safe API errors passed");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
