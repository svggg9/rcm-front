/* eslint-disable @typescript-eslint/no-require-imports -- Pure metadata checks run without a browser or network. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText, filename);

const policy = require("../app/lib/imageUploadPolicy.ts");
assert.equal(policy.MAX_IMAGE_UPLOAD_BYTES, 10 * 1024 * 1024);
assert.equal(policy.MAX_IMAGE_PIXELS, 48_000_000);
assert.equal(policy.MAX_IMAGE_EDGE, 16384);
for (const type of ["image/jpeg", "image/png", "image/webp"]) {
  for (const size of [1, policy.MAX_IMAGE_UPLOAD_BYTES]) {
    assert.equal(policy.getImageUploadMetadataError({ type, size }), null);
  }
  assert.match(policy.getImageUploadMetadataError({ type, size: policy.MAX_IMAGE_UPLOAD_BYTES + 1 }), /10 МБ/);
  for (const size of [0, -1, NaN, Infinity, 0.5]) {
    assert.match(policy.getImageUploadMetadataError({ type, size }), /непустую/);
  }
}
for (const type of ["image/svg+xml", "image/gif", "image/avif", "image/heic", "", "application/octet-stream"]) {
  assert.match(policy.getImageUploadMetadataError({ type, size: 1 }), /JPEG, PNG и WebP/);
}
const wordmarkOptions = {
  maxBytes: policy.MAX_WORDMARK_UPLOAD_BYTES,
  allowedMimeTypes: policy.WORDMARK_MIME_TYPES,
  sizeMessage: "Текстовый логотип должен быть не больше 2 МБ",
};
for (const type of ["image/svg+xml", "image/webp"]) {
  assert.equal(policy.getImageUploadMetadataError({ type, size: 2 * 1024 * 1024 }, wordmarkOptions), null);
  assert.match(policy.getImageUploadMetadataError({ type, size: 2 * 1024 * 1024 + 1 }, wordmarkOptions), /2 МБ/);
}
console.log("PASS: shared photo metadata accepts JPEG/PNG/WebP through exactly 10 MiB, rejects empty/invalid/oversized metadata, preserves separate 2 MiB static wordmark policy; no browser or network");
