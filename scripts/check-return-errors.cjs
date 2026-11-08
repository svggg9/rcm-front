/* eslint-disable @typescript-eslint/no-require-imports -- Offline return transport/outcome regression. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

function load(file, imports = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const result = { exports: {} };
  new Function("module", "exports", "require", code)(result, result.exports, name => {
    assert(name in imports, `Unexpected import ${name}`);
    return imports[name];
  });
  return result.exports;
}

const errors = load("app/lib/apiErrors.ts");
const calls = [];
let next;
const transport = { API_URL: "http://fixture.invalid", apiFetch: async (url, options) => {
  assert.equal(new URL(url).origin, "http://fixture.invalid");
  calls.push({ url, options });
  return next(url, options);
} };
const apiRequest = load("app/lib/apiRequest.ts", { "./api": transport, "./apiErrors": errors });
const api = load("app/lib/returns.ts", {
  "./api": transport, "./apiErrors": errors, "./apiRequest": apiRequest,
  "./returnPhotoUrls": load("app/lib/returnPhotoUrls.ts"),
  "./imageUploadPolicy": load("app/lib/imageUploadPolicy.ts"),
});
const row = { id: 1, orderId: 2, productId: 3, variantId: 4, quantity: 1, reason: "DEFECT",
  status: "REQUESTED", productTitle: "Товар", photoUrls: ["/api/returns/1/photos/5"] };
const page = { content: [row], number: 0, size: 20, totalPages: 1, totalElements: 1, numberOfElements: 1 };
const submission = { orderId: 2, productId: 3, variantId: 4, quantity: 1, reason: "DEFECT", comment: " Черновик ",
  requestKey: "00000000-0000-0000-0000-000000000001", photos: [new File(["fixture"], "photo.png", { type: "image/png" })] };
const inspection = { resellable: false, acceptedRefundAmount: 500, comment: " Проверка " };
const mutations = [
  () => api.reviewAdminReturn(1, "approve", " Комментарий "),
  () => api.markSellerReturnReceived(1),
  () => api.inspectSellerReturn(1, inspection),
  () => api.refundAdminReturn(1, 500),
];
const failures = [
  () => { throw new TypeError("PRIVATE_SERVER_BODY fetch failed"); },
  () => { throw new DOMException("PRIVATE_SERVER_BODY", "TimeoutError"); },
  () => Response.json({ message: "PRIVATE_SERVER_BODY" }, { status: 500 }),
  () => new Response("<html>PRIVATE_SERVER_BODY</html>", { status: 502 }),
  () => Response.json(null),
  () => Response.json({ id: 1, photoUrls: [] }),
  () => ({ ok: true, status: 200, json() { throw new SyntaxError("PRIVATE_SERVER_BODY"); } }),
  () => ({ ok: true, status: 200, json() { throw new DOMException("PRIVATE_SERVER_BODY", "AbortError"); } }),
];
function safe(error) {
  assert(error instanceof Error);
  assert(!error.message.includes("PRIVATE_SERVER_BODY"));
  assert(!error.message.includes("fetch failed"));
  assert(!error.message.includes("<html>"));
  return true;
}

async function main() {
  for (const mutate of mutations) {
    for (const failure of failures) {
      next = failure;
      const before = calls.length;
      await assert.rejects(mutate, error => {
        safe(error);
        assert(error instanceof errors.ApiRequestError);
        assert(error.message.includes("обновите заявку"));
        return true;
      });
      assert.equal(calls.length, before + 1, "A return mutation is never retried automatically");
      assert.equal(calls.at(-1).options.method, "POST");
    }
  }
  assert.deepEqual(inspection, { resellable: false, acceptedRefundAmount: 500, comment: " Проверка " },
    "A failed inspection preserves the original draft");

  next = () => Response.json({ message: "Invalid return status transition" }, { status: 400 });
  await assert.rejects(api.markSellerReturnReceived(1), error => {
    safe(error);
    assert.equal(error.status, 400);
    assert.equal(error.code, "Invalid return status transition");
    assert.equal(error.message, "Статус возврата изменился — обновите заявку");
    return true;
  });
  next = () => Response.json({ message: "Refund amount exceeds the accepted amount" }, { status: 400 });
  await assert.rejects(api.refundAdminReturn(1, 501), error => error.message === "Сумма возврата превышает согласованную сумму");

  for (const failure of failures) {
    next = failure;
    const before = calls.length;
    await assert.rejects(api.createOrderReturn(submission), error => {
      safe(error);
      assert(error instanceof api.ReturnSubmitError);
      assert.equal(error.resultUnknown, true);
      assert(error.message.includes("обновите список возвратов"));
      return true;
    });
    assert.equal(calls.length, before + 1);
    const body = calls.at(-1).options.body;
    assert.equal(body.get("quantity"), "1");
    assert.equal(body.get("requestKey"), submission.requestKey);
    assert.equal(body.get("comment"), "Черновик");
    assert.equal(body.getAll("photos").length, 1);
  }
  assert.equal(submission.comment, " Черновик ");
  assert.equal(submission.photos.length, 1);
  for (const failure of [
    () => Response.json({ message: "Return quantity exceeds remaining quantity" }, { status: 400 }),
    () => new Response("<html>PRIVATE_SERVER_BODY</html>", { status: 409 }),
    () => ({ ok: false, status: 400, json() { throw new DOMException("PRIVATE_SERVER_BODY", "TimeoutError"); } }),
  ]) {
    next = failure;
    await assert.rejects(api.createOrderReturn(submission), error => safe(error) &&
      error instanceof api.ReturnSubmitError && error.resultUnknown === false);
  }
  next = () => Response.json(row);
  const confirmed = await api.createOrderReturn(submission);
  assert.equal(confirmed.id, 1);
  assert.deepEqual(confirmed.photoUrls, ["http://fixture.invalid/api/returns/1/photos/5"]);
  assert.deepEqual(row.photoUrls, ["/api/returns/1/photos/5"]);

  for (const read of [() => api.getOrderReturns(2), () => api.getAdminOrderReturns(2)]) {
    for (const malformed of [null, {}, { content: [] }, [null], [{ ...row, status: "UNKNOWN" }]]) {
      next = () => Response.json(malformed);
      await assert.rejects(read, error => safe(error) && error.kind === "invalid-response");
    }
    next = () => Response.json([], { status: 404 });
    assert.deepEqual(await read(), [], "Only the existing explicit 404 compatibility fallback stays empty");
    next = () => Response.json([]);
    assert.deepEqual(await read(), []);
  }
  for (const read of [() => api.getAccountReturns(), () => api.getSellerReturns()]) {
    for (const malformed of [null, {}, { content: [] }, { ...page, totalPages: 0 }, { ...page, content: [null] }]) {
      next = () => Response.json(malformed);
      await assert.rejects(read, error => safe(error) && error.kind === "invalid-response");
    }
    next = () => Response.json(page);
    assert.equal((await read()).items[0].id, 1);
  }
  next = () => Response.json(null, { status: 404 });
  assert.deepEqual(await api.getAccountReturns(), { items: [], page: 0, totalPages: 0, totalItems: 0 });
  await assert.rejects(api.getSellerReturns(), error => safe(error) && error.status === 404);

  const controller = new AbortController();
  controller.abort();
  const before = calls.length;
  await assert.rejects(api.getSellerReturn(1, controller.signal), error => error.name === "AbortError");
  assert.equal(calls.length, before, "A caller-cancelled GET never reaches transport");
  const bodyController = new AbortController();
  next = () => ({ ok: true, status: 200, json() {
    bodyController.abort();
    throw new DOMException("cancelled", "AbortError");
  } });
  await assert.rejects(api.getSellerReturn(1, bodyController.signal), error => error.name === "AbortError");

  console.log("PASS: returns safe HTTP/transport/payload failures, known rejection vs uncertain submission, unchanged quantity/key/photos");
  console.log("PASS: mutation refresh guidance without replay, strict lists/known 404 fallbacks and caller cancellation");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
